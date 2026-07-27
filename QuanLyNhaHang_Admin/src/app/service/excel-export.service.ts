import { Injectable } from '@angular/core';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { BusinessOverview, GrossProfitMarginReport, NetProfitReport, PayrollReport } from '../../model/revenue.model';

export interface RevenueExportOptions {
  fromDate: string;
  toDate: string;
  overview: BusinessOverview;
  grossProfit: GrossProfitMarginReport;
  netProfit: NetProfitReport;
  payroll?: PayrollReport;
}

// ===== Màu sắc theo chuẩn thiết kế =====
const COLOR_HEADER_BG   = '1E293B'; // Header bảng - nền xanh đêm
const COLOR_HEADER_FG   = 'FFFFFF'; // Header bảng - chữ trắng
const COLOR_COMPANY_FG  = '1E3A8A'; // Tên công ty - xanh navy
const COLOR_TITLE_FG    = '0F172A'; // Tiêu đề báo cáo - đen đậm
const COLOR_TOTAL_BG    = 'E2E8F0'; // Hàng tổng - nền xám nhạt
const COLOR_POSITIVE    = '15803D'; // Số dương (lợi nhuận) - xanh lá
const COLOR_NEGATIVE    = 'DC2626'; // Số âm (lỗ) - đỏ
const COLOR_ACCENT      = '0284C7'; // Điểm nhấn - xanh dương
const COLOR_BORDER      = 'CBD5E1'; // Viền - xám

@Injectable({ providedIn: 'root' })
export class ExcelExportService {

  async exportRevenueReport(options: RevenueExportOptions): Promise<void> {
    const { fromDate, toDate, overview, grossProfit, netProfit, payroll } = options;
    const wb = new ExcelJS.Workbook();
    wb.creator = 'QuanLyNhaHang';
    wb.created = new Date();

    this.buildOverviewSheet(wb, fromDate, toDate, overview);
    this.buildGrossSheet(wb, fromDate, toDate, grossProfit.daily, 'LNG - Theo Ngày');
    this.buildGrossSheet(wb, fromDate, toDate, grossProfit.monthly, 'LNG - Theo Tháng');
    this.buildNetSheet(wb, fromDate, toDate, netProfit.daily, 'LNT - Theo Ngày');
    this.buildNetSheet(wb, fromDate, toDate, netProfit.monthly, 'LNT - Theo Tháng');
    if (payroll) {
      this.buildPayrollSheet(wb, payroll);
    }

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    saveAs(blob, `BaoCaoTaiChinh_${fromDate}_${toDate}.xlsx`);
  }

  // ==================== SHEET 1: TỔNG QUAN ====================

