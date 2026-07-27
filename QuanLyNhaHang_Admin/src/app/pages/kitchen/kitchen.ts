import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { finalize } from 'rxjs';

import { MyData } from '../../my-data';
import { KitchenOrderItem } from '../../../model/kitchen.model';

const PROCESSING = 'ORDER_ITEM_PROCESSING';
const COMPLETED = 'ORDER_ITEM_COMPLETED';
const CANCELLED = 'ORDER_ITEM_CANCELLED';

interface KitchenTicket {
  orderId: number;
  orderNumber: string;
  tableName?: string | null;
  items: KitchenOrderItem[];
}

@Component({
  selector: 'app-kitchen',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    ButtonModule,
    ConfirmDialogModule,
    ProgressSpinnerModule,
    TagModule,
    ToastModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './kitchen.html',
  styleUrl: './kitchen.scss',
})
export class KitchenComponent implements OnInit, OnDestroy {
  tickets: KitchenTicket[] = [];
  isLoading = false;
  errorMessage = '';
  lastUpdated?: Date;

  private readonly updatingItemIds = new Set<number>();
  private refreshTimer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly myData: MyData,
    private readonly messageService: MessageService,
    private readonly confirmationService: ConfirmationService,
  ) {}

  ngOnInit(): void {
    this.loadTickets();
    this.refreshTimer = setInterval(() => this.loadTickets(), 20_000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  }

  loadTickets(): void {
    if (this.isLoading) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.myData.getKitchenPendingItems()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (items) => {
          this.tickets = this.groupTickets(items);
          this.lastUpdated = new Date();
        },
        error: () => {
          this.errorMessage = 'Không thể tải danh sách món. Vui lòng thử tải lại.';
        },
      });
  }

  advanceItem(item: KitchenOrderItem): void {
    const targetStatus = this.isProcessing(item) ? COMPLETED : PROCESSING;
    const successMessage = this.isProcessing(item)
      ? `Đã hoàn thành ${item.name}.`
      : `Đã bắt đầu chế biến ${item.name}.`;

    this.updateItemStatus(item, targetStatus, successMessage);
  }

  confirmCancel(item: KitchenOrderItem): void {
    this.confirmationService.confirm({
      header: 'Xác nhận hủy món',
      message: `Bạn có chắc muốn hủy món “${item.name}” của đơn ${this.orderLabel(item)} không?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Hủy món',
      rejectLabel: 'Quay lại',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.updateItemStatus(item, CANCELLED, `Đã hủy món ${item.name}.`),
    });
  }

  isProcessing(item: KitchenOrderItem): boolean {
    return item.cookingStatusCode === PROCESSING;
  }

  isUpdating(itemId: number): boolean {
    return this.updatingItemIds.has(itemId);
  }

  statusLabel(item: KitchenOrderItem): string {
    return this.isProcessing(item) ? 'Đang chế biến' : 'Chờ chế biến';
  }

  trackTicket(_: number, ticket: KitchenTicket): number {
    return ticket.orderId;
  }

  trackItem(_: number, item: KitchenOrderItem): number {
    return item.id;
  }

  private updateItemStatus(item: KitchenOrderItem, cookingStatusCode: string, successMessage: string): void {
    if (this.isUpdating(item.id)) {
      return;
    }

    this.updatingItemIds.add(item.id);
    this.myData.updateKitchenItemStatus({
      orderItemId: item.id,
      cookingStatusCode,
      kitchenNote: item.kitchenNote,
    })
      .pipe(finalize(() => this.updatingItemIds.delete(item.id)))
      .subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Bếp', detail: successMessage });
          this.loadTickets();
        },
        error: (error: { error?: { message?: string } }) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Không thể cập nhật món',
            detail: error.error?.message ?? 'Vui lòng thử lại.',
          });
        },
      });
  }

  private groupTickets(items: KitchenOrderItem[]): KitchenTicket[] {
    const tickets = new Map<number, KitchenTicket>();

    for (const item of items) {
      const ticket = tickets.get(item.orderId);
      if (ticket) {
        ticket.items.push(item);
        continue;
      }

      tickets.set(item.orderId, {
        orderId: item.orderId,
        orderNumber: this.orderLabel(item),
        tableName: item.tableName,
        items: [item],
      });
    }

    return [...tickets.values()];
  }

  private orderLabel(item: KitchenOrderItem): string {
    return item.orderNumber || `#${item.orderId}`;
  }
}
