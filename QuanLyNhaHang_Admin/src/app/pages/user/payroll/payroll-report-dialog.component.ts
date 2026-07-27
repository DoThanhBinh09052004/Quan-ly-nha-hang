import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';

import { PayrollReport } from '../models/user-management.models';

@Component({
  selector: 'app-payroll-report-dialog',
  standalone: true,
  imports: [CommonModule, ButtonModule, DialogModule, TableModule],
  templateUrl: './payroll-report-dialog.component.html',
  styleUrl: './payroll-report-dialog.component.scss',
})
export class PayrollReportDialogComponent {
  @Input() visible = false;
  @Input() period: 'weekly' | 'monthly' = 'weekly';
  @Input() report: PayrollReport | null = null;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() periodChange = new EventEmitter<'weekly' | 'monthly'>();
  @Output() exportReport = new EventEmitter<void>();
}
