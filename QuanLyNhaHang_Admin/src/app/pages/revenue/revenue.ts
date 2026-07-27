import { Component, OnInit, OnDestroy } from '@angular/core';
import { Chart, registerables, type ChartConfiguration } from 'chart.js';
import { MyData } from '../../my-data';
import { CommonModule } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { BusinessChatResponse } from '../../../model/business-chat.model';
import { GrossProfitMarginReport, NetProfitReport, GrossProfitMarginReportItem, NetProfitReportItem } from '../../../model/revenue.model';
import { Expense, ExpenseCategory, ExpenseRequest } from '../../../model/expense.model';

Chart.register(...registerables);

const DOW_VI: Record<string, string> = {
  Sunday: 'Chủ nhật', Monday: 'Thứ hai', Tuesday: 'Thứ ba',
  Wednesday: 'Thứ tư', Thursday: 'Thứ năm', Friday: 'Thứ sáu', Saturday: 'Thứ bảy'
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

  activeTab: 'gross' | 'net' | 'forecast' = 'gross';
  reportPeriod: 'daily' | 'monthly' | 'yearly' = 'daily';
  isDaily = true;

  currentDate = '';
  currentYear = new Date().getFullYear();
  currentMonth = new Date().getMonth() + 1;
  currentDay = new Date().getDate();

  // API Data
  grossReport: GrossProfitMarginReport | null = null;
  netReport: NetProfitReport | null = null;
  dailyData: any[] = [];
  monthlyData: any[] = [];
  
  // Expenses
  expenseMonth = '';
  expenses: Expense[] = [];
  expenseCategories: ExpenseCategory[] = [];
  totalExpense = 0;
  expenseBreakdown: any[] = [];
  
  showExpenseDialog = false;
  editingExpense: Partial<ExpenseRequest> = { amount: 0, title: '', expenseCategoryId: 0, expenseDate: '' };
  expenseSaving = false;

  // KPIs
  kpiRevenue = 0;
  kpiCost = 0;
  kpiProfit = 0;
  kpiMargin = 0;

  // Existing Data
  byHourData: any[] = [];
  byDayOfWeekData: any[] = [];
  bestSellersData: any[] = [];
  categoryData: any[] = [];
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
    result?: BusinessChatResponse;
    isError?: boolean;
    isLoading?: boolean;
  }> = [];
  chatMessageId = 0;
  chatOpen = false;
  chatMinimized = true;

  constructor(private myData: MyData) {}

  ngOnInit() {
    this.setCurrentDate();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.aiInputDate = this.toIsoDateLocal(tomorrow);
    
    // Set default expense month to current month
    this.expenseMonth = `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}`;

    this.loadDashboard();
    this.loadAiPrediction(this.aiInputDate);
    this.loadExpenseCategories();
    this.loadExpenses();

    this.chatMessages.push({
      id: ++this.chatMessageId,
      role: 'agent',
      content: 'Chào bạn! Tôi là AI trợ lý kinh doanh. Bạn có muốn đánh giá tình hình doanh thu hiện tại, hay phân tích một khía cạnh cụ thể nào không?'
    });
  }

  ngOnDestroy() {
    this.destroyAllCharts();
  }

  setCurrentDate() {
    const now = new Date();
    this.currentDate = now.toLocaleDateString('vi-VN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
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

  setTab(tab: 'gross' | 'net' | 'forecast') {
    this.activeTab = tab;
    this.applyKpis();
    setTimeout(() => this.renderAllCharts(), 0);
  }

  setPeriod(period: 'daily' | 'monthly' | 'yearly') {
    this.reportPeriod = period;
    this.applyKpis();
    setTimeout(() => this.renderMainCharts(), 0);
  }

  onExpenseMonthChange() {
    this.loadExpenses();
  }

  openExpenseDialog() {
    this.editingExpense = {
      title: '',
      amount: 0,
      expenseCategoryId: this.expenseCategories.length > 0 ? this.expenseCategories[0].id : 0,
      expenseDate: this.toIsoDateLocal(new Date()),
      note: ''
    };
    this.showExpenseDialog = true;
  }

  closeExpenseDialog() {
    this.showExpenseDialog = false;
  }

  saveExpense() {
    if (!this.editingExpense.title || !this.editingExpense.amount || !this.editingExpense.expenseDate || !this.editingExpense.expenseCategoryId) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }
    this.expenseSaving = true;
    this.myData.createExpense(this.editingExpense as ExpenseRequest).subscribe({
      next: (res) => {
        this.expenseSaving = false;
        this.showExpenseDialog = false;
        this.loadExpenses(); // Reload
      },
      error: (err) => {
        this.expenseSaving = false;
        alert('Lỗi: ' + (err.error?.error || err.message));
      }
    });
  }

  loadExpenseCategories() {
    this.myData.getExpenseCategories().subscribe({
      next: (res) => this.expenseCategories = res,
      error: (err) => console.error('Error loading expense categories', err)
    });
  }

  loadExpenses() {
    if (!this.expenseMonth) return;
    const [year, month] = this.expenseMonth.split('-');
    const fromDate = `${year}-${month}-01`;
    // Last day of month
    const toDate = new Date(Number(year), Number(month), 0).toISOString().split('T')[0];
    
    this.myData.getExpenses(fromDate, toDate).subscribe({
      next: (res) => {
        this.expenses = res;
        this.totalExpense = res.reduce((sum, item) => sum + item.amount, 0);
        this.calculateExpenseBreakdown();
        setTimeout(() => this.renderExpenseChart(), 0);
      },
      error: (err) => console.error('Error loading expenses', err)
    });
  }

  calculateExpenseBreakdown() {
    const map = new Map<string, number>();
    this.expenses.forEach(e => {
      const catName = e.expenseCategory?.name || 'Khác';
      map.set(catName, (map.get(catName) || 0) + e.amount);
    });
    this.expenseBreakdown = Array.from(map.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
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
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
        this.loadAiForecastSeries(targetDate);
      },
      error: (err) => {
        this.aiLoading = false;
        this.predictedRevenue = null;
        this.predictedDateLabel = '';
        this.aiError = err?.error?.error ?? err?.message ?? 'Không lấy được dự đoán AI';
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
        .map((r) => ({ date: r?.date ?? '', predictedRevenue: Number(r?.predictedRevenue ?? 0) }))
        .filter((r) => !!r.date);
      if (this.activeTab === 'forecast') {
        setTimeout(() => this.renderForecastChart(), 0);
      }
    });
  }

  refreshDashboard() {
    this.loadDashboard();
    this.loadAiPrediction(this.aiInputDate);
    this.loadExpenses();
  }

  loadDashboard() {
    this.loading = true;
    this.loadError = null;

    forkJoin({
      gross: this.myData.getGrossProfitMarginReport().pipe(catchError(() => of(null))),
      net: this.myData.getNetProfitReport().pipe(catchError(() => of(null))),
      daily: this.myData.getRevenueDaily().pipe(catchError(() => of([]))),
      monthly: this.myData.getRevenueMonthly().pipe(catchError(() => of([]))),
      byHour: this.myData.getRevenueByHour(this.queryDays.hour).pipe(catchError(() => of([]))),
      byDow: this.myData.getRevenueByDayOfWeek(this.queryDays.dow).pipe(catchError(() => of([]))),
      best: this.myData.getRevenueBestSellers(this.queryDays.best, 10).pipe(catchError(() => of([]))),
      category: this.myData.getRevenueByCategory(this.queryDays.best).pipe(catchError(() => of([]))),
      turnover: this.myData.getRevenueTableTurnover(this.queryDays.turnover).pipe(catchError(() => of(null))),
      party: this.myData.getRevenueByPartySize(this.queryDays.party).pipe(catchError(() => of([]))),
      forecast: this.myData.getRevenueForecast(this.queryDays.forecast).pipe(catchError(() => of(null)))
    }).subscribe({
      next: (res) => {
        this.grossReport = res.gross;
        this.netReport = res.net;
        this.dailyData = Array.isArray(res.daily) ? res.daily : [];
        this.monthlyData = Array.isArray(res.monthly) ? res.monthly : [];
        this.byHourData = Array.isArray(res.byHour) ? res.byHour : [];
        this.byDayOfWeekData = Array.isArray(res.byDow) ? res.byDow : [];
        this.bestSellersData = Array.isArray(res.best) ? res.best : [];
        this.categoryData = Array.isArray(res.category) ? res.category : [];
        this.tableTurnover = res.turnover;
        this.byPartySizeData = Array.isArray(res.party) ? res.party : [];
        this.forecastData = res.forecast;
        
        this.loading = false;
        this.applyKpis();
        setTimeout(() => this.renderAllCharts(), 0);
      },
      error: (err) => {
        this.loading = false;
        this.loadError = err?.error?.error ?? err?.message ?? 'Không tải được dữ liệu';
      }
    });
  }

  private applyKpis() {
    if (this.activeTab === 'gross' && this.grossReport) {
      const data = this.grossReport[this.reportPeriod] || [];
      // Get the latest one depending on period
      let latest: GrossProfitMarginReportItem | undefined;
      if (this.reportPeriod === 'daily') {
        latest = data.find(i => i.year === this.currentYear && i.month === this.currentMonth && i.day === this.currentDay) || data[data.length - 1];
      } else if (this.reportPeriod === 'monthly') {
        latest = data.find(i => i.year === this.currentYear && i.month === this.currentMonth) || data[data.length - 1];
      } else {
        latest = data.find(i => i.year === this.currentYear) || data[data.length - 1];
      }

      this.kpiRevenue = latest?.totalRevenue ?? 0;
      this.kpiCost = latest?.totalCost ?? 0;
      this.kpiProfit = latest?.grossProfit ?? 0;
      this.kpiMargin = latest?.profitMargin ?? 0;
    } else if (this.activeTab === 'net' && this.netReport) {
      const data = this.netReport[this.reportPeriod] || [];
      let latest: NetProfitReportItem | undefined;
      if (this.reportPeriod === 'daily') {
        latest = data.find(i => i.year === this.currentYear && i.month === this.currentMonth && i.day === this.currentDay) || data[data.length - 1];
      } else if (this.reportPeriod === 'monthly') {
        latest = data.find(i => i.year === this.currentYear && i.month === this.currentMonth) || data[data.length - 1];
      } else {
        latest = data.find(i => i.year === this.currentYear) || data[data.length - 1];
      }

      this.kpiRevenue = latest?.totalRevenue ?? 0;
      this.kpiCost = (latest?.ingredientCost ?? 0) + (latest?.operatingExpense ?? 0);
      this.kpiProfit = latest?.netProfit ?? 0;
      this.kpiMargin = latest?.netProfitMargin ?? 0;
    }
  }

  private destroyAllCharts() {
    Object.values(this.charts).forEach((c) => c.destroy());
    this.charts = {};
  }

  private renderAllCharts() {
    this.destroyAllCharts();
    if (this.activeTab === 'gross' || this.activeTab === 'net') {
      this.renderMainCharts();
      this.renderExpenseChart();
    } else if (this.activeTab === 'forecast') {
      this.renderForecastChart();
    }
    
    this.renderByHourChart();
    this.renderByDayOfWeekChart();
    this.renderPartySizeChart();
    this.renderBestSellersChart();
    this.renderRevenuePanelCharts();
  }

  private renderRevenuePanelCharts() {
    this.renderRevenuePanelMainChart();
    const byHour = [...this.byHourData].sort((a, b) => (a.hour ?? 0) - (b.hour ?? 0));
    this.buildBarChart('chartByHourDetailed', byHour.map(row => `${row.hour ?? 0}h`), byHour.map(row => row.totalRevenue ?? 0), 'Theo giờ', true, '#a371f7');
    const byDow = [...this.byDayOfWeekData].sort((a, b) => (a.dayOfWeekValue ?? 0) - (b.dayOfWeekValue ?? 0));
    this.buildBarChart('chartByDowDetailed', byDow.map(row => DOW_VI[row.dayOfWeek] ?? row.dayOfWeek ?? ''), byDow.map(row => row.totalRevenue ?? 0), 'Theo thứ', true, '#3fb950');
    const party = [...this.byPartySizeData].sort((a, b) => (a.partySize ?? 0) - (b.partySize ?? 0));
    this.buildBarChart('chartPartyDetailed', party.map(row => `${row.partySize ?? 0} khách`), party.map(row => row.totalRevenue ?? 0), 'Theo số khách', true, '#d29922');
    const best = this.bestSellersData.slice(0, 10);
    this.buildHorizontalBarChart('chartBestDetailed', best.map(row => (row.itemName ?? '—').slice(0, 28)), best.map(row => row.totalQuantity ?? 0), 'Số lượng bán');
    this.renderForecastChart('chartForecastDetailed');
  }

  private renderRevenuePanelMainChart() {
    const rows = this.isDaily ? this.dailyData : this.monthlyData;
    const limit = this.isDaily ? 30 : 12;
    const displayed = rows.length > limit ? rows.slice(-limit) : rows;
    const labels = displayed.map(row => this.isDaily ? `${row.day}/${row.month}` : `T${row.month}/${row.year}`);
    this.buildBarChart('chartMainDetailed', labels, displayed.map(row => row.totalRevenue ?? 0), this.isDaily ? 'Doanh thu theo ngày' : 'Doanh thu theo tháng', true, '#60a5fa');
  }

  private renderMainCharts() {
    this.renderMainLineChart();
    this.renderMarginDonutChart();
  }

  private renderMainLineChart() {
    const id = 'chartMain';
    const canvas = document.getElementById(id) as HTMLCanvasElement;
    if (!canvas) return;
    if (this.charts[id]) {
      this.charts[id].destroy();
    }

    let labels: string[] = [];
    let revenueData: number[] = [];
    let profitData: number[] = [];

    if (this.activeTab === 'gross' && this.grossReport) {
      const data = this.grossReport[this.reportPeriod] || [];
      const limit = this.reportPeriod === 'daily' ? 30 : (this.reportPeriod === 'monthly' ? 12 : 5);
      const displayed = data.length > limit ? data.slice(-limit) : data;
      
      labels = displayed.map(i => this.reportPeriod === 'daily' ? `${i.day}/${i.month}` : (this.reportPeriod === 'monthly' ? `T${i.month}/${i.year}` : `${i.year}`));
      revenueData = displayed.map(i => i.totalRevenue ?? 0);
      profitData = displayed.map(i => i.grossProfit ?? 0);
    } else if (this.activeTab === 'net' && this.netReport) {
      const data = this.netReport[this.reportPeriod] || [];
      const limit = this.reportPeriod === 'daily' ? 30 : (this.reportPeriod === 'monthly' ? 12 : 5);
      const displayed = data.length > limit ? data.slice(-limit) : data;
      
      labels = displayed.map(i => this.reportPeriod === 'daily' ? `${i.day}/${i.month}` : (this.reportPeriod === 'monthly' ? `T${i.month}/${i.year}` : `${i.year}`));
      revenueData = displayed.map(i => i.totalRevenue ?? 0);
      profitData = displayed.map(i => i.netProfit ?? 0);
    } else {
        return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cfg: ChartConfiguration = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            type: 'bar',
            label: 'Doanh thu',
            data: revenueData,
            backgroundColor: 'rgba(96, 165, 250, 0.8)',
            borderRadius: 4
          },
          {
            type: 'line',
            label: 'Lợi nhuận',
            data: profitData,
            borderColor: '#34d399',
            backgroundColor: '#34d399',
            borderWidth: 2,
            tension: 0.3
          }
        ]
      },
      options: this.baseChartOptions(true)
    };
    this.charts[id] = new Chart(ctx, cfg);
  }

  private renderMarginDonutChart() {
    const id = 'chartMargin';
    const canvas = document.getElementById(id) as HTMLCanvasElement;
    if (!canvas) return;
    if (this.charts[id]) {
      this.charts[id].destroy();
    }

    const margin = this.kpiMargin;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cfg: any = {
      type: 'doughnut',
      data: {
        labels: ['Biên lợi nhuận', 'Chi phí'],
        datasets: [{
          data: [margin, Math.max(0, 100 - margin)],
          backgroundColor: ['#60a5fa', '#334155'],
          borderWidth: 0
        } as any]
      },
      options: {
        cutout: '75%',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (c: any) => `${c.label}: ${c.parsed}%`
            }
          }
        }
      }
    };
    this.charts[id] = new Chart(ctx, cfg);
  }

  private renderExpenseChart() {
    const id = 'chartExpense';
    const canvas = document.getElementById(id) as HTMLCanvasElement;
    if (!canvas || !this.expenseBreakdown.length) return;
    if (this.charts[id]) {
      this.charts[id].destroy();
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const colors = ['#60a5fa', '#34d399', '#fb923c', '#a371f7', '#f472b6', '#38bdf8'];

    const cfg: any = {
      type: 'doughnut',
      data: {
        labels: this.expenseBreakdown.map(e => e.name),
        datasets: [{
          data: this.expenseBreakdown.map(e => e.amount),
          backgroundColor: colors.slice(0, this.expenseBreakdown.length),
          borderWidth: 0
        } as any]
      },
      options: {
        cutout: '70%',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (c: any) => `${c.label}: ${this.formatMoney(c.parsed)}`
            }
          }
        }
      }
    };
    this.charts[id] = new Chart(ctx, cfg);
  }

  private renderByHourChart() {
    const rows = [...this.byHourData].sort((a, b) => (a.hour ?? 0) - (b.hour ?? 0));
    const labels = rows.map((r) => `${r.hour ?? 0}h`);
    const data = rows.map((r) => r.totalRevenue ?? 0);
    this.buildBarChart('chartByHour', labels, data, 'Theo giờ', true, '#a371f7');
  }

  private renderByDayOfWeekChart() {
    const rows = [...this.byDayOfWeekData].sort((a, b) => (a.dayOfWeekValue ?? 0) - (b.dayOfWeekValue ?? 0));
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

  private renderForecastChart(canvasId = 'chartForecast') {
    const hist = this.forecastData?.historicalData ?? [];
    const fut = this.aiForecastData ?? [];
    const norm = (d: string) => (typeof d === 'string' ? d.split('T')[0] : '');
    const allKeys = [
      ...hist.map((h: any) => norm(h.date)),
      ...fut.map((f: any) => norm(f.date))
    ].filter(Boolean);
    const uniqueSorted = [...new Set(allKeys)].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    
    if (uniqueSorted.length === 0) {
      if (this.charts[canvasId]) this.charts[canvasId].destroy();
      return;
    }
    
    const histMap = new Map<string, number>(hist.map((h: any) => [norm(h.date), Number(h.revenue) || 0]));
    const futMap = new Map<string, number>(fut.map((f: any) => [norm(f.date), Number(f.predictedRevenue) || 0]));
    
    const labels = uniqueSorted.map((k) => {
      const parts = k.split('-');
      return `${parts[2] ?? ''}/${parts[1] ?? ''}`;
    });
    
    const histSeries: (number | null)[] = uniqueSorted.map((k) => histMap.has(k) ? histMap.get(k)! : null);
    const futSeries: (number | null)[] = uniqueSorted.map((k) => futMap.has(k) ? futMap.get(k)! : null);

    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (this.charts[canvasId]) this.charts[canvasId].destroy();
    
    const cfg: ChartConfiguration = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Thực tế',
            data: histSeries,
            borderColor: '#58a6ff',
            backgroundColor: 'rgba(88, 166, 255, 0.15)',
            tension: 0.25,
            fill: true
          },
          {
            label: 'Dự báo AI',
            data: futSeries,
            borderColor: '#f0883e',
            backgroundColor: 'rgba(240, 136, 62, 0.1)',
            borderDash: [6, 4],
            tension: 0.25,
            fill: false
          }
        ]
      },
      options: this.baseChartOptions(true)
    };
    this.charts[canvasId] = new Chart(ctx, cfg);
  }

  private buildBarChart(canvasId: string, labels: string[], data: number[], datasetLabel: string, yMoney: boolean, color = '#1f6feb') {
    if (!labels.length) return;
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (this.charts[canvasId]) this.charts[canvasId].destroy();

    const cfg: ChartConfiguration = {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: datasetLabel,
          data,
          backgroundColor: color + 'aa',
          borderColor: color,
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: this.baseChartOptions(yMoney)
    };
    this.charts[canvasId] = new Chart(ctx, cfg);
  }

  private buildHorizontalBarChart(canvasId: string, labels: string[], data: number[], datasetLabel: string) {
    if (!labels.length) return;
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (this.charts[canvasId]) this.charts[canvasId].destroy();

    const cfg: ChartConfiguration = {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: datasetLabel,
          data,
          backgroundColor: 'rgba(163, 113, 247, 0.65)',
          borderColor: '#a371f7',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y',
        ...this.baseChartOptions(false)
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
            callback: (value: string | number) => yMoney ? this.formatMoney(Number(value)) : this.formatNumber(Number(value))
          }
        },
        x: {
          grid: { color: 'rgba(48, 54, 61, 0.8)' },
          border: { display: false },
          ticks: { color: '#8b949e' }
        }
      },
      plugins: {
        legend: { labels: { color: '#f0f6fc' } }
      }
    };
  }
  
  turnoverDetails(): any[] {
    const d = this.tableTurnover?.details;
    return Array.isArray(d) ? d : [];
  }

  setMainView(isDaily: boolean) {
    this.isDaily = isDaily;
    setTimeout(() => this.renderRevenuePanelMainChart(), 0);
  }

  get selectedReportLabel(): string {
    return this.reportPeriod === 'daily' ? 'hôm nay' : this.reportPeriod === 'monthly' ? 'tháng này' : 'năm nay';
  }

  get financialCostRate(): number {
    return this.kpiRevenue > 0 ? Math.max(0, Math.min(100, (this.kpiCost / this.kpiRevenue) * 100)) : 0;
  }

  get topSeller(): any | null {
    return this.bestSellersData[0] ?? null;
  }

  get totalCategoryRevenue(): number {
    return this.categoryData.reduce((total, item) => total + Number(item?.totalRevenue ?? 0), 0);
  }

  categoryRevenueRate(value: number): number {
    return this.totalCategoryRevenue > 0 ? Math.max(0, Math.min(100, (value / this.totalCategoryRevenue) * 100)) : 0;
  }

  // ===== Chatbot methods =====
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

  fillChatSuggestion() {
    this.chatInput = 'Đánh giá tình hình 30 ngày gần đây, giờ nào cao điểm/thấp điểm, món nào cần đẩy, đề xuất 3 hành động cụ thể để tăng doanh thu và giảm rủi ro.';
  }

  submitBusinessChat() {
    const msg = (this.chatInput ?? '').trim();
    if (!msg) return;

    this.chatMessages.push({ id: ++this.chatMessageId, role: 'user', content: msg });
    this.chatInput = '';
    this.chatLoading = true;

    const agentMsgId = ++this.chatMessageId;
    this.chatMessages.push({ id: agentMsgId, role: 'agent', isLoading: true });
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
          this.chatMessages[msgIndex].result = this.normalizeBusinessChatResponse(res);
        }
        this.scrollToBottom();
      },
      error: (err) => {
        this.chatLoading = false;
        const errorMsg = err?.error?.error ?? err?.message ?? 'Không gọi được chatbot';
        const msgIndex = this.chatMessages.findIndex(m => m.id === agentMsgId);
        if (msgIndex !== -1) {
          this.chatMessages[msgIndex].isLoading = false;
          this.chatMessages[msgIndex].isError = true;
          this.chatMessages[msgIndex].content = errorMsg;
        }
        this.scrollToBottom();
      }
    });
  }

  private normalizeBusinessChatResponse(response: BusinessChatResponse): BusinessChatResponse {
    return {
      summary: response?.summary ?? '',
      answerText: response?.answerText ?? '',
      kpis: response?.kpis ?? {},
      insights: Array.isArray(response?.insights) ? response.insights : [],
      actions: Array.isArray(response?.actions) ? response.actions.map((action) => ({
        title: action?.title ?? '',
        why: action?.why ?? '',
        how: Array.isArray(action?.how) ? action.how : []
      })) : [],
      risks: Array.isArray(response?.risks) ? response.risks : [],
      followUpQuestions: Array.isArray(response?.followUpQuestions) ? response.followUpQuestions : []
    };
  }

  hasKpis(kpis: Record<string, unknown> | null | undefined): boolean {
    return !!kpis && Object.keys(kpis).length > 0;
  }

  scrollToBottom() {
    setTimeout(() => {
      const el = document.querySelector('.chat-message-list');
      if (el) el.scrollTop = el.scrollHeight;
    }, 100);
  }
}
