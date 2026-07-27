import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { RippleModule } from 'primeng/ripple';
import { AutoCompleteCompleteEvent, AutoCompleteModule } from 'primeng/autocomplete';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { Order } from '../../../../../model/order.model';
import { OrderItem } from '../../../../../model/orderitem.model';
import { GuestTable } from '../../../../../model/guesttable.model';

@Component({
  selector: 'app-order-form-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, ButtonModule, InputTextModule, InputNumberModule, TextareaModule, RippleModule, AutoCompleteModule, TableModule, TagModule],
  templateUrl: './order-form-dialog.component.html',
  styleUrls: ['../../order.scss']
})
export class OrderFormDialogComponent {
  @Input() visible = false;
  @Input() order!: Order;
  @Input() orderItems: OrderItem[] = [];
  
  @Input() guesttables: GuestTable[] = [];
  @Input() selectedGuestTable: GuestTable | null = null;
  @Input() filterGuestTable: GuestTable[] = [];

  @Input() guestPhone = '';
  @Input() guestName = '';
  @Input() guestPoints = 0;
  
  @Input() pointsAvailable = 0;
  @Input() pointsToUse = 0;
  @Input() maxPoints = 0;
  @Input() minPoints = 50;
  @Input() pointsDiscount = 0;
  @Input() usePointsButtonDisabled = false;

  @Input() finalPrice = 0;
  @Input() recommendations: any[] = [];

  @Output() visibleChange = new EventEmitter<boolean>();
  
  @Output() selectedGuestTableChange = new EventEmitter<GuestTable | null>();
  @Output() searchGuestTable = new EventEmitter<AutoCompleteCompleteEvent>();
  
  @Output() guestPhoneChange = new EventEmitter<string>();
  @Output() searchGuestByPhone = new EventEmitter<void>();
  
  @Output() paidAmountChange = new EventEmitter<number>();
  @Output() pointsToUseChange = new EventEmitter<number>();
  @Output() onPointsChange = new EventEmitter<void>();
  @Output() usePoints = new EventEmitter<void>();
  
  @Output() openAddItemDialog = new EventEmitter<void>();
  @Output() updateQuantity = new EventEmitter<{item: OrderItem, event: any}>();
  @Output() removeOrderItem = new EventEmitter<number>();
  
  @Output() addRecommendedItem = new EventEmitter<any>();
  @Output() saveOrder = new EventEmitter<void>();
  @Output() hideDialog = new EventEmitter<void>();

  onSelectedGuestTableChange(table: GuestTable | null) {
    this.selectedGuestTable = table;
    this.selectedGuestTableChange.emit(table);
  }

  onGuestPhoneChange(phone: string) {
    this.guestPhone = phone;
    this.guestPhoneChange.emit(phone);
  }

  onPaidAmountChange(amount: number) {
    this.order.paidAmount = amount;
    this.paidAmountChange.emit(amount);
  }

  onPointsToUseChange(points: number) {
    this.pointsToUse = points;
    this.pointsToUseChange.emit(points);
  }

  getItemTotal(item: OrderItem): number {
    return item.quantity * item.salePrice;
  }
}
