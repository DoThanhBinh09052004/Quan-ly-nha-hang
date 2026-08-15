import { CommonModule, formatDate } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';

import {
  CreateIngredientBatchRequest,
  Ingredient,
  IngredientBatch,
  UpdateIngredientBatchRequest,
} from '../../../../../model/ingredient.model';

export type IngredientBatchSaveRequest = CreateIngredientBatchRequest | UpdateIngredientBatchRequest;

interface BatchFormValue {
  batchCode: string;
  receivedDate: string;
  expirationDate: string;
  unitCost: number;
  quantity: number;
}

@Component({
  selector: 'app-ingredient-batch-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, ButtonModule, InputTextModule, InputNumberModule],
  templateUrl: './ingredient-batch-dialog.component.html',
  styleUrls: ['../../ingredient.scss'],
})
export class IngredientBatchDialogComponent implements OnChanges {
  @Input() visible = false;
  @Input() saving = false;
  @Input() ingredient?: Ingredient;
  @Input() batch: IngredientBatch | null = null;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() save = new EventEmitter<IngredientBatchSaveRequest>();

  form: BatchFormValue = this.emptyForm();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['batch'] || (changes['visible'] && this.visible)) {
      this.form = this.batch
        ? {
            batchCode: this.batch.batchCode,
            receivedDate: this.toDateInput(this.batch.receivedDate),
            expirationDate: this.toDateInput(this.batch.expirationDate),
            unitCost: Number(this.batch.unitCost),
            quantity: Number(this.batch.receivedQuantity),
          }
        : this.emptyForm();
    }
  }

  get isEditing(): boolean {
    return !!this.batch;
  }

  get usedQuantity(): number {
    if (!this.batch) return 0;
    return Math.max(0, Number(this.batch.receivedQuantity) - Number(this.batch.remainingQuantity));
  }

  get validationMessage(): string {
    if (!this.form.receivedDate || !this.form.expirationDate) {
      return 'Ngày nhập và hạn sử dụng là bắt buộc.';
    }

    if (this.form.receivedDate > this.today) {
      return 'Ngày nhập không được nằm trong tương lai.';
    }

    if (this.form.expirationDate < this.today) {
      return 'Hạn sử dụng không được nằm trong quá khứ.';
    }

    if (this.form.expirationDate <= this.form.receivedDate) {
      return 'Hạn sử dụng phải sau ngày nhập.';
    }

    if (Number(this.form.unitCost) < 0) {
      return 'Giá nhập không được âm.';
    }

    if (Number(this.form.quantity) <= 0) {
      return 'Số lượng nhập phải lớn hơn 0.';
    }

    if (this.isEditing && Number(this.form.quantity) < this.usedQuantity) {
      return `Số lượng nhập không thể nhỏ hơn ${this.usedQuantity} ${this.ingredient?.unit ?? ''} đã dùng.`;
    }

    return '';
  }

  get today(): string {
    return formatDate(new Date(), 'yyyy-MM-dd', 'en-US');
  }

  closeDialog(): void {
    if (this.saving) return;
    this.visible = false;
    this.visibleChange.emit(false);
  }

  saveBatch(): void {
    if (this.validationMessage || this.saving) return;

    const common = {
      batchCode: this.form.batchCode.trim() || undefined,
      receivedDate: `${this.form.receivedDate}T00:00:00`,
      expirationDate: `${this.form.expirationDate}T00:00:00`,
      unitCost: Number(this.form.unitCost),
    };

    if (this.batch) {
      this.save.emit({
        ...common,
        id: this.batch.id,
        receivedQuantity: Number(this.form.quantity),
      });
      return;
    }

    this.save.emit({
      ...common,
      quantity: Number(this.form.quantity),
    });
  }

  private emptyForm(): BatchFormValue {
    const today = formatDate(new Date(), 'yyyy-MM-dd', 'en-US');
    return {
      batchCode: '',
      receivedDate: today,
      expirationDate: '',
      unitCost: 0,
      quantity: 0,
    };
  }

  private toDateInput(value: string): string {
    return value ? value.substring(0, 10) : '';
  }
}
