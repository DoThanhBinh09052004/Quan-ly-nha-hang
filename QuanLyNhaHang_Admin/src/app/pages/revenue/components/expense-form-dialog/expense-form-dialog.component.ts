import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { ExpenseRequest, ExpenseCategory } from '../../../../../model/expense.model';

@Component({
  selector: 'app-expense-form-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, ButtonModule],
  templateUrl: './expense-form-dialog.component.html',
  styleUrls: ['./expense-form-dialog.component.scss']
})
export class ExpenseFormDialogComponent {
  @Input() visible = false;
  @Input() expenseCategories: ExpenseCategory[] = [];
  @Input() expenseSaving = false;
  @Input() editingExpense: Partial<ExpenseRequest> = { amount: 0, title: '', expenseCategoryId: 0, expenseDate: '', note: '' };

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() save = new EventEmitter<Partial<ExpenseRequest>>();

  closeDialog() {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  saveExpense() {
    this.save.emit(this.editingExpense);
  }
}
