import { Component, OnInit, OnDestroy } from '@angular/core';
import { Chart, registerables, type ChartConfiguration } from 'chart.js';
import { MyData } from '../../my-data';
import { CommonModule } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';

Chart.register(...registerables);

const DOW_VI: Record<string, string> = {
  Sunday: 'Chủ nhật',
  Monday: 'Thứ hai',
  Tuesday: 'Thứ ba',
  Wednesday: 'Thứ tư',
  Thursday: 'Thứ năm',
  Friday: 'Thứ sáu',
  Saturday: 'Thứ bảy'
};

@Component({
  selector: 'app-revenue',
  templateUrl: './revenue.html',
  imports: [CommonModule, FormsModule],
  styleUrls: ['./revenue.scss']
})
export class RevenueComponent implements OnInit, OnDestroy {
  private charts: Record<string, Chart> = {};

  loading = true;
  loadError: string | null = null;

  isDaily = false;
  totalRevenue = 0;
  thisdayRevenue = 0;
  thismonthRevenue = 0;
  totalOrders = 0;
  totalOrdersToday = 0;
  averageOrder = 0;
  currentDate = '';
  currentYear = new Date().getFullYear();
  currentMonth = new Date().getMonth() + 1;
  currentDay = new Date().getDate();

  monthlyData: any[] = [];
  dailyData: any[] = [];
  byHourData: any[] = [];
  byDayOfWeekData: any[] = [];
  bestSellersData: any[] = [];
  tableTurnover: any = null;
  byPartySizeData: any[] = [];
  forecastData: any = null;

  aiLoading = false;
  aiError: string | null = null;
  predictedRevenue: number | null = null;
  predictedDateLabel = '';
  aiInputDate = '';
  aiForecastData: Array<{ date: string; predictedRevenue: number }> = [];

  readonly queryDays = { hour: 30, dow: 90, best: 30, turnover: 30, party: 90, forecast: 7 };

  // ===== Chatbot business state =====
  chatInput = '';
  chatLoading = false;
  chatMessages: Array<{
    id: number;
    role: 'user' | 'agent';
    content?: string;
    result?: any;
    isError?: boolean;
    isLoading?: boolean;
  }> = [];
  chatMessageId = 0;
  // ===== Floating Chat UI state =====
  chatOpen = false;      // mở/đóng panel
  chatMinimized = true;  // thu gọn icon

  toggleChat() {
    this.chatMinimized = !this.chatMinimized;
    if (!this.chatMinimized) {
      this.chatOpen = true;
      this.scrollToBottom();
    }
  }

  closeChat() {
    this.chatOpen = false;
    this.chatMinimized = true;
  }

  openChat() {
    this.chatOpen = true;
    this.chatMinimized = false;
    this.scrollToBottom();
  }

  constructor(private myData: MyData) {}

  ngOnInit() {
    this.setCurrentDate();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.aiInputDate = this.toIsoDateLocal(tomorrow);
    this.loadDashboard();
    this.loadAiPrediction(this.aiInputDate);

    // Initial agent message
    this.chatMessages.push({
      id: ++this.chatMessageId,
      role: 'agent',
      content: 'Chào bạn! Tôi là AI trợ lý kinh doanh. Bạn có muốn đánh giá tình hình doanh thu hiện tại, hay phân tích một khía cạnh cụ thể nào không?'
    });
  }

  ngOnDestroy() {
    this.destroyAllCharts();
  }

  // ===== Chatbot methods =====
  fillChatSuggestion() {
    this.chatInput =
      'Đánh giá tình hình 30 ngày gần đây, giờ nào cao điểm/thấp điểm, món nào cần đẩy, đề xuất 3 hành động cụ thể để tăng doanh thu và giảm rủi ro.';
  }

