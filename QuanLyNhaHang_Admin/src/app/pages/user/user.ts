import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { MyData } from '../../my-data';
import { User } from '../../../model/user.model';

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
import { Restaurant } from '../../../model/restaurant.model';
import { Role } from '../../../model/role.model';
import { AutoCompleteCompleteEvent, AutoCompleteModule } from 'primeng/autocomplete';

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
  selector: 'app-User',
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
    AutoCompleteModule,
  ],
  providers: [MessageService, ConfirmationService, MyData],
  templateUrl: './User.html',
  styleUrl: './User.scss',
})
export class UserComponent implements OnInit {
  UserDialog: boolean = false;
  Users!: User[];
  User: User = {
    id: 0,
    username: '',
    //password: '',
    created: new Date(),
    updated: new Date(),
    deleted: false,
    
  };
  selectedUsers!: User[];
  submitted: boolean = false;

  @ViewChild('dt') dt!: Table;

  cols!: Column[];
  exportColumns!: ExportColumn[];
  restaurants: Restaurant[] = [];
  roles:Role[]=[];
  selectedRestaurant:Restaurant | null = null;
  selectedRole:Role | null = null;
  filteredRestaurants: Restaurant[] = [];
  filteredRoles: Role[] = [];

  constructor(
    private mydata: MyData,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadData();
    this.loadRestaurants();
    this.loadRoles();
    this.cols = [
      { field: 'id', header: 'Mã' },
      { field: 'username', header: 'Tên' },
      { field: 'created', header: 'Ngày tạo' },
      { field: 'updated', header: 'Ngày cập nhật' },
    ];

    this.exportColumns = this.cols.map((col) => ({
      title: col.header,
      dataKey: col.field,
    }));
  }

  loadData() {
    this.mydata.getAllUsers().subscribe((data) => {
      this.Users = data;
      this.cd.markForCheck();
      console.log('Users loaded:', this.Users);
    });
  }
  loadRestaurants() {
    
    this.mydata.getAllRestaurants().subscribe((data) => {
      this.restaurants=data;
      console.log('Restaurants loaded:', data);
      this.cd.markForCheck();
    });
  }
  searchRestaurants(event: AutoCompleteCompleteEvent) {
    const query = event.query.toLowerCase();
    if (query.trim().length === 0) {
    this.filteredRestaurants = [...this.restaurants];
    } else {
    this.filteredRestaurants = this.restaurants.filter((restaurant) =>
      restaurant.name.toLowerCase().includes(query)
    );
    }
    console.log('Filtered Restaurants:', this.filteredRestaurants); // Kiểm tra dữ liệu
    this.cd.markForCheck();
  }
  loadRoles() {
    this.mydata.getAllRoles().subscribe((data) => {
      this.roles=data;
      console.log('Roles loaded:', data);
      this.cd.markForCheck();
    });
  }
  searchRoles(event: AutoCompleteCompleteEvent) {
    const query = event.query.toLowerCase();
    if (query.trim().length === 0) {
      this.filteredRoles = [...this.roles];
    } else {
      this.filteredRoles = this.roles.filter((role) =>
        role.name.toLowerCase().includes(query)
      );
    }
    console.log('Filtered role:', this.filteredRoles); // Kiểm tra dữ liệu
    this.cd.markForCheck();
  }


 
  openNew() {
    this.User = {
      id: 0,
      username: '',
      //password: '',
      created: new Date(),
      updated: new Date(),
      deleted: false,
    
    };
    
    this.submitted = false;
    this.UserDialog = true;
  }

  hideDialog() {
    this.UserDialog = false;
    this.submitted = false;
  }

  editUser(User: User) {
    this.User = { ...User };
    this.UserDialog = true;
  }

  saveUser() {
    console.log('Saving User:', this.User);
    console.log('Selected Restaurant:', this.selectedRestaurant);
    console.log('Selected Role:', this.selectedRole);
    this.submitted = true;
    if (this.User.username.trim() && this.selectedRestaurant && this.selectedRole) {
      this.User.restaurantId = this.selectedRestaurant.id;
      this.User.roleId = this.selectedRole.id;
      if (this.User.id) {
        // Giả định mydata.updateUser() tồn tại
        this.mydata.updateUser(this.User.id, this.User).subscribe(() => {
          this.messageService.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Cập nhật User hàng tính thành công',
          });
          this.loadData();
          this.hideDialog();
        });
      } else {
        // Giả định mydata.createUser() tồn tại
        this.mydata.createUser(this.User).subscribe(() => {
          this.messageService.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Tạo mới User hàng tính thành công',
          });
          this.loadData();
          this.hideDialog();
        });
      }
    }
  }

  deleteUser(User: User) {
    this.confirmationService.confirm({
      message: 'Bạn có chắc chắn muốn xóa User hàng tính này?',
      icon: 'pi pi-exclamation-triangle',
      header: 'Xác nhận xóa',
      accept: () => {
        // Giả định mydata.deleteUser() tồn tại
        this.mydata.deleteUser(User.id).subscribe(() => {
          this.messageService.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Xóa User hàng tính thành công',
          });
          this.loadData();
        });
      },
    });
  }

  deleteSelectedUsers() {
    this.confirmationService.confirm({
      message: 'Bạn có chắc chắn muốn xoá các User hàng tính đã chọn?',
      header: 'Xác nhận xoá',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        const deletes = this.selectedUsers.map((u) =>
          this.mydata.deleteUser(u.id)
        );
        forkJoin(deletes).subscribe(() => {
          this.messageService.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Đã xoá các User hàng tính đã chọn',
          });
          this.selectedUsers = [];
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