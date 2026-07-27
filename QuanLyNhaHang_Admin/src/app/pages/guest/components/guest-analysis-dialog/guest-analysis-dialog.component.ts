import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { Guest } from '../../../../../model/guest.model';
import { AiCustomerSegmentResponse } from '../../../../my-data';

interface FeatureRow { key: string; label: string; value: number; center: number; format: 'number' | 'currency' | 'percent' | 'days' | 'minutes'; }

@Component({
  selector: 'app-guest-analysis-dialog',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule, TagModule],
  templateUrl: './guest-analysis-dialog.component.html',
  styleUrls: ['../../guest.scss']
})
export class GuestAnalysisDialogComponent {
  @Input() visible = false;
  @Input() guest?: Guest;
  @Input() analysis?: AiCustomerSegmentResponse;
  @Input() loading = false;
  @Input() featureRows: FeatureRow[] = [];

  @Output() visibleChange = new EventEmitter<boolean>();

  closeDialog() {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  formatFeature(row: FeatureRow, value: number): string {
    if (row.format === 'currency') return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
    if (row.format === 'percent') return new Intl.NumberFormat('vi-VN', { style: 'percent', maximumFractionDigits: 0 }).format(value);
    if (row.format === 'days') return `${Math.round(value)} ngày`;
    if (row.format === 'minutes') return `${Math.round(value)} phút`;
    return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value);
  }
}
