import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { Category } from '../../../../model/category.model';
import { Item } from '../../../../model/item.model';

export interface ItemPickerSelection {
  item: Item;
  quantity: number;
}

@Component({
  selector: 'app-item-picker-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, ButtonModule, InputNumberModule, InputTextModule],
  templateUrl: './item-picker-dialog.html',
  styleUrls: ['./item-picker-dialog.scss']
})
export class ItemPickerDialogComponent implements OnChanges {
  @Input() visible = false;
  @Input() items: Item[] = [];
  @Input() categories: Category[] = [];
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() addItem = new EventEmitter<ItemPickerSelection>();

  selectedCategoryId: number | null = null;
  searchQuery = '';
  selectedItem: Item | null = null;
  quantity = 1;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['visible']?.currentValue) this.resetSelection();
  }

  get visibleItems(): Item[] {
    const query = this.searchQuery.trim().toLowerCase();
    return this.items.filter((item) => {
      const matchesCategory = this.selectedCategoryId === null || this.getCategoryId(item) === this.selectedCategoryId;
      const matchesSearch = !query || item.name.toLowerCase().includes(query) ||
        (item.description || '').toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }

  get selectedCategoryName(): string {
    if (this.selectedCategoryId === null) return 'Tất cả món ăn';
    return this.categories.find((category) => category.id === this.selectedCategoryId)?.name || 'Danh mục món ăn';
  }

  selectItem(item: Item) {
    this.selectedItem = item;
    this.quantity = 1;
  }

  itemsByCategory(categoryId: number) {
    return this.items.filter((item) => this.getCategoryId(item) === categoryId).length;
  }

  confirm() {
    if (!this.selectedItem || this.quantity < 1 || this.quantity > this.selectedItem.quantity) return;
    this.addItem.emit({ item: this.selectedItem, quantity: this.quantity });
  }

  close() {
    this.visibleChange.emit(false);
  }

  salePrice(item: Item) {
    return item.price - (item.price * (item.discount / 100));
  }

  itemImage(item: Item): string | null {
    const data = item.itemImages?.[0]?.data;
    return data ? `data:image/jpeg;base64,${data}` : null;
  }

  private resetSelection() {
    this.selectedCategoryId = null;
    this.searchQuery = '';
    this.selectedItem = null;
    this.quantity = 1;
  }

  private getCategoryId(item: Item): number | undefined {
    return item.categoryId ?? item.category?.id;
  }
}
