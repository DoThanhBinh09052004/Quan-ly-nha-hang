import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { MyData } from '../../my-data';
import { Order } from '../../../model/order.model';
import { Item } from '../../../model/item.model';
import { OrderItem } from '../../../model/orderitem.model';

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
import { AutoCompleteCompleteEvent, AutoCompleteModule } from 'primeng/autocomplete';
import { CardModule } from 'primeng/card';
import { BadgeModule } from 'primeng/badge';
import { GuestTable } from '../../../model/guesttable.model';

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
  selector: 'app-order',
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
    AutoCompleteModule, // Thay DropdownModule bằng AutoCompleteModule
    CardModule,
    BadgeModule
  ],
  providers: [MessageService, ConfirmationService, MyData],
  templateUrl: './order.html',
  styleUrls: ['./order.scss'],
})
export class OrderComponent implements OnInit {
  @ViewChild('dt') dt!: Table;

  orderDialog: boolean = false;
  addItemDialog: boolean = false;
  orders: Order[] = [];
  order: Order = this.createEmptyOrder();
  selectedOrders: Order[] = [];
  submitted: boolean = false;
  guesttables: GuestTable[] = [];
  selectedGuestTable: GuestTable | null = null;
  filterGuestTable: GuestTable[] = [];

  // Quản lý items với AutoComplete
  items: Item[] = [];
  filteredItems: Item[] = [];
  selectedItem: Item | null = null;
  searchItemText: string = '';
  itemQuantity: number = 1;
  orderItems: OrderItem[] = [];

  cols: Column[] = [];
  exportColumns: ExportColumn[] = [];

  constructor(
    private mydata: MyData,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadData();
    this.loadItems();
    this.loadAvailableGuestTables(); 
    this.cols = [
      { field: 'id', header: 'Mã' },
      { field: 'orderNumber', header: 'Số đơn hàng' },
      { field: 'totalPrice', header: 'Tổng tiền' },
      { field: 'paidAmount', header: 'Đã trả' },
      { field: 'created', header: 'Ngày tạo' },
      { field: 'updated', header: 'Ngày cập nhật' },
    ];

    this.exportColumns = this.cols.map((col) => ({
      title: col.header,
      dataKey: col.field,
    }));
  }
  exportCSV() {
    this.dt.exportCSV({ selectionOnly: false });
  }
  
