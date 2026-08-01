import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { finalize } from 'rxjs';

import { MyData } from '../../../../my-data';
import { KitchenOrderItem } from '../../../../../model/kitchen.model';

@Component({
  selector: 'app-completed-dishes-table',
  standalone: true,
  imports: [CommonModule, DatePipe, ButtonModule, TableModule],
  templateUrl: './completed-dishes-table.component.html',
  styleUrl: './completed-dishes-table.component.scss',
})
export class CompletedDishesTableComponent implements OnInit, OnDestroy {
  completedItems: KitchenOrderItem[] = [];
  isLoading = false;
  errorMessage = '';
  lastUpdated?: Date;

  private refreshTimer?: ReturnType<typeof setInterval>;

  constructor(private readonly myData: MyData) {}

  ngOnInit(): void {
    this.loadCompletedItems();
    this.refreshTimer = setInterval(() => this.loadCompletedItems(), 15_000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  }

  loadCompletedItems(): void {
    if (this.isLoading) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.myData.getCompletedKitchenItems()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (items) => {
          this.completedItems = Array.isArray(items) ? items : [];
          this.lastUpdated = new Date();
        },
        error: () => {
          this.errorMessage = 'Không thể tải danh sách món đã hoàn thành.';
        },
      });
  }

  trackItem(_: number, item: KitchenOrderItem): number {
    return item.id;
  }
}
