import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { MyData } from '../../my-data';
import { Table } from 'primeng/table';
import { Item } from '../../../model/item.model';
import { Unit } from '../../../model/unit.model';
import { Category } from '../../../model/category.model';
import { forkJoin } from 'rxjs';
import * as XLSX from 'xlsx';

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
import { Tag } from "primeng/tag";

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
    AutoCompleteModule,
    CardModule,
    BadgeModule,
    Tag
],
  providers: [MessageService, ConfirmationService]
})
export class ItemComponent {
  itemDialog: boolean = false;
  imageLibraryDialog: boolean = false;

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

  units: Unit[] = [];
  categories: Category[] = [];
  selectedUnit: Unit | undefined;
  filteredUnits: Unit[] = [];
  selectedCategory: Category | undefined | null;
  filteredCategries: Category[] = [];
  
  // Hình ảnh
  itemImages: ItemImage[] = [];
  selectedImages: ItemImage[] = [];
  filteredLibraryImages: ItemImage[] = [];
  imageSearchText: string = '';

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
  }

  loadItemImages() {
    this.mydata.getAllImages().subscribe(data => {
      this.itemImages = data;
      this.filteredLibraryImages = [...data];
      console.log("Images loaded:", data);
      this.cd.markForCheck();
    });
  }

  loadUnits() {
    this.mydata.getAllUnits().subscribe((data) => {
      this.units = data;
      this.filteredUnits = [...data];
      console.log('Dữ liệu Units:', this.units);
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
    console.log('Filtered Units:', this.filteredUnits);
    this.cd.markForCheck();
  }

  loadCategories() {
    this.mydata.getAllCategories().subscribe((data) => {
      this.categories = data;
      this.filteredCategries = [...data];
      console.log('Dữ liệu Categories:', this.categories);
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
    console.log('Filtered Categories:', this.filteredCategries);
    this.cd.markForCheck();
  }

  // ====================== CÁC HÀM MỚI CẦN THÊM ======================

  // 1. Tính tổng tồn kho
  getTotalStock(): number {
    if (!this.items || this.items.length === 0) return 0;
    return this.items.reduce((total, item) => total + (item.quantity || 0), 0);
  }

  // 2. Export CSV
  customExportCSV() {
    const exportData = this.items.map(item => ({
      'Mã': item.id,
      'Tên món': item.name,
      'Mô tả': item.description || '',
      'Giá gốc': item.price,
      'Giảm giá': `${item.discount}%`,
      'Giá khuyến mãi': item.price * (1 - item.discount / 100),
      'Số lượng': item.quantity,
      'Đơn vị': item.unit?.name || '',
      'Danh mục': item.category?.name || '',
      'Ngày tạo': new Date(item.created).toLocaleDateString('vi-VN'),
      'Ngày cập nhật': new Date(item.updated).toLocaleDateString('vi-VN')
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = { Sheets: { 'data': worksheet }, SheetNames: ['data'] };
    const excelBuffer = XLSX.write(workbook, { bookType: 'csv', type: 'array' });
    this.saveAsCSV(excelBuffer, 'danh_sach_mon_an.csv');
  }

  private saveAsCSV(buffer: any, fileName: string): void {
    const data: Blob = new Blob([buffer], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(data);
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  // 3. Filter table
  onGlobalFilter(event: Event) {
    const input = event.target as HTMLInputElement;
    this.dt.filterGlobal(input.value, 'contains');
  }

  onCategoryFilterSelect(event: any) {
    this.selectedCategory = event.value;
    if (this.selectedCategory && this.selectedCategory.id) {
      this.dt.filter(this.selectedCategory.id, 'category.id', 'equals');
    }
  }

  onCategoryFilterClear() {
    this.selectedCategory = null;
    this.dt.filter(null, 'category.id', 'equals');
  }

  // 4. Format currency
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0
    }).format(value);
  }

  // 5. Calculate sale price
  calculateSalePrice() {
    // Function triggered when discount changes
    this.cd.markForCheck();
  }

  // 6. Xem hình ảnh
  viewItemImages(item: Item) {
    if (item.itemImages && item.itemImages.length > 0) {
      // Có thể mở dialog xem hình ảnh lớn ở đây
      this.messageService.add({
        severity: 'info',
        summary: 'Hình ảnh món ăn',
        detail: `Món "${item.name}" có ${item.itemImages.length} hình ảnh`
      });
    }
  }

  // 7. Xem chi tiết món
  viewItemDetails(item: Item) {
    // Có thể mở dialog xem chi tiết riêng
    this.messageService.add({
      severity: 'info',
      summary: 'Thông tin món ăn',
      detail: `Xem chi tiết món "${item.name}"`
    });
    // Hoặc chuyển sang trang chi tiết
  }

  // 8. Xem trước khi lưu
  previewItem() {
    if (!this.item.name.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Cảnh báo',
        detail: 'Vui lòng nhập tên món trước khi xem trước'
      });
      return;
    }

    const previewData = {
      name: this.item.name,
      price: this.formatCurrency(this.item.price),
      discount: `${this.item.discount}%`,
      salePrice: this.formatCurrency(this.item.price * (1 - this.item.discount / 100)),
      quantity: this.item.quantity,
      description: this.item.description || 'Chưa có mô tả',
      unit: this.selectedUnit?.name || 'Chưa chọn',
      category: this.selectedCategory?.name || 'Chưa chọn',
      images: this.selectedImages.length
    };

    console.log('Preview data:', previewData);
    this.messageService.add({
      severity: 'info',
      summary: 'Xem trước',
      detail: `Tên: ${previewData.name} | Giá: ${previewData.salePrice} | Số lượng: ${previewData.quantity}`
    });
  }

  // 9. Mở thư viện ảnh
  openImageLibrary() {
    this.imageLibraryDialog = true;
    // Lọc ảnh theo search text
    this.filterLibraryImages();
  }

  // 10. Lọc ảnh trong thư viện
  filterLibraryImages() {
    if (!this.imageSearchText.trim()) {
      this.filteredLibraryImages = [...this.itemImages];
    } else {
      const query = this.imageSearchText.toLowerCase();
      this.filteredLibraryImages = this.itemImages.filter(img =>
        img.name.toLowerCase().includes(query) ||
        (img.description && img.description.toLowerCase().includes(query))
      );
    }
  }

  // 11. Kiểm tra ảnh đã được chọn chưa
  isImageSelected(img: ItemImage): boolean {
    return this.selectedImages.some(selected => selected.id === img.id);
  }

  // 12. Chọn ảnh từ thư viện
  selectImageFromLibrary(img: ItemImage) {
    if (!this.isImageSelected(img)) {
      this.selectedImages.push({ ...img });
    } else {
      // Bỏ chọn nếu đã chọn
      const index = this.selectedImages.findIndex(selected => selected.id === img.id);
      if (index > -1) {
        this.selectedImages.splice(index, 1);
      }
    }
    this.cd.markForCheck();
  }

  // 13. Đếm số ảnh đã chọn trong thư viện
  getSelectedLibraryImagesCount(): number {
    return this.selectedImages.filter(img => 
      this.itemImages.some(libImg => libImg.id === img.id)
    ).length;
  }

  // 14. Xác nhận chọn ảnh từ thư viện
  confirmLibrarySelection() {
    this.messageService.add({
      severity: 'success',
      summary: 'Thành công',
      detail: `Đã chọn ${this.getSelectedLibraryImagesCount()} ảnh từ thư viện`
    });
    this.imageLibraryDialog = false;
  }

  // 15. Mở form thêm mới
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

  // 16. Đóng dialog
  hideDialog() {
    this.itemDialog = false;
    this.imageLibraryDialog = false;
    this.submitted = false;
    this.imageSearchText = '';
  }

  // 17. Sửa món
  editItem(item: Item) {
    this.item = { ...item };
    this.selectedUnit = item.unit;
    this.selectedCategory = item.category;
    this.selectedImages = item.itemImages ? [...item.itemImages] : [];
    this.itemDialog = true;
  }

  // 18. Chọn ảnh upload
  onImageSelect(event: any) {
    const files = event.files;
    for (let file of files) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        this.selectedImages.push({
          id: 0,
          name: file.name,
          data: base64String,
          description: '',
          created: new Date(),
          updated: new Date(),
        });
        this.cd.markForCheck();
      };
      reader.readAsDataURL(file);
    }
  }

  // 19. Xóa ảnh
  removeImage(index: number) {
    this.selectedImages.splice(index, 1);
  }

  // 20. Lưu món (cần update từ hàm cũ)
  saveItem() {
    this.submitted = true;

    if (!this.item.name?.trim()) {
      this.messageService.add({ 
        severity: 'error', 
        summary: 'Lỗi', 
        detail: 'Tên món là bắt buộc' 
      });
      return;
    }

    // Validation price
    if (this.item.price <= 0) {
      this.messageService.add({ 
        severity: 'error', 
        summary: 'Lỗi', 
        detail: 'Giá phải lớn hơn 0' 
      });
      return;
    }

    // Validation discount
    if (this.item.discount < 0 || this.item.discount > 100) {
      this.messageService.add({ 
        severity: 'error', 
        summary: 'Lỗi', 
        detail: 'Giảm giá phải từ 0% đến 100%' 
      });
      return;
    }

    // Validation quantity
    if (this.item.quantity < 0) {
      this.messageService.add({ 
        severity: 'error', 
        summary: 'Lỗi', 
        detail: 'Số lượng không được âm' 
      });
      return;
    }

    // Tách ảnh cũ và ảnh mới
    const existingImageIds = this.selectedImages
      .filter(img => img.id > 0)
      .map(img => img.id);

    const newImages = this.selectedImages.filter(img => img.id === 0);

    const itemData: any = {
      name: this.item.name.trim(),
      description: this.item.description || null,
      price: Number(this.item.price),
      discount: Number(this.item.discount || 0),
      quantity: Number(this.item.quantity),
      unitId: this.selectedUnit?.id || null,
      categoryId: this.selectedCategory?.id || null,
      imageIds: existingImageIds
    };

    // Upload ảnh mới nếu có
    if (newImages.length > 0) {
      const uploadObs = newImages.map(img => {
        const formData = new FormData();

        // Chuyển base64 → Blob
        const byteString = atob(img.data);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
        const blob = new Blob([ab], { type: 'image/jpeg' });

        formData.append('File', blob, img.name);
        formData.append('Name', img.name);
        formData.append('Description', img.description || '');

        return this.mydata.createImage(formData);
      });

      forkJoin(uploadObs).subscribe({
        next: (createdImages: any[]) => {
          const newIds = createdImages.map(x => x.id);
          itemData.imageIds = [...existingImageIds, ...newIds];
          this.submitItem(itemData);
        },
        error: () => this.messageService.add({ 
          severity: 'error', 
          summary: 'Lỗi', 
          detail: 'Upload ảnh thất bại' 
        })
      });
    } else {
      this.submitItem(itemData);
    }
  }

  private submitItem(itemData: any) {
    if (this.item.id && this.item.id > 0) {
      itemData.id = this.item.id;
      this.mydata.updateItem(this.item.id, itemData).subscribe({
        next: () => {
          this.messageService.add({ 
            severity: 'success', 
            summary: 'Thành công', 
            detail: 'Cập nhật món thành công' 
          });
          this.loadData();
          this.hideDialog();
        },
        error: err => this.handleError(err, 'Cập nhật món thất bại')
      });
    } else {
      this.mydata.createItem(itemData).subscribe({
        next: () => {
          this.messageService.add({ 
            severity: 'success', 
            summary: 'Thành công', 
            detail: 'Tạo món mới thành công' 
          });
          this.loadData();
          this.hideDialog();
        },
        error: err => this.handleError(err, 'Tạo món mới thất bại')
      });
    }
  }

  private handleError(err: any, defaultMessage: string) {
    let errorMessage = defaultMessage;
    if (err.error) {
      if (typeof err.error === 'string') errorMessage += ': ' + err.error;
      else if (err.error.message) errorMessage += ': ' + err.error.message;
      else if (err.error.title) errorMessage += ': ' + err.error.title;

      if (err.error.errors) {
        const validationErrors: string[] = [];
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

  // 21. Xóa món
  deleteItem(item: Item) {
    this.confirmationService.confirm({
      message: `Bạn có chắc chắn muốn xóa món "${item.name}"?`,
      icon: 'pi pi-exclamation-triangle',
      header: 'Xác nhận xóa',
      acceptLabel: 'Có',
      rejectLabel: 'Không',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.mydata.deleteItem(item.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Thành công',
              detail: `Đã xóa món "${item.name}"`
            });
            this.loadData();
          },
          error: (err) => {
            console.error('Lỗi khi xóa món:', err);
            this.messageService.add({
              severity: 'error',
              summary: 'Lỗi',
              detail: 'Xóa món thất bại'
            });
          }
        });
      }
    });
  }

  // 22. Xóa nhiều món
  deleteSelectedItems() {
    if (!this.selectedItems || this.selectedItems.length === 0) return;

    this.confirmationService.confirm({
      message: `Bạn có chắc chắn muốn xóa ${this.selectedItems.length} món đã chọn?`,
      header: 'Xác nhận xóa',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Có',
      rejectLabel: 'Không',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        const deleteRequests = this.selectedItems.map(item => 
          this.mydata.deleteItem(item.id)
        );
        forkJoin(deleteRequests).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Thành công',
              detail: `Đã xóa ${this.selectedItems.length} món`
            });
            this.selectedItems = [];
            this.loadData();
          },
          error: (err) => {
            console.error('Lỗi khi xóa món:', err);
            this.messageService.add({
              severity: 'error',
              summary: 'Lỗi',
              detail: 'Xóa món thất bại'
            });
          }
        });
      }
    });
  }
}