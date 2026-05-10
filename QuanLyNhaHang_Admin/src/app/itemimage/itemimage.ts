import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Table } from 'primeng/table';
import { MyData } from '../my-data';

import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { FileUploadModule } from 'primeng/fileupload';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { RippleModule } from 'primeng/ripple';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Tag } from "primeng/tag";

@Component({
  selector: 'app-image',
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
    IconFieldModule,
    InputIconModule,
    RippleModule,
    Tag
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './itemimage.html',
  styleUrls: ['./itemimage.scss'],
})
export class ItemimageComponent {
  ImageDialog: boolean = false;
  images: any[] = [];
  image: any = { id: 0, name: '', description: '', data: '' };
  submitted: boolean = false;
  previewImage: string | null = null;

  @ViewChild('dt') dt!: Table;
  @ViewChild('fileUpload') fileUpload!: any;

  constructor(
    private mydata: MyData,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.mydata.getAllImages().subscribe((data) => {
      this.images = data;
      this.cd.markForCheck();
    });
  }

  openNew() {
    this.image = { id: 0, name: '', description: '', data: '' };
    this.previewImage = null;
    this.submitted = false;
    this.ImageDialog = true;
  }

  hideDialog() {
    this.ImageDialog = false;
    this.submitted = false;
    this.previewImage = null;
    if (this.fileUpload) {
      this.fileUpload.clear();
    }
  }

  onGlobalFilter(event: Event) {
    const input = event.target as HTMLInputElement;
    this.dt.filterGlobal(input.value, 'contains');
  }

  uploadImage(event: any) {
    this.submitted = true;

    if (!this.image.name?.trim()) {
      this.messageService.add({ 
        severity: 'error', 
        summary: 'Lỗi', 
        detail: 'Tên ảnh là bắt buộc' 
      });
      return;
    }

    if (!event.files || event.files.length === 0) {
      this.messageService.add({ 
        severity: 'error', 
        summary: 'Lỗi', 
        detail: 'Vui lòng chọn ảnh' 
      });
      return;
    }

    const file = event.files[0];
    
    // Kiểm tra kích thước file (tối đa 5MB)
    if (file.size > 5 * 1024 * 1024) {
      this.messageService.add({ 
        severity: 'error', 
        summary: 'Lỗi', 
        detail: 'Kích thước ảnh tối đa 5MB' 
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', this.image.name.trim());
    formData.append('description', this.image.description || '');

    this.mydata.createImage(formData).subscribe({
      next: () => {
        this.messageService.add({ 
          severity: 'success', 
          summary: 'Thành công', 
          detail: 'Upload ảnh thành công' 
        });
        this.loadData();
        this.hideDialog();
      },
      error: (err) => {
        console.error('Upload error:', err);
        let errorMessage = 'Upload ảnh thất bại';
        if (err.error?.message) {
          errorMessage += ': ' + err.error.message;
        } else if (err.message) {
          errorMessage += ': ' + err.message;
        }
        this.messageService.add({ 
          severity: 'error', 
          summary: 'Lỗi', 
          detail: errorMessage 
        });
      }
    });
  }

  deleteImage(image: any) {
    this.confirmationService.confirm({
      message: `Bạn có chắc chắn muốn xóa ảnh "${image.name}"?`,
      icon: 'pi pi-exclamation-triangle',
      header: 'Xác nhận xóa',
      acceptLabel: 'Có',
      rejectLabel: 'Không',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.mydata.deleteImage(image.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Thành công',
              detail: `Đã xóa ảnh "${image.name}"`
            });
            this.loadData();
          },
          error: (err) => {
            console.error('Delete error:', err);
            this.messageService.add({
              severity: 'error',
              summary: 'Lỗi',
              detail: 'Xóa ảnh thất bại'
            });
          }
        });
      }
    });
  }

  onFileSelect(event: any) {
    if (event.files && event.files[0]) {
      const file = event.files[0];
      const reader = new FileReader();
      
      reader.onload = (e: any) => {
        this.previewImage = e.target.result;
        this.cd.markForCheck();
      };
      
      reader.readAsDataURL(file);
    }
  }

  convertToLocalTime(utcDate: string | Date): Date {
    const date = new Date(utcDate);
    return new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
  }
}