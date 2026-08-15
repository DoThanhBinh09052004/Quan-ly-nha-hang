import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { forkJoin, Observable } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';

import { MyData } from '../../my-data';
import {
  AiIngredientDailyForecastRow,
  AiIngredientRestockRow,
  CreateIngredientBatchRequest,
  CreateIngredientRequest,
  Ingredient,
  IngredientBatch,
  UpdateIngredientBatchRequest,
  UpdateIngredientRequest,
} from '../../../model/ingredient.model';

import {
  IngredientBatchDialogComponent,
  IngredientBatchSaveRequest,
} from './components/ingredient-batch-dialog/ingredient-batch-dialog.component';
import { IngredientForecastDialogComponent } from './components/ingredient-forecast-dialog/ingredient-forecast-dialog.component';
import { IngredientFormDialogComponent } from './components/ingredient-form-dialog/ingredient-form-dialog.component';
import { IngredientListComponent } from './components/ingredient-list/ingredient-list.component';
import { IngredientRestockDialogComponent } from './components/ingredient-restock-dialog/ingredient-restock-dialog.component';
import { IngredientToolbarComponent } from './components/ingredient-toolbar/ingredient-toolbar.component';

@Component({
  selector: 'app-ingredient',
  standalone: true,
  templateUrl: './ingredient.html',
  styleUrl: './ingredient.scss',
  imports: [
    CommonModule,
    ConfirmDialogModule,
    ToastModule,
    IngredientToolbarComponent,
    IngredientListComponent,
    IngredientFormDialogComponent,
    IngredientBatchDialogComponent,
    IngredientForecastDialogComponent,
    IngredientRestockDialogComponent,
  ],
  providers: [MessageService, ConfirmationService],
})
export class IngredientComponent implements OnInit {
  ingredients: Ingredient[] = [];
  selectedIngredients: Ingredient[] = [];
  batchesByIngredient: Record<number, IngredientBatch[] | undefined> = {};
  batchLoading: Record<number, boolean> = {};

  ingredient = this.emptyIngredient();
  selectedBatch: IngredientBatch | null = null;
  batchIngredient?: Ingredient;
  restockRows: AiIngredientRestockRow[] = [];
  forecastRows: AiIngredientDailyForecastRow[] = [];

  dialogVisible = false;
  batchDialogVisible = false;
  forecastVisible = false;
  restockVisible = false;
  loading = false;
  savingIngredient = false;
  savingBatch = false;
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

  get totalBatchCount(): number {
    return this.ingredients.reduce((sum, ingredient) => sum + Number(ingredient.batchCount || 0), 0);
  }

  get expiringSoonBatchCount(): number {
    return this.ingredients.reduce((sum, ingredient) => sum + Number(ingredient.expiringSoonBatchCount || 0), 0);
  }

  emptyIngredient(): Ingredient {
    return {
      id: 0,
      name: '',
      unit: '',
      stockQuantity: 0,
      minStock: 0,
      batchCount: 0,
      expiringSoonBatchCount: 0,
      earliestExpirationDate: null,
      created: new Date(),
      updated: new Date(),
    };
  }

  loadData(): void {
    this.loading = true;
    this.batchesByIngredient = {};

    this.data.getAllIngredients().subscribe({
      next: (ingredients) => {
        this.ingredients = ingredients;
        this.selectedIngredients = this.selectedIngredients.filter((selected) =>
          ingredients.some((ingredient) => ingredient.id === selected.id),
        );
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.showError('Không thể tải danh sách nguyên liệu', error);
      },
    });
  }

