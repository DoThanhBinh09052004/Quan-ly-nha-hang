import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { OrderListItem } from '../../../../../model/order-list.model';

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [CommonModule, TableModule, InputTextModule, ButtonModule, TagModule, TooltipModule],
  templateUrl: './order-list.component.html',
  styleUrls: ['../../order.scss']
})
export class OrderListComponent {
  @Input() orders: OrderListItem[] = [];
  @Input() selectedOrders: OrderListItem[] = [];
  @Input() totalRecords = 0;
  @Input() loading = false;
  @Input() first = 0;
  @Input() rows = 10;

  @Output() selectedOrdersChange = new EventEmitter<OrderListItem[]>();
  @Output() lazyLoad = new EventEmitter<TableLazyLoadEvent>();
  @Output() globalFilter = new EventEmitter<Event>();
  @Output() payQr = new EventEmitter<OrderListItem>();
  @Output() edit = new EventEmitter<OrderListItem>();
  @Output() delete = new EventEmitter<OrderListItem>();

  // Dành cho hiển thị tooltip disable
  @Input() qrLoading = false;
  @Input() qrOrderId?: number;

  onSelectionChange(selection: OrderListItem[]) {
    this.selectedOrdersChange.emit(selection);
  }

  getStatusSeverity(statusName?: string): 'success' | 'warning' | 'danger' | 'info' | 'secondary' {
    if (!statusName) return 'secondary';
    const status = statusName.toLowerCase();
    if (status.includes('đã thanh toán') || status.includes('hoàn thành') || status.includes('completed')) return 'success';
    if (status.includes('đang xử lý') || status.includes('pending') || status.includes('chờ')) return 'warning';
    if (status.includes('đã hủy') || status.includes('cancelled')) return 'danger';
    if (status.includes('đang phục vụ') || status.includes('serving')) return 'info';
    return 'secondary';
  }

  canPayByQr(order: OrderListItem): boolean {
    return (order.finalPrice || 0) > (order.paidAmount || 0);
  }
}