  // Hoặc custom export data
  customExportCSV() {
    const exportData = this.orders.map(order => ({
      'Mã': order.id,
      'Số đơn hàng': order.orderNumber,
      'Tổng tiền': order.totalPrice,
      'Đã trả': order.paidAmount,
      'Ngày tạo': this.convertToLocalTime(order.created),
      'Ngày cập nhật': this.convertToLocalTime(order.updated)
    }));
  
    // Sử dụng thư viện export CSV
    import('xlsx').then(xlsx => {
      const worksheet = xlsx.utils.json_to_sheet(exportData);
      const workbook = { Sheets: { 'data': worksheet }, SheetNames: ['data'] };
      const excelBuffer = xlsx.write(workbook, { bookType: 'csv', type: 'array' });
      this.saveAsCSV(excelBuffer, 'danh_sach_don_hang.csv');
    });
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

  // Thêm method filter cho AutoComplete
  filterItems(event: any) {
    const query = event.query.toLowerCase();
    this.filteredItems = this.items.filter(item => 
      item.name.toLowerCase().includes(query) ||
      (item.description && item.description.toLowerCase().includes(query))
    );
  }
  

  onItemSelect(event: any) {
    this.selectedItem = event.value;
    this.itemQuantity = 1; // Reset quantity khi chọn món mới
  }

  onItemClear() {
    this.selectedItem = null;
    this.searchItemText = '';
  }

  loadData() {
    this.mydata.getAllOrder().subscribe({
        next: (data) => {
            this.orders = Array.isArray(data) ? data : [];
            this.cd.markForCheck();
            console.log('Orders loaded:', this.orders);
        },
        error: (err) => {
            console.error('Lỗi khi tải danh sách đơn hàng:', err);
            this.orders = [];
        }
    });
  }

  loadItems() {
    this.mydata.getAllItems().subscribe({
      next: (data) => {
        this.items = Array.isArray(data) ? data : [];
        this.filteredItems = [...this.items]; // Khởi tạo filteredItems
        console.log('Items loaded:', this.items);
      },
      error: (err) => {
        console.error('Lỗi khi tải danh sách món ăn:', err);
        this.items = [];
        this.filteredItems = [];
      }
    });
  }
  loadAvailableGuestTables() {
    this.mydata.getAllAvailableGuestTables().subscribe({
      next: (data) => {
        this.guesttables = Array.isArray(data) ? data : [];
        console.log('Available guest tables loaded:', this.guesttables);
      },
      error: (err) => {
        console.error('Lỗi khi tải danh sách bàn trống:', err);
        this.guesttables = [];
      }
    });
  }
  loadAllGuestTables() {
    this.mydata.getAllGuestTables().subscribe({
      next: (data) => {
        this.guesttables = Array.isArray(data) ? data : [];
        console.log('All guest tables loaded:', this.guesttables);
      },
      error: (err) => {
        console.error('Lỗi khi tải danh sách tất cả bàn:', err);
        this.guesttables = [];
      }
    });
  }
  searchGuestTable(event: any) {
    const query = event.query.toLowerCase();
    this.filterGuestTable = this.guesttables.filter(table => 
      table.name.toLowerCase().includes(query)
    );
  }

  createEmptyOrder(): Order {
    return {
      id: 0,
      orderNumber: this.generateOrderNumber(),
      description: '',
      totalPrice: 0,
      paidAmount: 0,
      created: new Date(),
      updated: new Date(),
      changeAmount: 0,
      orderItems: [],
      guestTableId: undefined
    };
  }

  generateOrderNumber(): string {
    return 'ORD-' + Date.now();
  }

  openNew() {
    this.order = this.createEmptyOrder();
    this.orderItems = [];
    this.submitted = false;
    this.orderDialog = true;
    this.selectedGuestTable = null;
  }

  hideDialog() {
    this.orderDialog = false;
    this.addItemDialog = false;
    this.submitted = false;
    this.selectedItem = null;
    this.searchItemText = '';
    this.itemQuantity = 1;
    // Reload available tables when closing dialog to reset for new orders
    this.loadAvailableGuestTables();
  }

  openAddItemDialog() {
    this.addItemDialog = true;
    this.selectedItem = null;
    this.searchItemText = '';
    this.itemQuantity = 1;
  }

  addItemToOrder() {
    if (this.selectedItem && this.itemQuantity > 0) {
      // Kiểm tra số lượng tồn kho
      if (this.selectedItem.quantity < this.itemQuantity) {
        this.messageService.add({ 
          severity: 'warn', 
          summary: 'Cảnh báo', 
          detail: `Số lượng tồn kho không đủ. Chỉ còn ${this.selectedItem.quantity} món` 
        });
        return;
      }

      const existingItem = this.orderItems.find(item => item.itemId === this.selectedItem!.id);
      
      if (existingItem) {
        const newQuantity = existingItem.quantity + this.itemQuantity;
        if (this.selectedItem.quantity < newQuantity) {
          this.messageService.add({ 
            severity: 'warn', 
            summary: 'Cảnh báo', 
            detail: `Số lượng vượt quá tồn kho. Tối đa có thể thêm: ${this.selectedItem.quantity - existingItem.quantity} món` 
          });
          return;
        }
        existingItem.quantity = newQuantity;
      } else {
        const newOrderItem: OrderItem = {
          id: 0,
          name: this.selectedItem.name,
          description: this.selectedItem.description,
          quantity: this.itemQuantity,
          salePrice: this.calculateSalePrice(this.selectedItem),
          itemId: this.selectedItem.id,
          orderId: this.order.id,
          created: new Date(),
          updated: new Date(),
          
          item: this.selectedItem
        };
        this.orderItems.push(newOrderItem);
      }

      this.calculateTotal();
      this.selectedItem = null;
      this.searchItemText = '';
      this.itemQuantity = 1;
      this.addItemDialog = false;
      
      this.messageService.add({ 
        severity: 'success', 
        summary: 'Thành công', 
        detail: 'Đã thêm món vào đơn hàng' 
      });
    }
  }

  calculateSalePrice(item: Item): number {
    return item.price - (item.price * (item.discount / 100));
  }

  removeOrderItem(index: number) {
    this.orderItems.splice(index, 1);
    this.calculateTotal();
  }

  updateQuantity(item: OrderItem, event: any) {
    if (item.item && item.item.quantity < event.value) {
      this.messageService.add({ 
        severity: 'warn', 
        summary: 'Cảnh báo', 
        detail: `Số lượng vượt quá tồn kho. Tối đa: ${item.item.quantity}` 
      });
      item.quantity = item.item.quantity;
    } else {
      item.quantity = event.value;
    }
    this.calculateTotal();
  }

  calculateTotal() {
    this.order.totalPrice = this.orderItems.reduce((total, item) => {
      return total + (item.quantity * item.salePrice);
    }, 0);
  }

  calculateChangeAmount() {
    this.order.changeAmount = this.order.paidAmount - this.order.totalPrice;
  }

  getItemTotal(item: OrderItem): number {
    return item.quantity * item.salePrice;
  }

 
  editOrder(order: Order) {
    this.order = { ...order };
    this.loadAllGuestTables();
    console.log("ORDER:", order);
    console.log("Order guestTableId:", order.guestTableId);
    console.log("All guest tables:", this.guesttables.map(x => x.id));
    this.mydata.getOrderItemsByOrderId(order.id).subscribe({
      next: (items) => {
        this.orderItems = items || [];
        this.calculateTotal();
        this.cd.markForCheck();
        this.selectedGuestTable =
        this.guesttables.find(t => t.id === order.guestTable?.id) || null;
        console.log('🟩 Selected table:', this.selectedGuestTable);

      },
      error: (err) => {
        console.error('Lỗi khi tải chi tiết đơn hàng:', err);
        this.orderItems = [];
      }
    });
    this.orderDialog = true;
  }
    

  

  saveOrder() {
    console.log('🟦 Saving order:', this.order);
    console.log('🟨 Order items:', this.orderItems);
    console.log('🟩 Selected table:', this.selectedGuestTable);
  
    this.submitted = true;
  
    console.log('🧩 Kiểm tra điều kiện:', {
      orderNumber: !!this.order.orderNumber?.trim(),
      hasItems: this.orderItems.length > 0,
      hasTable: !!this.selectedGuestTable
    });
    if (this.order.orderNumber?.trim() && this.orderItems.length > 0) {

      this.order.totalPrice = this.order.totalPrice
      this.order.guestTableId= this.selectedGuestTable?.id;
      if (this.order.id && this.order.id > 0) {
        const updateData = {
          ...this.order,
          orderItems: undefined, // Loại bỏ orderItems
          guestTableId: this.selectedGuestTable?.id
        };

        this.mydata.updateOrder(this.order.id, updateData).subscribe({
          next: (updatedOrder) => {
            this.messageService.add({
              severity: 'success',
              summary: 'Thành công',
              detail: 'Cập nhật đơn hàng thành công'
            });
            this.updateOrderItems(updatedOrder.id);
          },
          error: (err) => {
            this.handleError(err, 'Cập nhật đơn hàng thất bại');
          },
        });
      } else {
        // Tạo mới đơn hàng - FIXED
        const orderToCreate = {
          ...this.order,
          orderItems: [] // Gửi mảng rỗng, sẽ tạo order items riêng
        };
  
        this.mydata.createOrder(orderToCreate).subscribe({
          next: (newOrder) => {
            console.log('Order created successfully:', newOrder);
            this.messageService.add({ 
              severity: 'success', 
              summary: 'Thành công', 
              detail: 'Tạo mới đơn hàng thành công' 
            });
            
            // Đảm bảo có ID trước khi tạo order items
            if (newOrder && newOrder.id) {
              this.createOrderItems(newOrder.id);
            } else {
              console.error('Order ID is missing in response:', newOrder);
              this.messageService.add({
                severity: 'error',
                summary: 'Lỗi',
                detail: 'Không nhận được ID đơn hàng từ server'
              });
            }
          },
          error: (err) => {
            this.handleError(err, 'Tạo mới đơn hàng thất bại');
          },
        });
      }
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Lỗi',
        detail: 'Vui lòng nhập số đơn hàng và thêm ít nhất một món vào đơn hàng'
      });
    }
  }

  createOrderItems(orderId: number) {
    if (!orderId || orderId <= 0) {
      console.error('Invalid order ID:', orderId);
      this.messageService.add({
        severity: 'error',
        summary: 'Lỗi',
        detail: 'ID đơn hàng không hợp lệ'
      });
      return;
    }
  
    if (this.orderItems.length === 0) {
      console.log('No order items to create');
      this.loadData();
      this.hideDialog();
      return;
    }
  
    const orderItemRequests = this.orderItems.map(item => {
      const orderItem: Omit<OrderItem, 'id'> = {
        name: item.name,
        description: item.description || '',
        quantity: item.quantity,
        salePrice: item.salePrice,
        itemId: item.itemId,
        orderId: orderId,
        created: new Date(),
        updated: new Date()
      };
      console.log('Creating order item:', orderItem);
      return this.mydata.createOrderItem(orderItem);
    });
  
    forkJoin(orderItemRequests).subscribe({
      next: (results) => {
        console.log('All order items created successfully:', results);
        this.messageService.add({
          severity: 'success',
          summary: 'Thành công',
          detail: `Đã tạo ${results.length} món cho đơn hàng`
        });
        this.loadData();
        this.hideDialog();
      },
      error: (err) => {
        console.error('Error creating order items:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi',
          detail: 'Tạo chi tiết đơn hàng thất bại: ' + (err.error?.message || err.message)
        });
        // Vẫn load data và đóng dialog dù có lỗi
        this.loadData();
        this.hideDialog();
      }
    });
  }
  updateOrderItems(orderId: number) {
    this.mydata.deleteOrderItemsByOrderId(orderId).subscribe({
      next: () => {
        console.log('Old order items deleted, creating new ones...');
        this.createOrderItems(orderId);
      },
      error: (err) => {
        console.error('Error deleting old order items:', err);
        this.createOrderItems(orderId);
      }
    });
  }

  deleteOrder(order: Order) {
    this.confirmationService.confirm({
      message: 'Bạn có chắc chắn muốn xóa đơn hàng ' + order.orderNumber + '?',
      header: 'Xác nhận',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Có',
      rejectLabel: 'Không',
      accept: () => {
        this.mydata.deleteOrder(order.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Thành công', detail: 'Đã xóa đơn hàng' });
            this.loadData();
          },
          error: (err) => {
            this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Xóa đơn hàng thất bại' });
            console.error('Lỗi khi xóa đơn hàng:', err);
          },
        });
      },
    });
  }

  deleteSelectedOrders() {
    this.confirmationService.confirm({
      message: 'Bạn có chắc chắn muốn xoá các đơn hàng đã chọn?',
      header: 'Xác nhận xoá',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        const deletes = this.selectedOrders.map((order) =>
          this.mydata.deleteOrder(order.id)
        );
        forkJoin(deletes).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Thành công', detail: 'Đã xoá các đơn hàng đã chọn' });
            this.selectedOrders = [];
            this.loadData();
          },
          error: (err) => {
            this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Xóa các đơn hàng đã chọn thất bại' });
          }
        });
      },
    });
  }

  convertToLocalTime(utcDate: string | Date): Date {
    const date = new Date(utcDate);
    return new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
  }
  private handleError(err: any, defaultMessage: string) {
    let errorMessage = defaultMessage;
    
    // Xử lý lỗi parse JSON
    if (err instanceof Error && err.name === 'SyntaxError' && err.message.includes('JSON')) {
      errorMessage += ': Lỗi xử lý dữ liệu từ server';
      console.error('Lỗi parse JSON - Server có thể trả về HTML error page:', err);
      
      this.messageService.add({
        severity: 'error',
        summary: 'Lỗi Server',
        detail: errorMessage
      });
      return;
    }
    
    // Xử lý lỗi HTTP thông thường
    if (err.error) {
      // Nếu error là string (plain text từ server)
      if (typeof err.error === 'string') {
        errorMessage += ': ' + err.error;
      } 
      // Nếu error là object có message
      else if (err.error.message) {
        errorMessage += ': ' + err.error.message;
      } 
      // Nếu error là object có title
      else if (err.error.title) {
        errorMessage += ': ' + err.error.title;
      }
      
      // Hiển thị chi tiết lỗi validation từ server
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
    } 
    // Xử lý lỗi network hoặc lỗi khác
    else if (err.message) {
      errorMessage += ': ' + err.message;
    }
    
    // Thêm thông tin status code nếu có
    if (err.status) {
      errorMessage += ` (Mã lỗi: ${err.status})`;
    }
    
    this.messageService.add({
      severity: 'error',
      summary: 'Lỗi',
      detail: errorMessage
    });
    
    console.error(defaultMessage, err);
  }
  
 
}