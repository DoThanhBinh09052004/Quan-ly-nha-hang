import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { MyData } from '../../my-data';
import { Table, TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { RippleModule } from 'primeng/ripple';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { RadioButtonModule } from 'primeng/radiobutton';
import { RatingModule } from 'primeng/rating';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { FileUploadModule } from 'primeng/fileupload';
import { forkJoin } from 'rxjs';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { GuestTable } from '../../../model/guesttable.model';
import { CommonModule } from '@angular/common';
import { Restaurant } from '../../../model/restaurant.model';
import { AutoCompleteCompleteEvent, AutoCompleteModule } from 'primeng/autocomplete';
import { Status } from '../../../model/status.model';


interface Column {
  field: string;
  header: string;
  customExportHeader?: string;
  exportFunction?: (row: GuestTable) => string;
}

interface ExportColumn {
  title: string;
  dataKey: string;
}

@Component({
  selector: 'app-GuestTable',
  standalone: true,
  imports: [
    ToastModule,
    ToolbarModule,
    ButtonModule,
    FileUploadModule,
    TableModule,
    DialogModule,
    ConfirmDialogModule,
    TagModule,
    RadioButtonModule,
    RatingModule,
    InputNumberModule,
    IconFieldModule,
    RippleModule,
    InputIconModule,
    FormsModule,
    InputTextModule,
    CommonModule,
    AutoCompleteModule,
    
],
  providers: [MessageService, ConfirmationService, MyData],
  templateUrl: './guesttable.html',
  styleUrls: ['./guesttable.scss',],
})
 export class GuesttableComponent {
  
  onGlobalFilter(event: Event) {
    const input = event.target as HTMLInputElement;
    this.dt.filterGlobal(input.value, 'contains');
  }
getStatusSeverity(arg0: any): string|null|undefined {
throw new Error('Method not implemented.');
}
  GuestTableDialog: boolean = false;
    GuestTables!: GuestTable[];
    GuestTable: GuestTable = {
      id: 0,
      name: '',
      description: '',
      created: new Date(),
      updated: new Date(),
      deleted: false,
      restaurantId: undefined,
      statusId: undefined,
    };
    selectedGuestTables!: GuestTable[];
    submitted: boolean = false;
  
    @ViewChild('dt') dt!: Table;
  
    cols!: Column[];
    exportColumns!: ExportColumn[];
  
    Selectedrestaurant: Restaurant | undefined;
    restaurants: Restaurant[] = [];
    filteredRestaurants: Restaurant[] = [];
    filteredStatuses: Status[] = [];
    statuses: Status[] = []; // Danh sách trạng thái
    SelectedStatus: Status | undefined; // Trạng thái được chọn
  
    constructor(
      private mydata: MyData,
      private messageService: MessageService,
      private confirmationService: ConfirmationService,
      private cd: ChangeDetectorRef
    ) {}
    ngOnInit() {
      this.loadData();
      this.loadDataRestaurant();
      this.loadDataStatus();
    }
  
    loadData() {
      this.mydata.getAllGuestTables().subscribe((data) => {
        console.log('Dữ liệu trả về từ API:', data);
        this.GuestTables = data;
        this.cd.markForCheck();
        console.log('GuestTablees loaded:', this.GuestTables);
      });
  
      this.cols = [
        { field: 'id', header: 'ID', customExportHeader: 'GuestTable ID' },
        { field: 'name', header: 'Tên' },
        { field: 'description', header: 'Chú thích' },
        { field: 'created', header: 'Ngày tạo' },
        { field:'status',header:'Trạng thái'},
        { field: 'updated', header: 'Ngày cập nhật' },
      ];
  
      this.exportColumns = this.cols.map((col) => ({
        title: col.header,
        dataKey: col.field,
      }));
    }
  
    loadDataRestaurant() {
      this.mydata.getAllRestaurants().subscribe((data) => {
        this.restaurants = data;
        console.log('DỮ LIỆU GỐC CỦA NHÀ HÀNG:', this.restaurants); 
        this.cd.markForCheck();
        });
  
      this.cols = [
        { field: 'id', header: 'ID', customExportHeader: 'Restaurant ID' },
        { field: 'name', header: 'Tên' },
      ];
    }
  
    // Hàm này dùng để tìm kiếm nhà hàng theo tên khi người dùng nhập vào ô tìm kiếm (autocomplete).
    // Nó lọc danh sách nhà hàng dựa trên chuỗi truy vấn và cập nhật filteredRestaurants để hiển thị kết quả phù hợp.
    searchRestaurant(event: AutoCompleteCompleteEvent) {
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

   
    searchStatus(event: AutoCompleteCompleteEvent) {
      const query = event.query.toLowerCase();
      if (query.trim().length === 0) {
      this.filteredStatuses = [...this.statuses];
      } else {
      this.filteredStatuses = this.statuses.filter((status) =>
        status.name.toLowerCase().includes(query)
      );
      }
      console.log('Filtered Statuses:', this.filteredStatuses); // Kiểm tra dữ liệu
      this.cd.markForCheck();
    }
  
    loadDataStatus() {
      this.mydata.getAllStatuses().subscribe((data) => {
        this.statuses = data;
        console.log('Danh sách trạng thái:', this.statuses); // Kiểm tra dữ liệu trạng thái
        this.cd.markForCheck();
      });
    }
    onRestaurantChange(event: any) {
      console.log('Nhà hàng được chọn:', event); 
      this.Selectedrestaurant = event; 
    }
    onStatusChange(event: any) {
    console.log('Trạng thái được chọn:', event);
    this.SelectedStatus = event;
  }


    openNew() {
      this.GuestTable = {
        id: 0,
        name: '',
        description: '',
        created: new Date(),
        updated: new Date(),
        deleted: false,
      };
      this.submitted = false;
      this.GuestTableDialog = true;
    }
  
    hideDialog() {
      this.GuestTableDialog = false;
      this.submitted = false;
    }
  
    editGuestTable(GuestTable: GuestTable) {
      this.GuestTable = { ...GuestTable };
      this.GuestTableDialog = true;
    }
  
    saveGuestTable() {
      console.log('Dữ liệu gửi lên server:', this.GuestTable);
      console.log('Trạng thái được chọn:', this.SelectedStatus);
      console.log('Nhà hàng được chọn:', this.Selectedrestaurant);
  
      this.submitted = true;
  
      // Kiểm tra tính hợp lệ của dữ liệu trước khi gọi API
      if (this.GuestTable.name.trim() && this.SelectedStatus && this.Selectedrestaurant) {
        // Gán ID của Trạng thái và Nhà hàng vào đối tượng GuestTable
        this.GuestTable.statusId = this.SelectedStatus.id;
        this.GuestTable.restaurantId = this.Selectedrestaurant.id; // Thêm dòng này để gán RestaurantId
  
        if (this.GuestTable.id) {
          // Cập nhật
          this.mydata.updateGuestTable(this.GuestTable.id, this.GuestTable).subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Cập nhật bàn ăn thành công',
              });
              this.loadData();
              this.hideDialog();
            },
            error: (err) => {
              console.error('Lỗi khi cập nhật GuestTable:', err);
            },
          });
        } else {
          // Thêm mới
          this.mydata.createGuestTable(this.GuestTable).subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Tạo mới bàn ăn thành công',
              });
              this.loadData();
              this.hideDialog();
            },
            error: (err) => {
              console.error('Lỗi khi tạo mới GuestTable:', err);
            },
          });
        }
      } else {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Vui lòng nhập đầy đủ thông tin, chọn trạng thái và nhà hàng.',
        });
      }
    }
    deleteGuestTable(GuestTable: GuestTable) {
      this.confirmationService.confirm({
        message: 'Bạn có chắc chắn muốn xóa GuestTable này?',
        icon: 'pi pi-exclamation-triangle',
        header: 'Xác nhận xóa',
        accept: () => {
          this.mydata.deleteGuestTable(GuestTable.id).subscribe(() => {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Xóa GuestTable thành công',
            });
            this.loadData();
          });
        },
      });
    }
  
    deleteSelectedGuestTables(GuestTables: GuestTable[]) {
      this.confirmationService.confirm({
        message: 'Bạn có chắc chắn muốn xoá các GuestTable đã chọn?',
        header: 'Xác nhận xoá',
        icon: 'pi pi-exclamation-triangle',
        accept: () => {
          const deletes = this.selectedGuestTables.map((r) =>
            this.mydata.deleteGuestTable(r.id)
          );
          forkJoin(deletes).subscribe(() => {
            this.messageService.add({
              severity: 'success',
              summary: 'Thành công',
              detail: 'Đã xoá GuestTable',
            });
            this.selectedGuestTables = [];
            this.loadData();
          });
        },
      });
    }
    convertToLocalTime(utcTime: string): Date {
      const local = new Date(utcTime);
      local.setMinutes(local.getMinutes() + new Date().getTimezoneOffset() * -1);
      return local;
    }
    
 }