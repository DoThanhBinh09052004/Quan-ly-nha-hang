import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { RippleModule } from 'primeng/ripple';
import { Table, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';

import { MyData } from '../../my-data';
import {
  AiIngredientDailyForecastRow,
  AiIngredientRestockRow,
  Ingredient,
} from '../../../model/ingredient.model';

@Component({
  selector: 'app-ingredient',
  standalone: true,
  templateUrl: './ingredient.html',
  styleUrl: './ingredient.scss',
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    ConfirmDialogModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    RippleModule,
    TableModule,
    TagModule,
    ToastModule,
  ],
  providers: [MessageService, ConfirmationService],
})
export class IngredientComponent implements OnInit {
  @ViewChild('dt') dt!: Table;

  ingredients: Ingredient[] = [];
  selectedIngredients: Ingredient[] = [];
  ingredient = this.emptyIngredient();
  restockRows: AiIngredientRestockRow[] = [];
  forecastRows: AiIngredientDailyForecastRow[] = [];

  dialogVisible = false;
  forecastVisible = false;
  restockVisible = false;
  submitted = false;
  loading = false;
  restockLoading = false;
  forecastDays = 14;

  constructor(
    private data: MyData,
    private messages: MessageService,
    private confirmations: ConfirmationService,
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  get lowStockCount(): number {
    return this.ingredients.filter((ingredient) => ingredient.stockQuantity <= ingredient.minStock).length;
  }

  get totalStock(): number {
    return this.ingredients.reduce((sum, ingredient) => sum + Number(ingredient.stockQuantity || 0), 0);
  }

  emptyIngredient(): Ingredient {
    return {
      id: 0,
      name: '',
      unit: '',
      rawMaterialCost: 0,
      stockQuantity: 0,
      minStock: 0,
      created: new Date(),
      updated: new Date(),
    };
  }

  loadData(): void {
    this.loading = true;

    this.data.getAllIngredients().subscribe({
      next: (ingredients) => {
        this.ingredients = ingredients;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.messages.add({
          severity: 'error',
          summary: 'Không thể tải danh sách nguyên liệu',
        });
      },
    });
  }

  openRestockForecast(): void {
    this.restockRows = [];
    this.restockLoading = true;
    this.restockVisible = true;

    this.data.getAiIngredientRestock(this.forecastDays).subscribe({
      next: (rows: unknown[]) => {
        this.restockRows = rows.map((row) => this.normalizeRestockRow(row));
        this.restockLoading = false;
      },
      error: () => {
        this.restockLoading = false;
        this.messages.add({
          severity: 'warn',
          summary: 'Chưa có dữ liệu dự báo',
          detail: 'Hãy kiểm tra AI service và dữ liệu đơn hàng hoàn tất.',
        });
      },
    });
  }

  status(ingredient: Ingredient): 'danger' | 'warn' | 'success' {
    if (ingredient.stockQuantity <= ingredient.minStock) return 'danger';
    return ingredient.stockQuantity <= ingredient.minStock * 1.25 ? 'warn' : 'success';
  }

  statusText(ingredient: Ingredient): string {
    if (ingredient.stockQuantity <= ingredient.minStock) return 'Cần nhập hàng';
    return ingredient.stockQuantity <= ingredient.minStock * 1.25 ? 'Sắp thiếu' : 'Đủ hàng';
  }

  openNew(): void {
    this.ingredient = this.emptyIngredient();
    this.submitted = false;
    this.dialogVisible = true;
  }

  edit(row: Ingredient): void {
    this.ingredient = { ...row };
    this.submitted = false;
    this.dialogVisible = true;
  }

  save(): void {
    this.submitted = true;
    if (!this.ingredient.name.trim() || !this.ingredient.unit.trim()) return;
    if (this.ingredient.stockQuantity < 0 || this.ingredient.minStock < 0 || this.ingredient.rawMaterialCost < 0) return;

    const request = this.ingredient.id
      ? this.data.updateIngredient(this.ingredient.id, this.ingredient)
      : this.data.createIngredient(this.ingredient);

    request.subscribe({
      next: () => {
        this.messages.add({ severity: 'success', summary: 'Đã lưu', detail: 'Thông tin nguyên liệu đã được cập nhật.' });
        this.dialogVisible = false;
        this.loadData();
      },
      error: (error) => this.messages.add({
        severity: 'error',
        summary: 'Không thể lưu',
        detail: error.error || 'Vui lòng kiểm tra lại dữ liệu.',
      }),
    });
  }

  delete(row: Ingredient): void {
    this.confirmations.confirm({
      header: 'Xóa nguyên liệu',
      message: `Xóa “${row.name}”? Công thức liên quan cần được kiểm tra trước.`,
      accept: () => this.data.deleteIngredient(row.id).subscribe({
        next: () => {
          this.messages.add({ severity: 'success', summary: 'Đã xóa' });
          this.loadData();
        },
        error: (error) => this.messages.add({
          severity: 'error',
          summary: 'Không thể xóa',
          detail: error.error || 'Nguyên liệu đang được sử dụng.',
        }),
      }),
    });
  }

  deleteSelected(): void {
    if (!this.selectedIngredients.length) return;

    this.confirmations.confirm({
      header: 'Xóa nguyên liệu đã chọn',
      message: `Xóa ${this.selectedIngredients.length} nguyên liệu đã chọn?`,
      accept: () => forkJoin(this.selectedIngredients.map((ingredient) => this.data.deleteIngredient(ingredient.id))).subscribe(() => {
        this.selectedIngredients = [];
        this.loadData();
      }),
    });
  }

  showForecast(row: Ingredient): void {
    this.ingredient = { ...row };
    this.forecastRows = [];
    this.forecastVisible = true;

    this.data.getAiIngredientForecast(row.id, this.forecastDays).subscribe({
      next: (rows: unknown[]) => (this.forecastRows = rows.map((forecast) => this.normalizeDailyForecastRow(forecast))),
      error: () => this.messages.add({
        severity: 'warn',
        summary: 'Chưa có dự báo',
        detail: 'Cần thêm dữ liệu đơn hàng hoàn tất để huấn luyện.',
      }),
    });
  }

  filter(event: Event): void {
    this.dt.filterGlobal((event.target as HTMLInputElement).value, 'contains');
  }

  private normalizeRestockRow(value: unknown): AiIngredientRestockRow {
    const row = value as Record<string, unknown>;

    return {
      ingredientId: Number(row['ingredientId'] ?? row['IngredientId'] ?? row['ingredient_id'] ?? 0),
      name: String(row['name'] ?? row['Name'] ?? ''),
      unit: String(row['unit'] ?? row['Unit'] ?? ''),
      stockQuantity: Number(row['stockQuantity'] ?? row['StockQuantity'] ?? 0),
      minStock: Number(row['minStock'] ?? row['MinStock'] ?? 0),
      forecastTotalUsed: Number(row['forecastTotalUsed'] ?? row['ForecastTotalUsed'] ?? row['forecast_total_used'] ?? 0),
      suggestedBuy: Number(row['suggestedBuy'] ?? row['SuggestedBuy'] ?? row['suggested_buy'] ?? 0),
    };
  }

  private normalizeDailyForecastRow(value: unknown): AiIngredientDailyForecastRow {
    const row = value as Record<string, unknown>;

    return {
      date: String(row['date'] ?? row['Date'] ?? ''),
      ingredientId: Number(row['ingredientId'] ?? row['IngredientId'] ?? row['ingredient_id'] ?? 0),
      predictedQtyUsed: Number(row['predictedQtyUsed'] ?? row['PredictedQtyUsed'] ?? row['predicted_qty_used'] ?? 0),
    };
  }
}
