import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { MyData } from '../../my-data';
import { Table } from 'primeng/table';
import { Item} from '../../../model/item.model';
import { Unit } from '../../../model/unit.model';
import { Category } from '../../../model/category.model';
import { forkJoin } from 'rxjs';

import { TableModule } from 'primeng/table';
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
import { AutoCompleteCompleteEvent, AutoCompleteModule } from 'primeng/autocomplete';
import { CardModule } from 'primeng/card';
import { BadgeModule } from 'primeng/badge';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ItemImage } from '../../../model/itemimage.model';

@Component({
  selector: 'app-item',
  standalone: true,
  templateUrl: './item.html',
  styleUrl: './item.scss',
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
    AutoCompleteModule, // Thay DropdownModule bằng AutoCompleteModule
    CardModule,
    BadgeModule
  ],
  providers: [MessageService, ConfirmationService]
})
export class ItemComponent {
  itemDialog: boolean = false;
  
  items!: Item[];
  item: Item = {
    id: 0,
    name: '',
    description: '',
    price: 0,
    discount: 0,
    quantity: 0,
    created: new Date(),
    updated: new Date(),
    deleted: false,
    unitId: undefined,
    categoryId: undefined,
    unit: undefined,
    category: undefined,
    itemImages: []
  };
  selectedItems!: Item[];
  submitted: boolean = false;

  @ViewChild('dt') dt!: Table;

  cols!: any[];
  exportColumns!: any[];

  units: Unit[] = [];//chứa toàn bộ unit
  categories: Category[] = [];
  selectedUnit: Unit | undefined;
  filteredUnits: Unit [] = [];
  selectedCategory: Category | undefined |null;
  filteredCategries: Category [] = [];
  itemImages: ItemImage[] = [];   
selectedImages: ItemImage[] = []; 
imageLibraryDialog = false;


  constructor(
    private mydata: MyData,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadData();
    this.loadUnits();
    this.loadCategories();
    this.loadItemImages();
  }

  loadData() {
    this.mydata.getAllItems().subscribe((data) => {
      console.log('Dữ liệu items:', data);
      this.items = data;
      this.cd.markForCheck();
    });
    

    this.cols = [
      { field: 'id', header: 'ID' },
      { field: 'name', header: 'Tên' },
      { field: 'description', header: 'Mô tả' },
      { field: 'price', header: 'Giá', exportFunction: (row: Item) => this.formatCurrency(row.price) },
      { field: 'discount', header: 'Giảm giá', exportFunction: (row: Item) => `${row.discount}%` },
      { field: 'quantity', header: 'Số lượng' },
      { field: 'unit', header: 'Đơn vị', exportFunction: (row: Item) => row.unit ? row.unit.name : '' },
      { field: 'category', header: 'Danh mục', exportFunction: (row: Item) => row.category ? row.category.name : '' },
      { field: 'created', header: 'Ngày tạo' },
      { field: 'updated', header: 'Ngày cập nhật' }
    ];

    this.exportColumns = this.cols.map((col) => ({
      title: col.header,
      dataKey: col.field
    }));
  }
  loadItemImages() {
    this.mydata.getAllImages().subscribe(data => {
      this.itemImages = data;
      console.log("Images:", data);
      this.cd.markForCheck();
    });
  }

  loadUnits() {
    this.mydata.getAllUnits().subscribe((data) => {
      this.units = data;
      console.log('Dữ liệu Units:', this.units); // ✅ In ra để kiểm tra
      this.cd.markForCheck();
    });
  }
  searchUnits(event: AutoCompleteCompleteEvent) {
    const query = event.query.toLowerCase();
    if (query.trim().length === 0) {
    this.filteredUnits = [...this.units];
    } else {
    this.filteredUnits = this.units.filter((unit) =>
      unit.name.toLowerCase().includes(query)
    );
    }
    console.log('Filtered Units:', this.filteredUnits); // Kiểm tra dữ liệu
    this.cd.markForCheck();
  }
  loadCategories() {
    this.mydata.getAllCategories().subscribe((data) => {
      this.categories = data;
      console.log('Dữ liệu Categories:', this.categories); // ✅ In ra để kiểm tra
      this.cd.markForCheck();
    });
  }
  searchCategory(event: AutoCompleteCompleteEvent) {
    const query = event.query.toLowerCase();
    if (query.trim().length === 0) {
      this.filteredCategries = [...this.categories];
    } else {
      this.filteredCategries = this.categories.filter((category) =>
        category.name.toLowerCase().includes(query)
      );
    }
    console.log('Filtered Categories:', this.filteredCategries); // Kiểm tra dữ liệu
    this.cd.markForCheck();
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(value);
  }

  openNew() {
    this.item = {
      id: 0,
      name: '',
      description: '',
      price: 0,
      discount: 0,
      quantity: 0,
      created: new Date(),
      updated: new Date(),
      deleted: false,
      unitId: undefined,
      categoryId: undefined,
      unit: undefined,
      category: undefined,
      itemImages: []
    };
    this.selectedUnit = undefined;
    this.selectedCategory = undefined;
    this.selectedImages = [];
    this.submitted = false;
    this.itemDialog = true;
  }

  hideDialog() {
    this.itemDialog = false;
    this.submitted = false;
  }

  editItem(item: Item) {
    this.item = { ...item };
    this.selectedUnit = item.unit;
    this.selectedCategory = item.category;
    this.selectedImages = item.itemImages ? [...item.itemImages] : [];
    this.itemDialog = true;
  }

