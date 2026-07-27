import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DialogModule } from 'primeng/dialog';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

import { MyData } from '../../../../my-data';
import { ExcelExportService } from '../../../../service/excel-export.service';

@Component({
  selector: 'app-revenue-export-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, ToggleSwitchModule],
  templateUrl: './revenue-export-dialog.component.html',
  styleUrls: ['./revenue-export-dialog.component.scss']
})
export class RevenueExportDialogComponent implements OnInit {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  fromDate = '';
  toDate = '';
  today = '';
  includePayroll = true;
  exporting = false;
  errorMsg = '';

  constructor(
    private myData: MyData,
    private excelService: ExcelExportService
  ) {}

  ngOnInit(): void {
    const now = new Date();
    this.today = this.toIso(now);

    // Mặc định: đầu tháng đến hôm nay
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    this.fromDate = this.toIso(startOfMonth);
    this.toDate   = this.today;
  }

  selectRange(range: 'this-month' | 'last-month' | 'this-quarter' | 'this-year'): void {
    const now = new Date();
    switch (range) {
      case 'this-month': {
        this.fromDate = this.toIso(new Date(now.getFullYear(), now.getMonth(), 1));
        this.toDate   = this.today;
        break;
      }
      case 'last-month': {
        const fm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lm = new Date(now.getFullYear(), now.getMonth(), 0);
        this.fromDate = this.toIso(fm);
        this.toDate   = this.toIso(lm);
        break;
      }
      case 'this-quarter': {
        const q = Math.floor(now.getMonth() / 3);
        this.fromDate = this.toIso(new Date(now.getFullYear(), q * 3, 1));
        this.toDate   = this.today;
        break;
      }
      case 'this-year': {
        this.fromDate = this.toIso(new Date(now.getFullYear(), 0, 1));
        this.toDate   = this.today;
        break;
      }
    }
  }

  async onExport(): Promise<void> {
    if (!this.fromDate || !this.toDate) return;
    this.exporting = true;
    this.errorMsg  = '';

    // Gọi song song tất cả các API cần thiết.
    // FE không tính toán gì — mọi số liệu đều từ BE.
    const grossProfit$ = this.myData.getGrossProfitMarginReport(this.fromDate, this.toDate)
      .pipe(catchError(() => of(null)));
    const netProfit$ = this.myData.getNetProfitReport(this.fromDate, this.toDate)
      .pipe(catchError(() => of(null)));
    const overview$ = this.myData.getBusinessOverview(this.fromDate, this.toDate)
      .pipe(catchError(() => of(null)));

    // API lương dùng tham số 'date' là ngày bất kỳ trong tháng; dùng fromDate
    const payroll$ = this.includePayroll
      ? this.myData.getPayrollReport('monthly', this.fromDate).pipe(catchError(() => of(null)))
      : of(null);

    forkJoin({ overview: overview$, grossProfit: grossProfit$, netProfit: netProfit$, payroll: payroll$ })
      .subscribe({
        next: async (results) => {
          try {
            if (!results.overview || !results.grossProfit || !results.netProfit) {
              this.errorMsg = 'Không thể tải dữ liệu từ server. Vui lòng thử lại.';
              this.exporting = false;
              return;
            }
            await this.excelService.exportRevenueReport({
              fromDate:    this.fromDate,
              toDate:      this.toDate,
              overview:    results.overview,
              grossProfit: results.grossProfit,
              netProfit:   results.netProfit,
              payroll:     results.payroll ?? undefined
            });
            this.visibleChange.emit(false);
          } catch (err) {
            this.errorMsg = 'Lỗi khi tạo file Excel. Vui lòng thử lại.';
          } finally {
            this.exporting = false;
          }
        },
        error: () => {
          this.errorMsg = 'Lỗi kết nối đến server.';
          this.exporting = false;
        }
      });
  }

  onClose(): void {
    if (!this.exporting) {
      this.errorMsg = '';
      this.visibleChange.emit(false);
    }
  }

  private toIso(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
