import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { VietQrPayment } from '../../../../../model/payment.model';

@Component({
  selector: 'app-order-qr-dialog',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule, RippleModule],
  templateUrl: './order-qr-dialog.component.html',
  styleUrls: ['../../order.scss']
})
export class OrderQrDialogComponent {
  @Input() visible = false;
  @Input() loading = false;
  @Input() expired = false;
  @Input() error = '';
  @Input() payment: VietQrPayment | null = null;
  @Input() remainingTimeStr = '';

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() closeQrDialog = new EventEmitter<void>();
  @Output() createQrPayment = new EventEmitter<void>();
  @Output() retryPaymentStatus = new EventEmitter<void>();
}