  loadBatches(ingredient: Ingredient, force = false): void {
    if (!force && this.batchesByIngredient[ingredient.id]) return;

    this.batchLoading = { ...this.batchLoading, [ingredient.id]: true };
    this.data.getIngredientBatches(ingredient.id, true).subscribe({
      next: (batches) => {
        this.batchesByIngredient = { ...this.batchesByIngredient, [ingredient.id]: batches };
        this.batchLoading = { ...this.batchLoading, [ingredient.id]: false };
      },
      error: (error) => {
        this.batchLoading = { ...this.batchLoading, [ingredient.id]: false };
        this.showError(`Không thể tải các lô của ${ingredient.name}`, error);
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

  openNew(): void {
    this.ingredient = this.emptyIngredient();
    this.dialogVisible = true;
  }

  edit(row: Ingredient): void {
    this.ingredient = { ...row };
    this.dialogVisible = true;
  }

  openBatch(ingredient: Ingredient): void {
    this.batchIngredient = ingredient;
    this.selectedBatch = null;
    this.batchDialogVisible = true;
  }

  editBatch(event: { ingredient: Ingredient; batch: IngredientBatch }): void {
    this.batchIngredient = event.ingredient;
    this.selectedBatch = { ...event.batch };
    this.batchDialogVisible = true;
  }

  closeDialog(visible: boolean): void {
    this.dialogVisible = visible;
  }

  closeBatchDialog(visible: boolean): void {
    this.batchDialogVisible = visible;
    if (!visible) this.selectedBatch = null;
  }

  closeForecast(visible: boolean): void {
    this.forecastVisible = visible;
  }

  closeRestock(visible: boolean): void {
    this.restockVisible = visible;
  }

  onSelectionChange(selection: Ingredient[]): void {
    this.selectedIngredients = selection;
  }

  save(savedIngredient: Ingredient): void {
    if (!savedIngredient.name.trim() || !savedIngredient.unit.trim() || savedIngredient.minStock < 0) return;

    const createPayload: CreateIngredientRequest = {
      name: savedIngredient.name.trim(),
      unit: savedIngredient.unit.trim(),
      minStock: Number(savedIngredient.minStock),
    };
    const updatePayload: UpdateIngredientRequest = { ...createPayload, id: savedIngredient.id };
    const request: Observable<unknown> = savedIngredient.id
      ? this.data.updateIngredient(savedIngredient.id, updatePayload)
      : this.data.createIngredient(createPayload);

    this.savingIngredient = true;
    request.subscribe({
      next: () => {
        this.savingIngredient = false;
        this.dialogVisible = false;
        this.messages.add({
          severity: 'success',
          summary: 'Đã lưu nguyên liệu',
          detail: 'Thông tin nguyên liệu đã được cập nhật.',
        });
        this.loadData();
      },
      error: (error) => {
        this.savingIngredient = false;
        this.showError('Không thể lưu nguyên liệu', error);
      },
    });
  }

  saveBatch(payload: IngredientBatchSaveRequest): void {
    if (!this.batchIngredient) return;

    const ingredient = this.batchIngredient;
    const isUpdate = 'id' in payload;
    const request: Observable<IngredientBatch> = isUpdate
      ? this.data.updateIngredientBatch(
          ingredient.id,
          payload.id,
          payload as UpdateIngredientBatchRequest,
        )
      : this.data.createIngredientBatch(
          ingredient.id,
          payload as CreateIngredientBatchRequest,
        );

    this.savingBatch = true;
    request.subscribe({
      next: () => {
        this.savingBatch = false;
        this.batchDialogVisible = false;
        this.selectedBatch = null;
        this.messages.add({
          severity: 'success',
          summary: isUpdate ? 'Đã cập nhật lô' : 'Đã nhập lô mới',
          detail: `${ingredient.name} đã được cập nhật tồn kho.`,
        });
        this.refreshIngredientAndBatches(ingredient);
      },
      error: (error) => {
        this.savingBatch = false;
        this.showError(isUpdate ? 'Không thể cập nhật lô' : 'Không thể nhập lô', error);
      },
    });
  }

  delete(row: Ingredient): void {
    this.confirmations.confirm({
      header: 'Xóa nguyên liệu',
      message: `Xóa “${row.name}”? Chỉ có thể xóa khi không còn tồn kho và không được dùng trong công thức.`,
      acceptLabel: 'Xóa',
      rejectLabel: 'Hủy',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.data.deleteIngredient(row.id).subscribe({
        next: () => {
          this.messages.add({ severity: 'success', summary: 'Đã xóa nguyên liệu' });
          this.loadData();
        },
        error: (error) => this.showError('Không thể xóa nguyên liệu', error),
      }),
    });
  }

  deleteBatch(event: { ingredient: Ingredient; batch: IngredientBatch }): void {
    const { ingredient, batch } = event;
    this.confirmations.confirm({
      header: 'Xóa lô nguyên liệu',
      message: `Xóa lô “${batch.batchCode}” của ${ingredient.name}?`,
      acceptLabel: 'Xóa lô',
      rejectLabel: 'Hủy',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.data.deleteIngredientBatch(ingredient.id, batch.id).subscribe({
        next: () => {
          this.messages.add({ severity: 'success', summary: 'Đã xóa lô nguyên liệu' });
          this.refreshIngredientAndBatches(ingredient);
        },
        error: (error) => this.showError('Không thể xóa lô', error),
      }),
    });
  }

  deleteSelected(): void {
    if (!this.selectedIngredients.length) return;

    this.confirmations.confirm({
      header: 'Xóa nguyên liệu đã chọn',
      message: `Xóa ${this.selectedIngredients.length} nguyên liệu đã chọn?`,
      acceptLabel: 'Xóa',
      rejectLabel: 'Hủy',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => forkJoin(
        this.selectedIngredients.map((ingredient) => this.data.deleteIngredient(ingredient.id)),
      ).subscribe({
        next: () => {
          this.selectedIngredients = [];
          this.messages.add({ severity: 'success', summary: 'Đã xóa các nguyên liệu được chọn' });
          this.loadData();
        },
        error: (error) => this.showError('Không thể xóa toàn bộ nguyên liệu đã chọn', error),
      }),
    });
  }

  showForecast(row: Ingredient): void {
    this.ingredient = { ...row };
    this.forecastRows = [];
    this.forecastVisible = true;

    this.data.getAiIngredientForecast(row.id, this.forecastDays).subscribe({
      next: (rows: unknown[]) => {
        this.forecastRows = rows.map((forecast) => this.normalizeDailyForecastRow(forecast));
      },
      error: () => this.messages.add({
        severity: 'warn',
        summary: 'Chưa có dự báo',
        detail: 'Cần thêm dữ liệu đơn hàng hoàn tất để huấn luyện.',
      }),
    });
  }

  private refreshIngredientAndBatches(ingredient: Ingredient): void {
    this.batchLoading = { ...this.batchLoading, [ingredient.id]: true };
    forkJoin({
      ingredients: this.data.getAllIngredients(),
      batches: this.data.getIngredientBatches(ingredient.id, true),
    }).subscribe({
      next: ({ ingredients, batches }) => {
        this.ingredients = ingredients;
        this.batchesByIngredient = { ...this.batchesByIngredient, [ingredient.id]: batches };
        this.batchLoading = { ...this.batchLoading, [ingredient.id]: false };
      },
      error: (error) => {
        this.batchLoading = { ...this.batchLoading, [ingredient.id]: false };
        this.showError('Đã lưu nhưng không thể làm mới danh sách', error);
      },
    });
  }

  private showError(summary: string, error: unknown): void {
    const response = error as { error?: unknown; message?: string };
    let detail = 'Vui lòng thử lại.';

    if (typeof response?.error === 'string' && response.error.trim()) {
      detail = response.error;
    } else if (response?.error && typeof response.error === 'object') {
      const body = response.error as { message?: string; title?: string };
      detail = body.message || body.title || detail;
    } else if (response?.message) {
      detail = response.message;
    }

    this.messages.add({ severity: 'error', summary, detail });
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