  submitBusinessChat() {
    const msg = (this.chatInput ?? '').trim();
    if (!msg) return;

    // Add user message
    this.chatMessages.push({
      id: ++this.chatMessageId,
      role: 'user',
      content: msg
    });

    this.chatInput = '';
    this.chatLoading = true;

    // Add agent loading message
    const agentMsgId = ++this.chatMessageId;
    this.chatMessages.push({
      id: agentMsgId,
      role: 'agent',
      isLoading: true
    });
    this.scrollToBottom();

    const payload = {
      message: msg,
      daysHour: this.queryDays.hour,
      daysDow: this.queryDays.dow,
      daysBest: this.queryDays.best,
      daysTurnover: this.queryDays.turnover,
      daysParty: this.queryDays.party,
      daysForecast: this.queryDays.forecast,
      topBest: 10
    };

    this.myData.chatbotBusiness(payload).subscribe({
      next: (res) => {
        this.chatLoading = false;
        const msgIndex = this.chatMessages.findIndex(m => m.id === agentMsgId);
        if (msgIndex !== -1) {
          this.chatMessages[msgIndex].isLoading = false;
          this.chatMessages[msgIndex].result = res;
        }
        this.scrollToBottom();
      },
      error: (err) => {
        this.chatLoading = false;
        const msg2 =
          err?.error?.error ??
          err?.error?.detail ??
          err?.message ??
          'Không gọi được chatbot';
        const msgIndex = this.chatMessages.findIndex(m => m.id === agentMsgId);
        if (msgIndex !== -1) {
          this.chatMessages[msgIndex].isLoading = false;
          this.chatMessages[msgIndex].isError = true;
          this.chatMessages[msgIndex].content = typeof msg2 === 'string' ? msg2 : 'Không gọi được chatbot';
        }
        console.error('chatbot business error:', err);
        this.scrollToBottom();
      }
    });
  }

  scrollToBottom() {
    setTimeout(() => {
      const el = document.querySelector('.chat-message-list');
      if (el) el.scrollTop = el.scrollHeight;
    }, 100);
  }

  // ===== existing code =====
  setCurrentDate() {
    const now = new Date();
    this.currentDate = now.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    this.currentYear = now.getFullYear();
    this.currentMonth = now.getMonth() + 1;
    this.currentDay = now.getDate();
  }

  formatMoney(value: number): string {
    if (value == null || value === 0) return '0 ₫';
    if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + ' tỷ ₫';
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + ' triệu ₫';
    if (value >= 1_000) return (value / 1_000).toFixed(1) + ' nghìn ₫';
    return value.toLocaleString('vi-VN') + ' ₫';
  }

  formatNumber(value: number): string {
    return (value ?? 0).toLocaleString('vi-VN');
  }

  formatMinutes(m: number): string {
    if (m == null || !Number.isFinite(m)) return '—';
    const h = Math.floor(m / 60);
    const min = Math.round(m % 60);
    if (h <= 0) return `${min} phút`;
    return `${h} giờ ${min} phút`;
  }

  private toIsoDateLocal(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private isValidIsoDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const d = new Date(value + 'T00:00:00');
    return !Number.isNaN(d.getTime());
  }

