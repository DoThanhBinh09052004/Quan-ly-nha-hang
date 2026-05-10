import { ChangeDetectorRef, Component, input, ViewChild } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { MyData } from '../../my-data';
import { Table, TableModule } from 'primeng/table';
import { Dialog } from 'primeng/dialog';
import { Ripple } from 'primeng/ripple';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Restaurant } from '../../../model/restaurant.model';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { FileUploadModule } from 'primeng/fileupload';
import { forkJoin } from 'rxjs';

import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { CommonModule } from '@angular/common';
interface Column {
  field: string;
  header: string;
  customExportHeader?: string;
  exportFunction?: (row: Restaurant) => string;
}

interface ExportColumn {
  title: string;
  dataKey: string;
}

@Component({
  selector: 'app-restaurant',
  standalone: true,
  imports: [
    ToastModule,
    ToolbarModule,
    ButtonModule,
    FileUploadModule,
    TableModule,
    Dialog,
    ConfirmDialog,

    DatePipe,
    FormsModule,
    InputText,
    CommonModule,
    
  ],
  providers: [MessageService, ConfirmationService, MyData, Ripple],
  templateUrl: './restaurant.html',
  styleUrl: './restaurant.scss',
  styles: [
    `
      :host ::ng-deep .p-dialog .product-image {
        width: 150px;
        margin: 0 auto 2rem auto;
        display: block;
      }
    `,
  ],
})
export class RestaurantComponent {
  
  
  RestaurantDialog: boolean = false;
  Restaurants!: Restaurant[];
  Restaurant: Restaurant = {
    id: 0,
    name: '',
    address: '',
    phone: '',
    description: '',
    created: new Date(),
    updated: new Date(),
    deleted: false,
  };
  selectedRestaurants!: Restaurant[];
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

  

  // Khởi tạo dữ liệu khi component được tải
  ngOnInit() {
    this.loadData();
  }

  // Tải danh sách nhà hàng từ API
  loadData() {
    this.mydata.getAllRestaurants().subscribe((data) => {
      this.Restaurants = data;
      this.cd.detectChanges();
      console.log(this.Restaurants);
    });

    this.cols = [
      { field: 'id', header: 'ID', customExportHeader: 'Restaurant ID' },
      { field: 'name', header: 'Tên' },
      { field: 'address', header: 'Địa chỉ' },
      { field: 'phone', header: 'Số điện thoại' },
      { field: 'description', header: 'Chú thích' },
      { field: 'created', header: 'Ngày tạo' },
      { field: 'updated', header: 'Ngày cập nhật' },
    ];

    this.exportColumns = this.cols.map((col) => ({
      title: col.header,
      dataKey: col.field,
    }));
  }

  // Mở dialog để thêm mới nhà hàng
  openNew() {
    this.Restaurant = {
      id: 0,
      name: '',
      address: '',
      phone: '',
      description: '',
      created: new Date(),
      updated: new Date(),
      deleted: false,
    };
    this.submitted = false;
    this.RestaurantDialog = true;
  }

  // Đóng dialog
  hideDialog() {
    this.RestaurantDialog = false;
    this.submitted = false;
  }

  // Mở dialog để chỉnh sửa nhà hàng
  editRestaurant(Restaurant: Restaurant) {
    this.Restaurant = { ...Restaurant };
    this.RestaurantDialog = true;
  }

  // Lưu thông tin nhà hàng (thêm mới hoặc cập nhật)
  saveRestaurant() {
    this.submitted = true;

    if (this.Restaurant.name.trim()) {
      if (this.Restaurant.id) {
        this.mydata.updateRestaurant(this.Restaurant.id, this.Restaurant).subscribe(() => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Cập nhật nhà hàng thành công',
          });
          this.loadData();
          this.hideDialog();
        });
      } else {
        this.mydata.createRestaurant(this.Restaurant).subscribe(() => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Tạo mới nhà hàng thành công',
          });
          this.loadData();
          this.hideDialog();
        });
      }
    }
  }

  // Xóa một nhà hàng
  deleteRestaurant(Restaurant: Restaurant) {
    this.confirmationService.confirm({
      message: 'Bạn có chắc chắn muốn xóa nhà hàng này?',
      icon: 'pi pi-exclamation-triangle',
      header: 'Xác nhận xóa',
      accept: () => {
        this.mydata.deleteRestaurant(Restaurant.id).subscribe(() => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Xóa nhà hàng thành công',
          });
          this.loadData();
        });
      },
    });
  }

  // Xóa nhiều nhà hàng đã chọn
  deleteSelectedRestaurants() {
    this.confirmationService.confirm({
      message: 'Bạn có chắc chắn muốn xoá các nhà hàng đã chọn?',
      header: 'Xác nhận xoá',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        const deletes = this.selectedRestaurants.map((r) =>
          this.mydata.deleteRestaurant(r.id)
        );
        forkJoin(deletes).subscribe(() => {
          this.messageService.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Đã xoá nhà hàng',
          });
          this.selectedRestaurants = [];
          this.loadData();
        });
      },
    });
  }
  
  onGlobalFilter(event: Event) {
    const input = event.target as HTMLInputElement;
    this.dt.filterGlobal(input.value, 'contains');
  }
  // Chuyển đổi thời gian từ UTC sang giờ địa phương
  convertToLocalTime(utcTime: string): Date {
    const local = new Date(utcTime);
    local.setMinutes(local.getMinutes() + new Date().getTimezoneOffset() * -1);
    return local;
  }
  
}