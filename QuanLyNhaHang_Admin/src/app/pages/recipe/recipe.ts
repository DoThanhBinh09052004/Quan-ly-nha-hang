import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { RippleModule } from 'primeng/ripple';
import { ToastModule } from 'primeng/toast';
import { forkJoin } from 'rxjs';

import { MyData } from '../../my-data';
import { Ingredient } from '../../../model/ingredient.model';
import { Item } from '../../../model/item.model';
import { Recipe } from '../../../model/recipe.model';

interface RecipeTicket {
  item: Item;
  rows: Recipe[];
  cost: number;
}

@Component({
  selector: 'app-recipe',
  standalone: true,
  templateUrl: './recipe.html',
  styleUrl: './recipe.scss',
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    ConfirmDialogModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    RippleModule,
    ToastModule,
  ],
  providers: [MessageService, ConfirmationService],
})
export class RecipeComponent implements OnInit {
  recipes: Recipe[] = [];
  items: Item[] = [];
  ingredients: Ingredient[] = [];
  selectedItemId: number | null = null;
  searchText = '';
  expandedItemIds = new Set<number>();

  recipe = this.emptyRecipe();
  dialogVisible = false;
  submitted = false;
  loading = false;

  constructor(
    private data: MyData,
    private messages: MessageService,
    private confirmations: ConfirmationService,
  ) {}

  ngOnInit(): void {
    this.loadLookups();
  }

  emptyRecipe(): Recipe {
    return {
      id: 0,
      itemId: 0,
      ingredientId: 0,
      quantityNeeded: 0,
      created: new Date(),
      updated: new Date(),
    };
  }

  loadLookups(): void {
    this.loading = true;

    forkJoin({
      items: this.data.getAllItems(),
      ingredients: this.data.getAllIngredients(),
      recipes: this.data.getAllRecipes(),
    }).subscribe({
      next: (result) => {
        this.items = result.items.filter((item) => !item.deleted);
        this.ingredients = result.ingredients;
        this.recipes = result.recipes;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.messages.add({
          severity: 'error',
          summary: 'Không thể tải dữ liệu công thức',
        });
      },
    });
  }

  get displayedRecipes(): Recipe[] {
    return this.selectedItemId
      ? this.recipes.filter((recipe) => recipe.itemId === this.selectedItemId)
      : this.recipes;
  }

  get recipeCost(): number {
    return this.displayedRecipes.reduce(
      (total, recipe) => total + recipe.quantityNeeded * (this.getIngredient(recipe.ingredientId)?.rawMaterialCost || 0),
      0,
    );
  }

  get tickets(): RecipeTicket[] {
    const term = this.searchText.trim().toLocaleLowerCase();

    return this.items
      .map((item) => {
        const rows = this.displayedRecipes.filter((recipe) => recipe.itemId === item.id);
        const cost = rows.reduce(
          (total, recipe) => total + recipe.quantityNeeded * (this.getIngredient(recipe.ingredientId)?.rawMaterialCost || 0),
          0,
        );
        return { item, rows, cost };
      })
      .filter((ticket) => {
        if (!ticket.rows.length) return false;
        if (!term) return true;

        return (
          ticket.item.name.toLocaleLowerCase().includes(term) ||
          ticket.rows.some((recipe) =>
            (recipe.ingredientName || this.getIngredient(recipe.ingredientId)?.name || '').toLocaleLowerCase().includes(term),
          )
        );
      });
  }

  getIngredient(id: number): Ingredient | undefined {
    return this.ingredients.find((ingredient) => ingredient.id === id);
  }

  openNew(): void {
    this.recipe = this.emptyRecipe();
    this.recipe.itemId = this.selectedItemId || 0;
    this.submitted = false;
    this.dialogVisible = true;
  }

  edit(row: Recipe): void {
    this.recipe = { ...row };
    this.submitted = false;
    this.dialogVisible = true;
  }

  save(): void {
    this.submitted = true;
    if (!this.recipe.itemId || !this.recipe.ingredientId || this.recipe.quantityNeeded <= 0) return;

    const request = this.recipe.id
      ? this.data.updateRecipe(this.recipe.id, this.recipe)
      : this.data.createRecipe(this.recipe);

    request.subscribe({
      next: () => {
        this.messages.add({ severity: 'success', summary: 'Đã lưu công thức' });
        this.dialogVisible = false;
        this.loadLookups();
      },
      error: (error) => {
        this.messages.add({
          severity: 'error',
          summary: 'Không thể lưu',
          detail: error.error || 'Món và nguyên liệu đã tồn tại trong công thức.',
        });
      },
    });
  }

  delete(row: Recipe): void {
    this.confirmations.confirm({
      header: 'Xóa dòng công thức',
      message: `Bỏ ${row.ingredientName || this.getIngredient(row.ingredientId)?.name} khỏi công thức?`,
      accept: () => this.data.deleteRecipe(row.id).subscribe({
        next: () => {
          this.messages.add({ severity: 'success', summary: 'Đã xóa' });
          this.loadLookups();
        },
        error: () => this.messages.add({ severity: 'error', summary: 'Không thể xóa công thức' }),
      }),
    });
  }

  toggleTicket(itemId: number): void {
    this.expandedItemIds.has(itemId)
      ? this.expandedItemIds.delete(itemId)
      : this.expandedItemIds.add(itemId);
  }

  isExpanded(itemId: number): boolean {
    return this.expandedItemIds.has(itemId);
  }

  filter(event: Event): void {
    this.searchText = (event.target as HTMLInputElement).value;
  }
}