  loadAiPrediction(dateIso?: string) {
    const targetDate = (dateIso ?? this.aiInputDate ?? '').trim();
    if (!this.isValidIsoDate(targetDate)) {
      this.aiError = 'Ngày không hợp lệ. Vui lòng nhập theo yyyy-MM-dd';
      this.predictedRevenue = null;
      this.predictedDateLabel = '';
      return;
    }

    this.aiInputDate = targetDate;
    this.aiLoading = true;
    this.aiError = null;

    this.myData.predictRevenueByAi(targetDate).subscribe({
      next: (res) => {
        this.aiLoading = false;
        this.predictedRevenue = res?.predictedRevenue ?? null;
        const sourceDate = res?.date ?? targetDate;
        const labelSrc = new Date(sourceDate + 'T12:00:00');
        this.predictedDateLabel = labelSrc.toLocaleDateString('vi-VN', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        this.loadAiForecastSeries(targetDate);
      },
      error: (err) => {
        this.aiLoading = false;
        this.predictedRevenue = null;
        this.predictedDateLabel = '';
        const msg = err?.error?.error ?? err?.message ?? 'Không lấy được dự đoán AI';
        this.aiError = typeof msg === 'string' ? msg : 'Không lấy được dự đoán AI';
        console.error('AI revenue predict:', err);
      }
    });
  }

  submitAiPrediction() {
    this.loadAiPrediction(this.aiInputDate);
  }

  private loadAiForecastSeries(startDateIso: string) {
    const baseDate = new Date(startDateIso + 'T00:00:00');
    const requests = Array.from({ length: this.queryDays.forecast }, (_, i) => {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      const iso = this.toIsoDateLocal(d);
      return this.myData.predictRevenueByAi(iso).pipe(
        catchError(() => of({ date: iso, predictedRevenue: 0 }))
      );
    });

    forkJoin(requests).subscribe((rows) => {
      this.aiForecastData = rows
        .map((r) => ({
          date: r?.date ?? '',
          predictedRevenue: Number(r?.predictedRevenue ?? 0)
        }))
        .filter((r) => !!r.date);
      this.renderForecastChart();
    });
  }

  refreshDashboard() {
    this.loadDashboard();
    this.loadAiPrediction(this.aiInputDate);
  }

  loadDashboard() {
    this.loading = true;
    this.loadError = null;

    forkJoin({
      monthly: this.myData.getRevenueMonthly().pipe(catchError(() => of([]))),
      daily: this.myData.getRevenueDaily().pipe(catchError(() => of([]))),
      byHour: this.myData.getRevenueByHour(this.queryDays.hour).pipe(catchError(() => of([]))),
      byDow: this.myData.getRevenueByDayOfWeek(this.queryDays.dow).pipe(catchError(() => of([]))),
      best: this.myData.getRevenueBestSellers(this.queryDays.best, 10).pipe(catchError(() => of([]))),
      turnover: this.myData.getRevenueTableTurnover(this.queryDays.turnover).pipe(catchError(() => of(null))),
      party: this.myData.getRevenueByPartySize(this.queryDays.party).pipe(catchError(() => of([]))),
      forecast: this.myData.getRevenueForecast(this.queryDays.forecast).pipe(catchError(() => of(null)))
    }).subscribe({
      next: (res) => {
        this.monthlyData = Array.isArray(res.monthly) ? res.monthly : [];
        this.dailyData = Array.isArray(res.daily) ? res.daily : [];
        this.byHourData = Array.isArray(res.byHour) ? res.byHour : [];
        this.byDayOfWeekData = Array.isArray(res.byDow) ? res.byDow : [];
        this.bestSellersData = Array.isArray(res.best) ? res.best : [];
        this.tableTurnover = res.turnover;
        this.byPartySizeData = Array.isArray(res.party) ? res.party : [];
        this.forecastData = res.forecast;
        this.loading = false;
        this.applyMainSummary();
        setTimeout(() => this.renderAllCharts(), 0);
      },
      error: (err) => {
        this.loading = false;
        this.loadError = err?.error?.error ?? err?.message ?? 'Không tải được dữ liệu';
        console.error('Revenue dashboard:', err);
      }
    });
  }

  setMainView(daily: boolean) {
    this.isDaily = daily;
    this.applyMainSummary();
    setTimeout(() => this.renderMainChart(), 0);
  }

  private applyMainSummary() {
    if (this.isDaily) {
      const limit = 30;
      const full = this.dailyData;
      const displayed = full.length > limit ? full.slice(-limit) : full;
      this.totalRevenue = displayed.reduce((s, item) => s + (item.totalRevenue ?? 0), 0);
      this.totalOrders = displayed.reduce((s, item) => s + (item.totalOrders ?? 0), 0);
      this.averageOrder = this.totalOrders > 0 ? this.totalRevenue / this.totalOrders : 0;
      const todayEntry = full.find(
        (item) =>
          item.year === this.currentYear &&
          item.month === this.currentMonth &&
          item.day === this.currentDay
      );
      this.totalOrdersToday = todayEntry ? todayEntry.totalOrders ?? 0 : 0;
      this.thisdayRevenue = todayEntry ? todayEntry.totalRevenue ?? 0 : 0;
      this.thismonthRevenue = 0;
    } else {
      const data = this.monthlyData;
      const revenues = data.map((item) => item.totalRevenue ?? 0);
      this.totalRevenue = revenues.reduce((sum, r) => sum + r, 0);
      this.totalOrders = data.reduce((sum, item) => sum + (item.totalOrders ?? 0), 0);
      const currentMonthData = data.find(
        (item) => item.year === this.currentYear && item.month === this.currentMonth
      );
      this.totalOrdersToday = currentMonthData ? currentMonthData.totalOrders ?? 0 : 0;
      this.thismonthRevenue = currentMonthData ? currentMonthData.totalRevenue ?? 0 : 0;
      this.thisdayRevenue = 0;
      this.averageOrder = this.totalOrders > 0 ? this.totalRevenue / this.totalOrders : 0;
    }
  }

  getOrdersDisplayText(): string {
    if (this.isDaily) {
      return `Hôm nay: ${this.formatNumber(this.totalOrdersToday)} đơn`;
    }
    return `Tháng này: ${this.formatNumber(this.totalOrdersToday)} đơn`;
  }

  private destroyAllCharts() {
    Object.values(this.charts).forEach((c) => c.destroy());
    this.charts = {};
  }

  private renderAllCharts() {
    this.destroyAllCharts();
    this.renderMainChart();
    this.renderByHourChart();
    this.renderByDayOfWeekChart();
    this.renderPartySizeChart();
    this.renderBestSellersChart();
    this.renderForecastChart();
  }

  private renderMainChart() {
    const id = 'chartMain';
    if (this.isDaily) {
      const limit = 30;
      const full = this.dailyData;
      const displayed = full.length > limit ? full.slice(-limit) : full;
      const labels = displayed.map((item) =>
        item.year === this.currentYear && item.month === this.currentMonth
          ? `Ngày ${item.day}`
          : `Ngày ${item.day}/${item.month}`
      );
      const data = displayed.map((item) => item.totalRevenue ?? 0);
      this.buildBarChart(id, labels, data, 'Doanh thu (theo ngày)', true);
    } else {
      const data = this.monthlyData;
      const labels = data.map((item) =>
        item.year === this.currentYear ? `Tháng ${item.month}` : `T${item.month}/${item.year}`
      );
      const values = data.map((item) => item.totalRevenue ?? 0);
      this.buildBarChart(id, labels, values, 'Doanh thu (theo tháng)', true);
    }
  }

  private renderByHourChart() {
    const rows = [...this.byHourData].sort((a, b) => (a.hour ?? 0) - (b.hour ?? 0));
    const labels = rows.map((r) => `${r.hour ?? 0}h`);
    const data = rows.map((r) => r.totalRevenue ?? 0);
    this.buildBarChart('chartByHour', labels, data, 'Theo giờ', true, '#a371f7');
  }

  private renderByDayOfWeekChart() {
    const rows = [...this.byDayOfWeekData].sort(
      (a, b) => (a.dayOfWeekValue ?? 0) - (b.dayOfWeekValue ?? 0)
    );
    const labels = rows.map((r) => DOW_VI[r.dayOfWeek] ?? r.dayOfWeek ?? '');
    const data = rows.map((r) => r.totalRevenue ?? 0);
    this.buildBarChart('chartByDow', labels, data, 'Theo thứ trong tuần', true, '#3fb950');
  }

  private renderPartySizeChart() {
    const rows = [...this.byPartySizeData].sort((a, b) => (a.partySize ?? 0) - (b.partySize ?? 0));
    const labels = rows.map((r) => `${r.partySize ?? 0} khách`);
    const data = rows.map((r) => r.totalRevenue ?? 0);
    this.buildBarChart('chartParty', labels, data, 'Theo số khách/bàn', true, '#d29922');
  }

  private renderBestSellersChart() {
    const rows = this.bestSellersData.slice(0, 10);
    const labels = rows.map((r) => (r.itemName ?? '—').slice(0, 28));
    const data = rows.map((r) => r.totalQuantity ?? 0);
    this.buildHorizontalBarChart('chartBest', labels, data, 'Số lượng bán');
  }

  private renderForecastChart() {
    const hist = this.forecastData?.historicalData ?? [];
    const fut = this.aiForecastData ?? [];
    const norm = (d: string) => (typeof d === 'string' ? d.split('T')[0] : '');
    const allKeys = [
      ...hist.map((h: any) => norm(h.date)),
      ...fut.map((f: any) => norm(f.date))
    ].filter(Boolean);
    const uniqueSorted = [...new Set(allKeys)].sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );
    if (uniqueSorted.length === 0) {
      if (this.charts['chartForecast']) {
        this.charts['chartForecast'].destroy();
        delete this.charts['chartForecast'];
      }
      return;
    }
    const histMap = new Map<string, number>(
      hist.map((h: any) => [norm(h.date), Number(h.revenue) || 0])
    );
    const futMap = new Map<string, number>(
      fut.map((f: any) => [norm(f.date), Number(f.predictedRevenue) || 0])
    );
    const labels = uniqueSorted.map((k) => {
      const parts = k.split('-');
      const day = parts[2] ?? '';
      const m = parts[1] ?? '';
      return `${day}/${m}`;
    });
    const histSeries: (number | null)[] = uniqueSorted.map((k) =>
      histMap.has(k) ? histMap.get(k)! : null
    );
    const futSeries: (number | null)[] = uniqueSorted.map((k) =>
      futMap.has(k) ? futMap.get(k)! : null
    );

    const canvas = document.getElementById('chartForecast') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (this.charts['chartForecast']) {
      this.charts['chartForecast'].destroy();
    }
    const cfg: ChartConfiguration = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Thực tế (30 ngày)',
            data: histSeries,
            borderColor: '#58a6ff',
            backgroundColor: 'rgba(88, 166, 255, 0.15)',
            tension: 0.25,
            spanGaps: false,
            fill: true
          },
          {
            label: 'Dự báo AI (POST)',
            data: futSeries,
            borderColor: '#f0883e',
            backgroundColor: 'rgba(240, 136, 62, 0.1)',
            borderDash: [6, 4],
            tension: 0.25,
            spanGaps: false,
            fill: false
          }
        ]
      },
      options: {
        ...this.baseChartOptions(true),
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { color: '#f0f6fc', font: { size: 12, weight: 600 } }
          },
          tooltip: {
            backgroundColor: 'rgba(22, 27, 34, 0.95)',
            titleColor: '#f0f6fc',
            bodyColor: '#f0f6fc',
            callbacks: {
              label: (ctx) => {
                const v = ctx.parsed.y;
                if (v == null) return '';
                return `${ctx.dataset.label}: ${this.formatMoney(v)}`;
              }
            }
          }
        }
      }
    };
    this.charts['chartForecast'] = new Chart(ctx, cfg);
  }

  private buildBarChart(
    canvasId: string,
    labels: string[],
    data: number[],
    datasetLabel: string,
    yMoney: boolean,
    color = '#1f6feb'
  ) {
    if (!labels.length) {
      if (this.charts[canvasId]) {
        this.charts[canvasId].destroy();
        delete this.charts[canvasId];
      }
      return;
    }
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (this.charts[canvasId]) {
      this.charts[canvasId].destroy();
    }
    const gradient = ctx.createLinearGradient(0, 0, 0, 320);
    gradient.addColorStop(0, color + 'cc');
    gradient.addColorStop(1, color + '22');

    const cfg: ChartConfiguration = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: datasetLabel,
            data,
            backgroundColor: gradient,
            borderColor: color,
            borderWidth: 2,
            borderRadius: 6,
            borderSkipped: false
          }
        ]
      },
      options: {
        ...this.baseChartOptions(yMoney),
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { color: '#f0f6fc', font: { size: 12, weight: 600 } }
          },
          tooltip: {
            backgroundColor: 'rgba(22, 27, 34, 0.95)',
            titleColor: '#f0f6fc',
            bodyColor: '#f0f6fc',
            callbacks: {
              label: (c) => {
                const v = c.parsed.y;
                const val = yMoney ? this.formatMoney(v ?? 0) : this.formatNumber(v ?? 0);
                return `${c.dataset.label}: ${val}`;
              }
            }
          }
        }
      }
    };
    this.charts[canvasId] = new Chart(ctx, cfg);
  }

  private buildHorizontalBarChart(canvasId: string, labels: string[], data: number[], datasetLabel: string) {
    if (!labels.length) {
      if (this.charts[canvasId]) {
        this.charts[canvasId].destroy();
        delete this.charts[canvasId];
      }
      return;
    }
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (this.charts[canvasId]) {
      this.charts[canvasId].destroy();
    }
    const cfg: ChartConfiguration = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: datasetLabel,
            data,
            backgroundColor: 'rgba(163, 113, 247, 0.65)',
            borderColor: '#a371f7',
            borderWidth: 1,
            borderRadius: 4
          }
        ]
      },
      options: {
        indexAxis: 'y',
        ...this.baseChartOptions(false),
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { color: '#f0f6fc', font: { size: 12, weight: 600 } }
          },
          tooltip: {
            backgroundColor: 'rgba(22, 27, 34, 0.95)',
            titleColor: '#f0f6fc',
            bodyColor: '#f0f6fc'
          }
        }
      }
    };
    this.charts[canvasId] = new Chart(ctx, cfg);
  }

  private baseChartOptions(yMoney: boolean) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(48, 54, 61, 0.8)' },
          border: { display: false },
          ticks: {
            color: '#8b949e',
            callback: (value: string | number) => {
              const n = Number(value);
              return yMoney ? this.formatMoney(n) : this.formatNumber(n);
            }
          }
        },
        x: {
          grid: { color: 'rgba(48, 54, 61, 0.8)' },
          border: { display: false },
          ticks: { color: '#8b949e', maxRotation: 45 }
        }
      },
      interaction: { intersect: false, mode: 'index' as const },
      animation: { duration: 600, easing: 'easeOutQuart' as const }
    };
  }

  turnoverDetails(): any[] {
    const d = this.tableTurnover?.details;
    return Array.isArray(d) ? d : [];
  }
}