  private buildOverviewSheet(
    wb: ExcelJS.Workbook,
    fromDate: string,
    toDate: string,
    ov: BusinessOverview
  ): void {
    const ws = wb.addWorksheet('Tổng quan');
    ws.views = [{ showGridLines: false }];

    this.addHeader(ws, 'BÁO CÁO TÀI CHÍNH TỔNG QUAN', fromDate, toDate, 3);

    ws.addRow([]);

    // Section title
    const secRow = ws.addRow(['CHỈ SỐ TÀI CHÍNH CHÍNH TRONG KỲ']);
    ws.mergeCells(`A${secRow.number}:C${secRow.number}`);
    secRow.getCell(1).font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: COLOR_TITLE_FG } };
    secRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DBEAFE' } };
    secRow.getCell(1).alignment = { horizontal: 'left', indent: 1 };
    secRow.height = 22;

    // Table header
    const th = ws.addRow(['Hạng mục', 'Giá trị (₫)', 'Ghi chú']);
    this.styleHeaderRow(th, 3);

    // Rows — ghi thẳng giá trị BE trả về, không tính toán
    const rows: [string, number, string][] = [
      ['Tổng doanh thu thực tế',   ov.totalRevenue,       'Tổng FinalPrice các đơn hoàn tất'],
      ['Chi phí nguyên liệu',      ov.ingredientCost,     'Tổng ActualCost từ các đơn hàng'],
      ['Lợi nhuận gộp',            ov.grossProfit,        'TotalRevenue - IngredientCost'],
      ['Chi phí vận hành (OpEx)',   ov.operatingExpense,   'Tổng chi phí phát sinh trong kỳ'],
      ['Tổng chi phí',             ov.totalCost,          'IngredientCost + OperatingExpense'],
      ['Lợi nhuận thực (Net)',      ov.netProfit,          'GrossProfit - OperatingExpense'],
    ];

    rows.forEach(([label, value, note]) => {
      const r = ws.addRow([label, value, note]);
      r.getCell(1).font = { name: 'Segoe UI', size: 10 };
      const vc = r.getCell(2);
      vc.numFmt = '#,##0" ₫"';
      vc.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: value < 0 ? COLOR_NEGATIVE : COLOR_TITLE_FG } };
      vc.alignment = { horizontal: 'right' };
      r.getCell(3).font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: '64748B' } };
      this.applyRowBorder(r, 3);
    });

    // Tỉ suất lợi nhuận — BE đã tính sẵn netProfitMargin
    const marginRow = ws.addRow(['Tỉ suất lợi nhuận ròng', ov.netProfitMargin / 100, 'NetProfit / TotalRevenue × 100%']);
    marginRow.getCell(1).font = { name: 'Segoe UI', size: 10 };
    marginRow.getCell(2).numFmt = '0.00%';
    marginRow.getCell(2).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: COLOR_ACCENT } };
    marginRow.getCell(2).alignment = { horizontal: 'right' };
    marginRow.getCell(3).font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: '64748B' } };
    this.applyRowBorder(marginRow, 3);

    ws.addRow([]);
    const ordRow = ws.addRow(['Tổng số đơn hàng hoàn tất', ov.totalOrders, 'Đơn có StatusId = 3 trong kỳ']);
    ordRow.getCell(1).font = { name: 'Segoe UI', size: 10 };
    ordRow.getCell(2).font = { name: 'Segoe UI', size: 10, bold: true };
    ordRow.getCell(2).alignment = { horizontal: 'right' };
    this.applyRowBorder(ordRow, 3);

    this.autoFit(ws);
  }

  // ==================== SHEET LỢI NHUẬN GỘP ====================

  private buildGrossSheet(
    wb: ExcelJS.Workbook,
    fromDate: string,
    toDate: string,
    items: any[],
    sheetName: string
  ): void {
    const ws = wb.addWorksheet(sheetName);
    ws.views = [{ showGridLines: true }];

    const title = sheetName.includes('Ngày')
      ? 'BÁO CÁO LỢI NHUẬN GỘP THEO NGÀY'
      : 'BÁO CÁO LỢI NHUẬN GỘP THEO THÁNG';
    this.addHeader(ws, title, fromDate, toDate, 5);
    ws.addRow([]);

    const headers = ['STT', 'Thời gian', 'Tổng doanh thu (₫)', 'Chi phí NL (₫)', 'Lợi nhuận gộp (₫)', 'Tỉ suất LNG (%)'];
    const th = ws.addRow(headers);
    this.styleHeaderRow(th, 6);

    items.forEach((item, idx) => {
      const label = this.buildDateLabel(item, sheetName.includes('Ngày'));
      // Ghi thẳng data từ BE — không tính toán
      const r = ws.addRow([
        idx + 1,
        label,
        item.totalRevenue,
        item.totalCost,
        item.grossProfit,
        item.profitMargin / 100  // BE trả về dạng %, chia 100 để hiển thị đúng định dạng Excel
      ]);
      r.getCell(1).alignment = { horizontal: 'center' };
      r.getCell(2).alignment = { horizontal: 'center' };
      r.getCell(3).numFmt = '#,##0" ₫"';
      r.getCell(4).numFmt = '#,##0" ₫"';
      r.getCell(5).numFmt = '#,##0" ₫"';
      r.getCell(5).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: item.grossProfit >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE } };
      r.getCell(6).numFmt = '0.00%';
      this.applyRowBorder(r, 6);
    });

    this.autoFit(ws);
  }

  // ==================== SHEET LỢI NHUẬN THỰC ====================

  private buildNetSheet(
    wb: ExcelJS.Workbook,
    fromDate: string,
    toDate: string,
    items: any[],
    sheetName: string
  ): void {
    const ws = wb.addWorksheet(sheetName);
    ws.views = [{ showGridLines: true }];

    const title = sheetName.includes('Ngày')
      ? 'BÁO CÁO LỢI NHUẬN THỰC THEO NGÀY'
      : 'BÁO CÁO LỢI NHUẬN THỰC THEO THÁNG';
    this.addHeader(ws, title, fromDate, toDate, 6);
    ws.addRow([]);

    const headers = ['STT', 'Thời gian', 'Tổng doanh thu (₫)', 'Chi phí NL (₫)', 'Chi phí VH (₫)', 'Lợi nhuận thực (₫)', 'Tỉ suất LNT (%)'];
    const th = ws.addRow(headers);
    this.styleHeaderRow(th, 7);

    items.forEach((item, idx) => {
      const label = this.buildDateLabel(item, sheetName.includes('Ngày'));
      // Ghi thẳng data từ BE
      const r = ws.addRow([
        idx + 1,
        label,
        item.totalRevenue,
        item.ingredientCost,
        item.operatingExpense,
        item.netProfit,
        item.netProfitMargin / 100 // BE trả về dạng %, chia 100 để Excel hiển thị đúng
      ]);
      r.getCell(1).alignment = { horizontal: 'center' };
      r.getCell(2).alignment = { horizontal: 'center' };
      r.getCell(3).numFmt = '#,##0" ₫"';
      r.getCell(4).numFmt = '#,##0" ₫"';
      r.getCell(5).numFmt = '#,##0" ₫"';
      r.getCell(6).numFmt = '#,##0" ₫"';
      r.getCell(6).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: item.netProfit >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE } };
      r.getCell(7).numFmt = '0.00%';
      this.applyRowBorder(r, 7);
    });

    this.autoFit(ws);
  }

  // ==================== SHEET BẢNG LƯƠNG ====================

  private buildPayrollSheet(wb: ExcelJS.Workbook, payroll: PayrollReport): void {
    const ws = wb.addWorksheet('Bảng Lương Nhân Sự');
    ws.views = [{ showGridLines: false }];

    const from = new Date(payroll.fromDate).toLocaleDateString('vi-VN');
    const to   = new Date(payroll.toDate).toLocaleDateString('vi-VN');
    this.addHeader(ws, 'BẢNG LƯƠNG NHÂN SỰ', from, to, 7);

    ws.addRow([]);

    // KPI tóm tắt — BE đã tính sẵn
    const kpiSec = ws.addRow(['TỔNG KẾT BẢNG LƯƠNG']);
    ws.mergeCells(`A${kpiSec.number}:G${kpiSec.number}`);
    kpiSec.getCell(1).font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: COLOR_TITLE_FG } };
    kpiSec.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF9C3' } };
    kpiSec.getCell(1).alignment = { horizontal: 'left', indent: 1 };
    kpiSec.height = 22;

    const kpiHeader = ws.addRow(['Chỉ số', 'Giá trị', '', '', '', '', '']);
    ws.mergeCells(`B${kpiHeader.number}:G${kpiHeader.number}`);
    this.styleHeaderRow(kpiHeader, 7);

    const kpiRows: [string, number | string][] = [
      ['Kỳ lương', `${from} → ${to}`],
      ['Tổng nhân viên', payroll.totalEmployees],
      ['Tổng số ca làm', payroll.totalWorkShifts],
      ['Tổng lương Gross', payroll.totalGrossSalary],
      ['Tổng khấu trừ / phạt', payroll.totalDeduction],
      ['Tổng lương thực lãnh (Net)', payroll.totalNetSalary],
    ];
    kpiRows.forEach(([label, value]) => {
      const r = ws.addRow([label, value, '', '', '', '', '']);
      ws.mergeCells(`B${r.number}:G${r.number}`);
      r.getCell(1).font = { name: 'Segoe UI', size: 10, bold: true };
      const vc = r.getCell(2);
      if (typeof value === 'number') {
        vc.numFmt = '#,##0" ₫"';
        vc.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: COLOR_TITLE_FG } };
      } else {
        vc.font = { name: 'Segoe UI', size: 10, color: { argb: COLOR_ACCENT } };
      }
      vc.alignment = { horizontal: 'right' };
      this.applyRowBorder(r, 7);
    });

    ws.addRow([]);

    // Bảng chi tiết nhân viên
    const detailSec = ws.addRow(['CHI TIẾT LƯƠNG TỪNG NHÂN VIÊN']);
    ws.mergeCells(`A${detailSec.number}:G${detailSec.number}`);
    detailSec.getCell(1).font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: COLOR_TITLE_FG } };
    detailSec.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DCFCE7' } };
    detailSec.getCell(1).alignment = { horizontal: 'left', indent: 1 };
    detailSec.height = 22;

    const cols = ['STT', 'Tên nhân viên', 'Tài khoản', 'Lương / ca (₫)', 'Số ca làm', 'Lương Gross (₫)', 'Khấu trừ (₫)', 'Thực lãnh (₫)'];
    // 8 columns but we have 7 merged above — expand to 8 for this table
    const empHeader = ws.addRow(cols);
    this.styleHeaderRow(empHeader, 8);

    payroll.employees.forEach((emp, idx) => {
      // Ghi thẳng từ PayrollEmployeeDTO — không tính toán
      const r = ws.addRow([
        idx + 1,
        emp.fullName ?? '—',
        emp.username,
        emp.shiftSalary,
        emp.workShiftCount,
        emp.grossSalary,
        emp.deductionAmount,
        emp.netSalary
      ]);
      r.getCell(1).alignment = { horizontal: 'center' };
      r.getCell(4).numFmt = '#,##0" ₫"';
      r.getCell(5).alignment = { horizontal: 'center' };
      r.getCell(6).numFmt = '#,##0" ₫"';
      r.getCell(7).numFmt = '#,##0" ₫"';
      r.getCell(7).font = { name: 'Segoe UI', size: 10, color: { argb: emp.deductionAmount > 0 ? COLOR_NEGATIVE : '64748B' } };
      r.getCell(8).numFmt = '#,##0" ₫"';
      r.getCell(8).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: COLOR_POSITIVE } };
      this.applyRowBorder(r, 8);
    });

    // Hàng tổng cộng
    const totalRow = ws.addRow([
      'TỔNG CỘNG', '', '',
      '',
      payroll.totalWorkShifts,
      payroll.totalGrossSalary,
      payroll.totalDeduction,
      payroll.totalNetSalary
    ]);
    ws.mergeCells(`A${totalRow.number}:D${totalRow.number}`);
    for (let i = 1; i <= 8; i++) {
      const c = totalRow.getCell(i);
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_TOTAL_BG } };
      c.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: COLOR_TITLE_FG } };
      c.border = { top: { style: 'medium', color: { argb: COLOR_BORDER } }, bottom: { style: 'double', color: { argb: '0F172A' } } };
    }
    totalRow.getCell(5).alignment = { horizontal: 'center' };
    totalRow.getCell(6).numFmt = '#,##0" ₫"';
    totalRow.getCell(7).numFmt = '#,##0" ₫"';
    totalRow.getCell(8).numFmt = '#,##0" ₫"';

    this.autoFit(ws);
  }

  // ==================== HELPER UTILITIES ====================

  private addHeader(ws: ExcelJS.Worksheet, title: string, fromDate: string, toDate: string, colSpan: number): void {
    const compRow = ws.addRow(['CÔNG TY CỔ PHẦN QUẢN LÝ NHÀ HÀNG']);
    ws.mergeCells(`A${compRow.number}:${this.col(colSpan)}${compRow.number}`);
    compRow.getCell(1).font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: COLOR_COMPANY_FG } };
    compRow.getCell(1).alignment = { horizontal: 'center' };
    compRow.height = 20;

    const subRow = ws.addRow(['Hệ thống quản lý tài chính & báo cáo']);
    ws.mergeCells(`A${subRow.number}:${this.col(colSpan)}${subRow.number}`);
    subRow.getCell(1).font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: '64748B' } };
    subRow.getCell(1).alignment = { horizontal: 'center' };

    ws.addRow([]);

    const titleRow = ws.addRow([title]);
    ws.mergeCells(`A${titleRow.number}:${this.col(colSpan)}${titleRow.number}`);
    titleRow.getCell(1).font = { name: 'Segoe UI', size: 15, bold: true, color: { argb: COLOR_TITLE_FG } };
    titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    titleRow.height = 32;

    const periodRow = ws.addRow([`Kỳ báo cáo: Từ ngày  ${fromDate}  đến ngày  ${toDate}`]);
    ws.mergeCells(`A${periodRow.number}:${this.col(colSpan)}${periodRow.number}`);
    periodRow.getCell(1).font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: '475569' } };
    periodRow.getCell(1).alignment = { horizontal: 'center' };

    const exportRow = ws.addRow([`Xuất lúc: ${new Date().toLocaleString('vi-VN')}`]);
    ws.mergeCells(`A${exportRow.number}:${this.col(colSpan)}${exportRow.number}`);
    exportRow.getCell(1).font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: '94A3B8' } };
    exportRow.getCell(1).alignment = { horizontal: 'right' };
  }

  private styleHeaderRow(row: ExcelJS.Row, colCount: number): void {
    row.height = 26;
    for (let i = 1; i <= colCount; i++) {
      const c = row.getCell(i);
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_BG } };
      c.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: COLOR_HEADER_FG } };
      c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      c.border = {
        top:    { style: 'thin', color: { argb: '334155' } },
        bottom: { style: 'medium', color: { argb: '0F172A' } },
        left:   { style: 'thin', color: { argb: '334155' } },
        right:  { style: 'thin', color: { argb: '334155' } }
      };
    }
  }

  private applyRowBorder(row: ExcelJS.Row, colCount: number): void {
    row.font = row.font ?? {};
    (row as any).font = { name: 'Segoe UI', size: 10, ...(row as any).font };
    for (let i = 1; i <= colCount; i++) {
      row.getCell(i).border = {
        bottom: { style: 'hair', color: { argb: COLOR_BORDER } },
        left:   { style: 'thin', color: { argb: 'F1F5F9' } },
        right:  { style: 'thin', color: { argb: 'F1F5F9' } }
      };
    }
  }

  private autoFit(ws: ExcelJS.Worksheet): void {
    ws.columns.forEach(col => {
      let max = 12;
      col.eachCell?.({ includeEmpty: false }, cell => {
        const v = cell.text ?? '';
        if (v.length > max && v.length < 60) max = v.length;
      });
      col.width = max + 3;
    });
  }

  private buildDateLabel(item: any, isDaily: boolean): string {
    if (isDaily && item.day) {
      return `${String(item.day).padStart(2, '0')}/${String(item.month).padStart(2, '0')}/${item.year}`;
    }
    if (item.month) {
      return `Tháng ${String(item.month).padStart(2, '0')}/${item.year}`;
    }
    return `Năm ${item.year}`;
  }

  /** Chuyển số cột (1-based) ra ký tự cột Excel (A, B, ..., G) */
  private col(n: number): string {
    return String.fromCharCode(64 + n);
  }
}