  saveItem() {
    this.submitted = true;
  
    // Kiểm tra các trường bắt buộc
    if (!(this.item.name.trim() && this.item.price >= 0 && this.item.quantity >= 0)) {
      this.messageService.add({
        severity: 'error',
        summary: 'Lỗi',
        detail: 'Vui lòng nhập đầy đủ thông tin bắt buộc (Tên, Giá, Số lượng)'
      });
      return;
    }
  
    // Lấy tất cả ID ảnh đã chọn từ thư viện
    const imageIds = this.selectedImages.map(img => img.id);
  
    // Chuẩn bị dữ liệu item
    const itemData: any = {
      name: this.item.name.trim(),
      description: this.item.description || '',
      price: Number(this.item.price),
      discount: Number(this.item.discount || 0),
      quantity: Number(this.item.quantity),
      unitId: this.selectedUnit ? Number(this.selectedUnit.id) : null,
      categoryId: this.selectedCategory ? Number(this.selectedCategory.id) : null,
      imageIds: imageIds
    };
  
    if (this.item.id && this.item.id > 0) {
      // Cập nhật item
      itemData.id = this.item.id;
      itemData.updated = new Date();
  
      this.mydata.updateItem(this.item.id, itemData).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Cập nhật item thành công'
          });
          this.loadData();
          this.hideDialog();
        },
        error: err => this.handleError(err, 'Cập nhật item thất bại')
      });
  
    } else {
      // Tạo mới item
      this.mydata.createItem(itemData).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Tạo mới item thành công'
          });
          this.loadData();
          this.hideDialog();
        },
        error: err => this.handleError(err, 'Tạo mới item thất bại')
      });
    }
  }
  
  
  private handleError(err: any, defaultMessage: string) {
    let errorMessage = defaultMessage;
    
    if (err.error) {
      if (typeof err.error === 'string') {
        errorMessage += ': ' + err.error;
      } else if (err.error.message) {
        errorMessage += ': ' + err.error.message;
      } else if (err.error.title) {
        errorMessage += ': ' + err.error.title;
      }
      
      // Hiển thị chi tiết lỗi từ server
      if (err.error.errors) {
        const validationErrors = [];
        for (const key in err.error.errors) {
          if (err.error.errors.hasOwnProperty(key)) {
            validationErrors.push(...err.error.errors[key]);
          }
        }
        if (validationErrors.length > 0) {
          errorMessage += ': ' + validationErrors.join(', ');
        }
      }
    } else if (err.message) {
      errorMessage += ': ' + err.message;
    }
    
    this.messageService.add({
      severity: 'error',
      summary: 'Lỗi',
      detail: errorMessage
    });
  }

  deleteItem(item: Item) {
    this.confirmationService.confirm({
      message: `Bạn có chắc chắn muốn xóa item "${item.name}"?`,
      icon: 'pi pi-exclamation-triangle',
      header: 'Xác nhận xóa',
      accept: () => {
        this.mydata.deleteItem(item.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Thành công',
              detail: 'Xóa item thành công'
            });
            this.loadData();
          },
          error: (err) => {
            console.error('Lỗi khi xóa item:', err);
            this.messageService.add({
              severity: 'error',
              summary: 'Lỗi',
              detail: 'Xóa item thất bại'
            });
          }
        });
      }
    });
  }

  deleteSelectedItems() {
    if (!this.selectedItems || this.selectedItems.length === 0) return;

    this.confirmationService.confirm({
      message: `Bạn có chắc chắn muốn xóa ${this.selectedItems.length} item đã chọn?`,
      header: 'Xác nhận xóa',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        const deleteRequests = this.selectedItems.map(item => 
          this.mydata.deleteItem(item.id)
        );
        
        forkJoin(deleteRequests).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Thành công',
              detail: `Đã xóa ${this.selectedItems.length} item`
            });
            this.selectedItems = [];
            this.loadData();
          },
          error: (err) => {
            console.error('Lỗi khi xóa items:', err);
            this.messageService.add({
              severity: 'error',
              summary: 'Lỗi',
              detail: 'Xóa items thất bại'
            });
          }
        });
      }
    });
  }

  onGlobalFilter(event: Event) {
    const input = event.target as HTMLInputElement;
    this.dt.filterGlobal(input.value, 'contains');
  }
    // Xử lý khi chọn category từ filter
    onCategoryFilterSelect(event: any) {
      this.selectedCategory = event.value;
      
      if (this.selectedCategory && this.selectedCategory.id) {
        // Áp dụng filter theo category id
        this.dt.filter(this.selectedCategory.id, 'category.id', 'equals');
      }
    }
  
    // Xử lý khi xóa filter
    onCategoryFilterClear() {
      this.selectedCategory = null;
      this.dt.filter(null, 'category.id', 'equals');
    }
    onImageSelect(event: any) {
      const files = event.files;
  
      for (let file of files) {
          const reader = new FileReader();
          reader.onload = () => {
              this.selectedImages.push({
                  id: 0,
                  name: file.name,
                  data: reader.result as string,
                  description: '',
                  created: new Date(),
                  updated: new Date(),
              });
          };
          reader.readAsDataURL(file);
      }
  }
  
  
  // Xóa ảnh
  removeImage(index: number) {
      this.selectedImages.splice(index, 1);
  }
  openImageLibrary() {
    this.imageLibraryDialog = true;
  }
  
  selectImageFromLibrary(img: ItemImage) {
    this.selectedImages = [img]; // nếu muốn chọn nhiều thì đổi thành push
    this.imageLibraryDialog = false;
  }
  
  
}