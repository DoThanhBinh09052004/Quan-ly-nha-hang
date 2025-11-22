import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { MyData } from '../../my-data';
import { Category } from '../../../model/category.model';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Table, TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { FileUploadModule } from 'primeng/fileupload';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { RippleModule } from 'primeng/ripple';

interface Column {
  field: string;
  header: string;
  customExportHeader?: string;
}

interface ExportColumn {
  title: string;
  dataKey: string;
}

@Component({
  selector: 'app-category',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ToastModule,
    ToolbarModule,
    ButtonModule,
    FileUploadModule,
    DialogModule,
    ConfirmDialogModule,
    InputTextModule,
    InputNumberModule,
    IconFieldModule,
    InputIconModule,
    RippleModule,
  ],
  providers: [MessageService, ConfirmationService, MyData],
  templateUrl: './category.html',
  styleUrl: './category.scss',
})
export class CategoryComponent implements OnInit {
  categoryDialog: boolean = false;
  Categories!: Category[];
  category: Category = this.createEmptycategory();
  selectedCategories!: Category[];
  submitted: boolean = false;

  @ViewChild('dt') dt!: Table;

  cols!: Column[];
  exportColumns!: ExportColumn[];

  constructor(
    private mydata: MyData,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadData();

    this.cols = [
      { field: 'id', header: 'Mã' },
      { field: 'name', header: 'Tên' },
      { field: 'description', header: 'Mô tả' },
      { field: 'created', header: 'Ngày tạo' },
      { field: 'updated', header: 'Ngày cập nhật' },
    ];

    this.exportColumns = this.cols.map((col) => ({
      title: col.header,
      dataKey: col.field,
    }));
  }

  loadData() {
    // Giả định mydata.getAllCategories() tồn tại
    this.mydata.getAllCategories().subscribe((data) => {
      this.Categories = data;
      this.cd.markForCheck();
      console.log('Categories loaded:', this.Categories);
    });
  }

  createEmptycategory(): Category {
    return {
      id: 0,
      name: '',
      description: '',
      parentId: null,
      created: new Date(),
      updated: new Date(),
      deleted: false,
    };
  }

  openNew() {
    this.category = this.createEmptycategory();
    this.submitted = false;
    this.categoryDialog = true;
  }

  hideDialog() {
    this.categoryDialog = false;
    this.submitted = false;
  }

  editcategory(category: Category) {
    this.category = { ...category };
    this.categoryDialog = true;
  }

  savecategory() {
    this.submitted = true;
    if (this.category.name.trim()) {
      if (this.category.id) {
        // Giả định mydata.updatecategory() tồn tại
        this.mydata.updateCategory(this.category.id, this.category).subscribe(() => {
          this.messageService.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Cập nhật đơn vị hàng tính thành công',
          });
          this.loadData();
          this.hideDialog();
        });
      } else {
        // Giả định mydata.createcategory() tồn tại
        this.mydata.createCategory(this.category).subscribe(() => {
          this.messageService.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Tạo mới đơn vị hàng tính thành công',
          });
          this.loadData();
          this.hideDialog();
        });
      }
    }
  }

  deletecategory(category: Category) {
    this.confirmationService.confirm({
      message: 'Bạn có chắc chắn muốn xóa đơn vị hàng tính này?',
      icon: 'pi pi-exclamation-triangle',
      header: 'Xác nhận xóa',
      accept: () => {
        // Giả định mydata.deletecategory() tồn tại
        this.mydata.deleteCategory(category.id).subscribe(() => {
          this.messageService.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Xóa đơn vị hàng tính thành công',
          });
          this.loadData();
        });
      },
    });
  }

  deleteSelectedCategories() {
    this.confirmationService.confirm({
      message: 'Bạn có chắc chắn muốn xoá các đơn vị hàng tính đã chọn?',
      header: 'Xác nhận xoá',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        const deletes = this.selectedCategories.map((u) =>
          this.mydata.deleteCategory(u.id)
        );
        forkJoin(deletes).subscribe(() => {
          this.messageService.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Đã xoá các đơn vị hàng tính đã chọn',
          });
          this.selectedCategories = [];
          this.loadData();
        });
      },
    });
  }

  onGlobalFilter(event: Event, table: Table) {
    const input = (event.target as HTMLInputElement).value;
    table.filterGlobal(input, 'contains');
  }

  convertToLocalTime(utcDate: string | Date): Date {
    const date = new Date(utcDate);
    return new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
  }
}