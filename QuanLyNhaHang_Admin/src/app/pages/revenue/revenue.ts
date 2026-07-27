import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MyData } from '../../my-data';
import { BusinessChatResponse } from '../../../model/business-chat.model';
import { GrossProfitMarginReport, NetProfitReport, GrossProfitMarginReportItem, NetProfitReportItem } from '../../../model/revenue.model';
import { Expense, ExpenseCategory, ExpenseRequest } from '../../../model/expense.model';

import { RevenueHeaderComponent } from './components/revenue-header/revenue-header.component';
import { RevenueKpiComponent } from './components/revenue-kpi/revenue-kpi.component';
import { RevenueProfitChartsComponent } from './components/revenue-profit-charts/revenue-profit-charts.component';
import { RevenueExpensePanelComponent } from './components/revenue-expense-panel/revenue-expense-panel.component';
import { ExpenseFormDialogComponent } from './components/expense-form-dialog/expense-form-dialog.component';
import { RevenueForecastComponent } from './components/revenue-forecast/revenue-forecast.component';
import { RevenueInsightChartsComponent } from './components/revenue-insight-charts/revenue-insight-charts.component';
import { RevenueDetailedPanelsComponent } from './components/revenue-detailed-panels/revenue-detailed-panels.component';
import { RevenueAnalysisComponent } from './components/revenue-analysis/revenue-analysis.component';
import { BusinessChatbotComponent } from './components/business-chatbot/business-chatbot.component';

@Component({
  selector: 'app-revenue',
  standalone: true,
  templateUrl: './revenue.html',
  styleUrls: ['./revenue.scss'],
  imports: [
    CommonModule, 
    FormsModule,
    RevenueHeaderComponent,
    RevenueKpiComponent,
    RevenueProfitChartsComponent,
    RevenueExpensePanelComponent,
    ExpenseFormDialogComponent,
    RevenueForecastComponent,
    RevenueInsightChartsComponent,
    RevenueDetailedPanelsComponent,
    RevenueAnalysisComponent,
    BusinessChatbotComponent
  ]
})
export class RevenueComponent implements OnInit {
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
  editingExpense: Partial<ExpenseRequest> = { amount: 0, title: '', expenseCategoryId: 0, expenseDate: '', note: '' };
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

  setCurrentDate() {
    const now = new Date();
    this.currentDate = now.toLocaleDateString('vi-VN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    this.currentYear = now.getFullYear();
    this.currentMonth = now.getMonth() + 1;
    this.currentDay = now.getDate();
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
  }

  setPeriod(period: 'daily' | 'monthly' | 'yearly') {
    this.reportPeriod = period;
    this.applyKpis();
  }

  onExpenseMonthChange(month: string) {
    this.expenseMonth = month;
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

  onExpenseDialogChange(visible: boolean) {
    this.showExpenseDialog = visible;
  }

  saveExpense(expenseRequest: Partial<ExpenseRequest>) {
    if (!expenseRequest.title || !expenseRequest.amount || !expenseRequest.expenseDate || !expenseRequest.expenseCategoryId) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }
    this.expenseSaving = true;
    this.myData.createExpense(expenseRequest as ExpenseRequest).subscribe({
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

  submitAiPrediction(date: string) {
    this.loadAiPrediction(date);
  }

  onInputDateChange(date: string) {
    this.aiInputDate = date;
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

  setMainView(isDaily: boolean) {
    this.isDaily = isDaily;
  }

  get topSeller(): any | null {
    return this.bestSellersData[0] ?? null;
  }

  get totalCategoryRevenue(): number {
    return this.categoryData.reduce((total, item) => total + Number(item?.totalRevenue ?? 0), 0);
  }

  get chartLabels(): string[] {
    if (this.activeTab === 'gross' && this.grossReport) {
      const data = this.grossReport[this.reportPeriod] || [];
      const limit = this.reportPeriod === 'daily' ? 30 : (this.reportPeriod === 'monthly' ? 12 : 5);
      const displayed = data.length > limit ? data.slice(-limit) : data;
      return displayed.map(i => this.reportPeriod === 'daily' ? `${i.day}/${i.month}` : (this.reportPeriod === 'monthly' ? `T${i.month}/${i.year}` : `${i.year}`));
    } else if (this.activeTab === 'net' && this.netReport) {
      const data = this.netReport[this.reportPeriod] || [];
      const limit = this.reportPeriod === 'daily' ? 30 : (this.reportPeriod === 'monthly' ? 12 : 5);
      const displayed = data.length > limit ? data.slice(-limit) : data;
      return displayed.map(i => this.reportPeriod === 'daily' ? `${i.day}/${i.month}` : (this.reportPeriod === 'monthly' ? `T${i.month}/${i.year}` : `${i.year}`));
    }
    return [];
  }

  get chartRevenueData(): number[] {
    if (this.activeTab === 'gross' && this.grossReport) {
      const data = this.grossReport[this.reportPeriod] || [];
      const limit = this.reportPeriod === 'daily' ? 30 : (this.reportPeriod === 'monthly' ? 12 : 5);
      const displayed = data.length > limit ? data.slice(-limit) : data;
      return displayed.map(i => i.totalRevenue ?? 0);
    } else if (this.activeTab === 'net' && this.netReport) {
      const data = this.netReport[this.reportPeriod] || [];
      const limit = this.reportPeriod === 'daily' ? 30 : (this.reportPeriod === 'monthly' ? 12 : 5);
      const displayed = data.length > limit ? data.slice(-limit) : data;
      return displayed.map(i => i.totalRevenue ?? 0);
    }
    return [];
  }

  get chartProfitData(): number[] {
    if (this.activeTab === 'gross' && this.grossReport) {
      const data = this.grossReport[this.reportPeriod] || [];
      const limit = this.reportPeriod === 'daily' ? 30 : (this.reportPeriod === 'monthly' ? 12 : 5);
      const displayed = data.length > limit ? data.slice(-limit) : data;
      return displayed.map(i => i.grossProfit ?? 0);
    } else if (this.activeTab === 'net' && this.netReport) {
      const data = this.netReport[this.reportPeriod] || [];
      const limit = this.reportPeriod === 'daily' ? 30 : (this.reportPeriod === 'monthly' ? 12 : 5);
      const displayed = data.length > limit ? data.slice(-limit) : data;
      return displayed.map(i => i.netProfit ?? 0);
    }
    return [];
  }

  // ===== Chatbot methods =====
  onToggleChat() {
    this.chatMinimized = !this.chatMinimized;
    if (!this.chatMinimized) {
      this.chatOpen = true;
    }
  }

  onCloseChat() {
    this.chatOpen = false;
    this.chatMinimized = true;
  }

  onOpenChat() {
    this.chatOpen = true;
    this.chatMinimized = false;
  }

  onChatInputChange(input: string) {
    this.chatInput = input;
  }

  submitBusinessChat(msg: string) {
    if (!msg) return;

    this.chatMessages.push({ id: ++this.chatMessageId, role: 'user', content: msg });
    this.chatInput = '';
    this.chatLoading = true;

    const agentMsgId = ++this.chatMessageId;
    this.chatMessages.push({ id: agentMsgId, role: 'agent', isLoading: true });

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
        // force trigger angular change detection copy
        this.chatMessages = [...this.chatMessages];
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
        this.chatMessages = [...this.chatMessages];
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
}
