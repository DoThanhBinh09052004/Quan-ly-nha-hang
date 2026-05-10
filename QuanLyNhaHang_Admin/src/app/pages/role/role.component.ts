import { ChangeDetectorRef, Component, input, ViewChild } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { MyData } from '../../my-data';
import { Table, TableModule } from 'primeng/table';
import { Dialog } from 'primeng/dialog';
import { Ripple } from 'primeng/ripple';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Tag } from 'primeng/tag';
import { RadioButton } from 'primeng/radiobutton';
import { Rating } from 'primeng/rating';
import { InputNumber } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { FileUploadModule } from 'primeng/fileupload';
import { forkJoin } from 'rxjs';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { DatePipe, formatDate } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { Role } from '../../../model/role.model';
import { CommonModule } from '@angular/common';

// Định nghĩa interface cho cột trong bảng
interface Column {
  field: string;       // Tên trường dữ liệu
  header: string;      // Tiêu đề hiển thị
  customExportHeader?: string; // Tiêu đề tùy chỉnh khi xuất
  exportFunction?: (row: Role) => string; // Hàm tùy chỉnh để xuất dữ liệu
}

// Định nghĩa interface cho cột khi xuất dữ liệu
interface ExportColumn {
  title: string;      // Tiêu đề cột
  dataKey: string;    // Khóa dữ liệu
}

@Component({
  selector: 'app-Role',
  standalone: true,
  imports: [
    // Add all PrimeNG modules you're using in the template
    ToastModule,
    ToolbarModule,
    ButtonModule,
    FileUploadModule,
    // Add other modules you're using like Table, Dialog, etc.
    TableModule,
    Dialog,
    ConfirmDialog,
    IconField,
    InputIcon,
    FormsModule,
    InputText,
    CommonModule
    
  ],
  providers: [MessageService, ConfirmationService, MyData, Ripple], // Cung cấp các service cần thiết
  templateUrl: './role.html',
  styleUrl: './role.scss',
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

export class RoleComponent {
row: any;
formatDate(arg0: any,arg1: string,arg2: string) {
throw new Error('Method not implemented.');
}
  RoleDialog: boolean = false; // Biến điều khiển hiển thị dialog

  Roles!: Role[]; // Danh sách Role

  // Đối tượng Role mẫu
  Role: Role = {
    id: 0,
    name: '',
    description: '',
    created: new Date(),
    updated: new Date(),
    deleted: false,
  };
  onGlobalFilter(event: Event) {
    const input = event.target as HTMLInputElement;
    this.dt.filterGlobal(input.value, 'contains');
  }

  selectedRoles!: Role[]; // Danh sách Role được chọn

  submitted: boolean = false; // Biến kiểm tra form đã submit

  @ViewChild('dt') dt!: Table; // Tham chiếu đến component Table

  cols!: Column[]; // Danh sách cột trong bảng

  exportColumns!: ExportColumn[]; // Danh sách cột khi xuất dữ liệu

  constructor(
    private mydata: MyData, // Service xử lý dữ liệu
    private messageService: MessageService, // Service hiển thị thông báo
    private confirmationService: ConfirmationService, // Service xác nhận hành động
    private cd: ChangeDetectorRef // Service phát hiện thay đổi
  ) {}

  // Hàm xuất dữ liệu ra file CSV
  exportCSV() {
    this.dt.exportCSV();
  }

  ngOnInit() {
    this.loadData(); // Tải dữ liệu khi component khởi tạo
  }

  // Hàm tải dữ liệu mẫu
  loadData() {
    // Gọi API lấy danh sách Role
    this.mydata.getAllRoles().subscribe((data) => {
      this.Roles = data;
      this.cd.markForCheck(); // Đánh dấu kiểm tra thay đổi
    });

    // Thiết lập các cột cho bảng
    this.cols = [
      { field: 'id', header: 'ID', customExportHeader: 'Role ID' },
      { field: 'name', header: 'Tên' },
      { field: 'description', header: 'Chú thích' },
      { field: 'created', header: 'Ngày tạo' },
      { field: 'updated', header: 'Ngày cập nhật'},
    ];

    // Thiết lập các cột khi xuất dữ liệu
    this.exportColumns = this.cols.map((col) => ({
      title: col.header,
      dataKey: col.field,
    }));
  }

  // Mở dialog thêm mới Role
  openNew() {
    this.Role = {
      id: 0,
      name: '',
      description: '',
      created: new Date(),
      updated: new Date(),
      deleted: false,
    };
    this.submitted = false;
    this.RoleDialog = true;
  }

  // Ẩn dialog
  hideDialog() {
    this.RoleDialog = false;
    this.submitted = false;
  }

  // Mở dialog chỉnh sửa Role
  editRole(Role: Role) {
    this.Role = { ...Role }; // Sao chép dữ liệu Role
    this.RoleDialog = true;
  }

  // Lưu thông tin Role
  saveRole() {
    this.submitted = true;

    // Kiểm tra tên Role không rỗng
    if (this.Role.name.trim()) {
      if (this.Role.id) {
        // Cập nhật Role nếu có ID
        this.mydata.updateRole(this.Role.id, this.Role).subscribe(() => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Cập nhật Role thành công',
          });
          this.loadData(); // Tải lại dữ liệu
          this.hideDialog(); // Đóng dialog
        });
      } else {
        // Tạo mới Role nếu không có ID
        this.mydata.createRole(this.Role).subscribe(() => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Tạo mới Role thành công',
          });
          this.loadData(); // Tải lại dữ liệu
          this.hideDialog(); // Đóng dialog
        });
      }
    }
  }
  // Xóa Role
  deleteRole(Role: Role) {
    this.confirmationService.confirm({
      message: 'Bạn có chắc chắn muốn xóa Role này?',
      icon: 'pi pi-exclamation-triangle',
      header: 'Xác nhận xóa',
      accept: () => {
        this.mydata.deleteRole(Role.id).subscribe(() => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Xóa Role thành công',
          });
          this.loadData(); // Tải lại dữ liệu
        });
      },
    });
  } 
  deleteSelectedRoles(Roles: Role[]) {
    this.confirmationService.confirm({
      message: 'Bạn có chắc chắn muốn xoá các Role đã chọn?',
      header: 'Xác nhận xoá',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        // Gọi API xoá song song hoặc tuần tự tuỳ ý
        const deletes = this.selectedRoles.map(r =>
          this.mydata.deleteRole(r.id)
        );
        forkJoin(deletes).subscribe(() => {
          this.messageService.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Đã xoá Role',
          });
          this.selectedRoles = [];
          this.loadData();
        });
      },
    });
  }
}
