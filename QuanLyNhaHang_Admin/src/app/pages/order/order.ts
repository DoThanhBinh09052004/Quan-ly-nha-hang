import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, forkJoin, Subject } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';

import { MyData } from '../../my-data';
import { CreateOrderRequest, Order, UpdateOrderRequest } from '../../../model/order.model';
import { Item } from '../../../model/item.model';
import { OrderItem } from '../../../model/orderitem.model';
import { Category } from '../../../model/category.model';
import { ItemPickerDialogComponent, ItemPickerSelection } from './item-picker-dialog/item-picker-dialog';

import { ConfirmationService, MessageService } from 'primeng/api';
import { Table, TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

import { GuestTable } from '../../../model/guesttable.model';
import { OrderListItem, OrderListQuery } from '../../../model/order-list.model';
import { PaymentStatus, VietQrPayment } from '../../../model/payment.model';

import { OrderToolbarComponent } from './components/order-toolbar/order-toolbar.component';
import { OrderListComponent } from './components/order-list/order-list.component';
import { OrderFormDialogComponent } from './components/order-form-dialog/order-form-dialog.component';
import { OrderQrDialogComponent } from './components/order-qr-dialog/order-qr-dialog.component';

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
    ToastModule,
    ConfirmDialogModule,
    ItemPickerDialogComponent,
    OrderToolbarComponent,
    OrderListComponent,
    OrderFormDialogComponent,
    OrderQrDialogComponent
  ],
  providers: [MessageService, ConfirmationService, MyData],
  templateUrl: './order.html',
  styleUrls: ['./order.scss'],
})
export class OrderComponent implements OnInit, OnDestroy {
  @ViewChild('dt') dt!: Table;

  constructor(
    private mydata: MyData,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private cd: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router,
  ) {}
  
  orderDialog: boolean = false;
  addItemDialog: boolean = false;
  orders: OrderListItem[] = [];
  order: Order = this.createEmptyOrder();
  selectedOrders: OrderListItem[] = [];
  submitted: boolean = false;
  guesttables: GuestTable[] = [];
  selectedGuestTable: GuestTable | null = null;
  filterGuestTable: GuestTable[] = [];

  // Quản lý items với AutoComplete
  items: Item[] = [];
  filteredItems: Item[] = [];
  categories: Category[] = [];
  selectedItem: Item | null = null;
  searchItemText: string = '';
  itemQuantity: number = 1;
  orderItems: OrderItem[] = [];
  recommendations: any[] = [];

  cols: Column[] = [];
  exportColumns: ExportColumn[] = [];
  guestPhone: string = '';
  guestName: string = '';
  guestPoints: number = 0;
  discount: number = 0;
  finalPrice: number = 0;
  first = 0;
  rows = 10;
  totalRecords = 0;
  todayRevenue = 0;
  loadingOrders = false;
  qrDialog = false;
  qrLoading = false;
  qrExpired = false;
  qrError = '';
  qrRemainingSeconds = 0;
  qrOrder: OrderListItem | null = null;
  qrPayment: VietQrPayment | null = null;
  private searchTerm = '';
  private sortField = 'created';
  private sortOrder: 'asc' | 'desc' = 'desc';
  private readonly searchTerms = new Subject<string>();
  private paymentPollingTimer?: ReturnType<typeof setInterval>;
  private paymentCountdownTimer?: ReturnType<typeof setInterval>;
  private paymentCompletionHandled = false;

  ngOnInit() {
    this.searchTerms.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe((search) => {
      this.searchTerm = search;
      this.first = 0;
      this.selectedOrders = [];
      this.loadData();
    });

    this.loadData();
    this.loadItems();
    this.loadCategories();
    this.loadAvailableGuestTables(); 
    this.openReservationOrderFromRoute();
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
  // Thêm vào class OrderComponent
pointsToUse: number = 0;
pointsDiscount: number = 0;
maxPoints: number = 0;
pointsAvailable: number = 0;
exchangeRate: number = 500; // 1 điểm = 500 VND
minPoints: number = 50; // Tối thiểu 50 điểm
usePointsButtonDisabled: boolean = false;

// Phương thức tính giảm giá và thành tiền
calculateDiscountAndFinal() {
  // Giảm giá 3% cho khách hàng có số điện thoại
  const phoneDiscount = this.guestName ? this.order.totalPrice * 0.03 : 0;
  // Giảm giá từ điểm tích lũy
  this.pointsDiscount = this.pointsToUse * this.exchangeRate;
  
  // Tổng giảm giá (không vượt quá tổng tiền)
  const maxDiscount = this.order.totalPrice;
  const totalDiscount = phoneDiscount + this.pointsDiscount;
  
  this.discount = Math.min(totalDiscount, maxDiscount);
  this.finalPrice = this.order.totalPrice - this.discount;
  
  // Cập nhật vào order để gửi lên server
  this.order.discount = this.discount;
  this.order.finalPrice = this.finalPrice;
  this.order.guestPhone = this.guestPhone;
  this.calculateChangeAmount();
}

// Phương thức tính số điểm tối đa có thể dùng
calculateMaxPoints() {
  if (!this.guestName || this.pointsAvailable === 0) {
    this.maxPoints = 0;
    return;
  }

  // Số điểm tối đa là số điểm khách hàng có
  let maxPointsFromBalance = this.pointsAvailable;
  
  // Số điểm tối đa dựa trên giá trị đơn hàng (sau khi trừ giảm giá 3%)
  const phoneDiscount = this.guestName ? this.order.totalPrice * 0.03 : 0;
  const remainingValue = this.order.totalPrice - phoneDiscount;
  let maxPointsFromValue = Math.floor(remainingValue / this.exchangeRate);
  
  // Làm tròn xuống bội số của 50
  maxPointsFromValue = Math.floor(maxPointsFromValue / 50) * 50;
  
  // Lấy giá trị nhỏ nhất
  this.maxPoints = Math.min(maxPointsFromBalance, maxPointsFromValue);
}

// Phương thức xử lý khi thay đổi số điểm muốn dùng
onPointsChange() {
  if (!this.pointsToUse || this.pointsToUse <= 0) {
    this.pointsToUse = 0;
    this.calculateDiscountAndFinal();
    this.updateUsePointsButtonState();
    return;
  }

  // Đảm bảo pointsToUse là bội số của 50 và trong khoảng cho phép
  if (this.pointsToUse % 50 !== 0) {
    // Làm tròn xuống bội số gần nhất của 50
    this.pointsToUse = Math.floor(this.pointsToUse / 50) * 50;
  }
  
  if (this.pointsToUse < this.minPoints) {
    this.pointsToUse = this.minPoints;
  }
  
  if (this.pointsToUse > this.maxPoints) {
    this.pointsToUse = this.maxPoints;
  }
  
  this.calculateDiscountAndFinal();
  this.updateUsePointsButtonState();
}

// Cập nhật trạng thái nút sử dụng điểm
updateUsePointsButtonState() {
  const isClearingAppliedPoints =
    !!this.order.id &&
    (this.order.usedPoint || 0) > 0 &&
    this.pointsToUse === 0;

  this.usePointsButtonDisabled =
    !isClearingAppliedPoints &&
    (this.pointsToUse < this.minPoints ||
      this.pointsToUse % 50 !== 0 ||
      this.pointsToUse > this.maxPoints ||
      this.pointsToUse > this.pointsAvailable);
}

// Phương thức sử dụng điểm
usePoints() {
  if (!this.order.id || this.order.id <= 0) {
    if (this.pointsToUse > 0 && !this.usePointsButtonDisabled) {
      this.calculateDiscountAndFinal();
      this.messageService.add({
        severity: 'info',
        summary: 'Đã chọn điểm',
        detail: `Điểm sẽ được áp dụng khi lưu đơn hàng (${this.pointsToUse} điểm).`
      });
    }
    return;
  }

  if (this.order.id && this.order.id > 0 &&
      (this.pointsToUse > 0 || (this.order.usedPoint || 0) > 0)) {
    this.usePointsButtonDisabled = true;
    
    this.mydata.usePoints(this.order.id, this.pointsToUse).subscribe({
      next: (response) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Thành công',
          detail: response.message || `Đã sử dụng ${this.pointsToUse} điểm để giảm giá`
        });
        
        // Cập nhật thông tin
        if (response.remainingPoints !== undefined) {
          this.guestPoints = response.remainingPoints;
        }
        
        if (response.order) {
          this.order.discount = response.order.discount;
          this.order.finalPrice = response.order.finalPrice;
          this.order.usedPoint = response.order.usedPoint || 0;
          this.discount = response.order.discount;
          this.finalPrice = response.order.finalPrice;
          this.pointsToUse = this.order.usedPoint || 0;
          this.pointsDiscount = this.pointsToUse * this.exchangeRate;
          this.pointsAvailable = this.guestPoints + this.pointsToUse;
        }
        
        // Cập nhật lại max points
        this.calculateMaxPoints();
        this.updateUsePointsButtonState();
        
        // Load lại dữ liệu đơn hàng
        this.loadData();
      },
      error: (err) => {
        console.error('Lỗi khi sử dụng điểm:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi',
          detail: err.error?.message || 'Không thể sử dụng điểm. Vui lòng thử lại.'
        });
        this.usePointsButtonDisabled = false;
      }
    });
  }
}

searchGuestByPhone() {
  if (!this.guestPhone || this.guestPhone.length < 10) {
    this.guestName = '';
    this.guestPoints = 0;
    this.pointsAvailable = 0;
    this.pointsToUse = 0;
    this.pointsDiscount = 0;
    this.calculateDiscountAndFinal();
    return;
  }

  this.mydata.getGuestByPhone(this.guestPhone).subscribe({
    next: (guest) => {
      this.guestName = guest.name;
      this.guestPoints = guest.points;
      const allocatedPoints =
        this.order.id > 0 && this.order.guestId === guest.id
          ? (this.order.usedPoint || 0)
          : 0;
      this.pointsAvailable = guest.points + allocatedPoints;
      this.order.guestId = guest.id;
      
      // Tính toán lại
      this.calculateDiscountAndFinal();
      this.calculateMaxPoints();
      this.updateUsePointsButtonState();
      
      this.messageService.add({
        severity: 'success',
        summary: 'Thành công',
        detail: `Đã tìm thấy khách hàng: ${guest.name} (${guest.points} điểm)`
      });
    },
    error: (err) => {
      this.guestName = '';
      this.guestPoints = 0;
      this.pointsAvailable = 0;
      this.order.guestId = undefined;
      
      // Tính toán lại
      this.calculateDiscountAndFinal();
      this.calculateMaxPoints();
      this.updateUsePointsButtonState();
      
      // Không hiển thị lỗi nếu không tìm thấy
      if (err.status !== 404) {
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi',
          detail: 'Không thể tìm kiếm khách hàng'
        });
      }
    }
  });
}

  

  getTodayRevenue(): number {
    if (!this.orders || this.orders.length === 0) return 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return this.orders
      .filter(order => {
        if (!order.created) return false;
        const orderDate = new Date(order.created);
        orderDate.setHours(0, 0, 0, 0);
        return orderDate.getTime() === today.getTime();
      })
      .reduce((total, order) => total + (order.finalPrice || 0), 0);
  }
  
  onGlobalFilter(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchTerms.next(input.value.trim());
  }

  ngOnDestroy() {
    this.stopPaymentTracking();
  }

  onLazyLoad(event: TableLazyLoadEvent) {
    this.first = event.first ?? 0;
    this.rows = event.rows ?? this.rows;
    this.sortField = typeof event.sortField === 'string' ? event.sortField : 'created';
    this.sortOrder = event.sortOrder === 1 ? 'asc' : 'desc';
    this.selectedOrders = [];
    this.loadData();
  }

  // Thêm method cho status severity - để hiển thị màu tag
  getStatusSeverity(statusName?: string): string {
    if (!statusName) return 'secondary';
    
    const status = statusName.toLowerCase();
    
    if (status.includes('đã thanh toán') || status.includes('hoàn thành') || status.includes('completed')) {
      return 'success';
    } else if (status.includes('đang xử lý') || status.includes('pending') || status.includes('chờ')) {
      return 'warning';
    } else if (status.includes('đã hủy') || status.includes('cancelled')) {
      return 'danger';
    } else if (status.includes('đang phục vụ') || status.includes('serving')) {
      return 'info';
    } else {
      return 'secondary';
    }
  }

  exportCSV() {
    this.dt.exportCSV({ selectionOnly: false });
  }
  
  customExportCSV() {
    const exportData = this.orders.map(order => ({
      'Mã': order.id,
      'Số đơn hàng': order.orderNumber,
      'Bàn': order.guestTable?.name || 'Mang về',
      'Tổng tiền': order.totalPrice,
      'Đã trả': order.paidAmount,
      'Tiền thừa': order.changeAmount,
      'Ngày tạo': order.created,
      'Ngày cập nhật': (order.updated)
    }));
  
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

  loadData(retryPreviousPage = true) {
    const query: OrderListQuery = {
      page: Math.floor(this.first / this.rows) + 1,
      pageSize: this.rows,
      search: this.searchTerm || undefined,
      sortField: this.sortField,
      sortOrder: this.sortOrder
    };
    this.loadingOrders = true;
    this.mydata.getOrders(query).subscribe({
        next: (data) => {
            this.totalRecords = data.totalRecords;
            this.todayRevenue = data.todayRevenue;

            if (retryPreviousPage && data.items.length === 0 && data.totalRecords > 0 && this.first > 0) {
              this.first = Math.max(0, this.first - this.rows);
              this.loadData(false);
              return;
            }

            this.orders = data.items;
            this.loadingOrders = false;
            this.cd.markForCheck();
        },
        error: (err) => {
            console.error('Lỗi khi tải danh sách đơn hàng:', err);
            this.orders = [];
            this.totalRecords = 0;
            this.todayRevenue = 0;
            this.loadingOrders = false;
            this.messageService.add({
              severity: 'error',
              summary: 'Lỗi',
              detail: 'Không thể tải danh sách đơn hàng'
            });
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
        this.filterGuestTable = [...this.guesttables]; // Cập nhật filterGuestTable
        console.log('Available guest tables loaded:', this.guesttables);
      },
      error: (err) => {
        console.error('Lỗi khi tải danh sách bàn trống:', err);
        this.guesttables = [];
        this.filterGuestTable = [];
      }
    });
  }
  
  loadAllGuestTables() {
    this.mydata.getAllGuestTables().subscribe({
      next: (data) => {
        this.guesttables = Array.isArray(data) ? data : [];
        this.filterGuestTable = [...this.guesttables]; // Cập nhật filterGuestTable
        console.log('All guest tables loaded:', this.guesttables);
      },
      error: (err) => {
        console.error('Lỗi khi tải danh sách tất cả bàn:', err);
        this.guesttables = [];
        this.filterGuestTable = [];
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
    this.guestPhone = '';
    this.guestName = '';
    this.guestPoints = 0;
    this.pointsAvailable = 0;
    this.pointsToUse = 0;
    this.pointsDiscount = 0;
    this.maxPoints = 0;
    this.discount = 0;
    this.finalPrice = 0;
    this.submitted = false;
    this.orderDialog = true;
    this.selectedGuestTable = null;
    this.loadAvailableGuestTables();
  }

  private openReservationOrderFromRoute() {
    const reservationId = Number(this.route.snapshot.queryParamMap.get('reservationId'));
    if (!reservationId || this.route.snapshot.queryParamMap.get('autoCreate') !== 'true') {
      return;
    }

    this.mydata.getReservationById(reservationId).subscribe({
      next: (reservation) => {
        this.order = this.createEmptyOrder();
        this.order.reservationId = reservation.id;
        this.order.guestTableId = reservation.guestTableId;
        this.order.guestId = reservation.guestId;
        this.order.partySize = reservation.partySize;
        this.order.guestPhone = reservation.phone;
        this.order.description = `Nhận bàn từ lịch hẹn #${reservation.id}.`;
        this.orderItems = [];
        this.guestPhone = reservation.phone;
        this.guestName = reservation.guestName;
        this.submitted = false;
        this.orderDialog = true;

        this.mydata.getGuestTableById(reservation.guestTableId).subscribe({
          next: (table) => {
            this.selectedGuestTable = table;
            this.guesttables = [table];
            this.filterGuestTable = [table];
            this.cd.markForCheck();
          },
          error: (error) => this.handleError(error, 'Không thể tải bàn của lịch hẹn'),
        });
      },
      error: (error) => this.handleError(error, 'Không thể tải lịch hẹn'),
    });
  }
  
  hideDialog() {
    this.orderDialog = false;
    this.addItemDialog = false;
    this.submitted = false;
    this.selectedItem = null;
    this.searchItemText = '';
    this.itemQuantity = 1;
    this.guestPhone = '';
    this.guestName = '';
    this.guestPoints = 0;
    this.pointsAvailable = 0;
    this.pointsToUse = 0;
    this.pointsDiscount = 0;
    this.maxPoints = 0;
    this.discount = 0;
    this.finalPrice = 0;
    this.loadAvailableGuestTables();
    if (this.route.snapshot.queryParamMap.has('reservationId')) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { reservationId: null, autoCreate: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
  }

  openAddItemDialog() {
    this.addItemDialog = true;
    this.selectedItem = null;
    this.searchItemText = '';
    this.itemQuantity = 1;
  }

  onItemPickerAdd(selection: ItemPickerSelection) {
    this.selectedItem = selection.item;
    this.itemQuantity = selection.quantity;
    this.addItemToOrder();
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
    
    this.calculateDiscountAndFinal();
    this.calculateMaxPoints();
    this.loadRecommendations();
  }

  loadRecommendations() {
    if (this.orderItems.length === 0) {
      this.recommendations = [];
      return;
    }

    const currentItemNames = this.orderItems.map(item => item.name);
    this.mydata.getRecommendations(currentItemNames).subscribe({
      next: (recs) => {
        // Lọc bỏ những món đã có trong order
        this.recommendations = recs.filter(rec => 
          !this.orderItems.some(item => item.name === rec.item)
        );
        console.log('Recommendations loaded from backend:', this.recommendations);
      },
      error: (err) => {
        console.error('Lỗi khi tải gợi ý món ăn:', err);
        this.recommendations = [];
      }
    });
  }

  addRecommendedItem(rec: any) {
    const itemToAdd = this.items.find(i => i.name === rec.item);
    if (itemToAdd) {
      this.selectedItem = itemToAdd;
      this.itemQuantity = 1;
      this.addItemToOrder();
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: 'Cảnh báo',
        detail: `Không tìm thấy thông tin món ăn: ${rec.item}`
      });
    }
  }

  calculateChangeAmount() {
    // Dùng giá trị đã lưu trên đơn sau khi mọi giảm giá được áp dụng.
    // Giá trị âm biểu thị số tiền khách vẫn cần thanh toán.
    this.order.changeAmount = (this.order.paidAmount || 0) - (this.order.finalPrice || 0);
  }
  
  getItemTotal(item: OrderItem): number {
    return item.quantity * item.salePrice;
  }

  loadCategories() {
    this.mydata.getAllCategories().subscribe({
      next: (data) => this.categories = Array.isArray(data) ? data : [],
      error: (err) => {
        console.error('Lỗi khi tải danh mục món ăn:', err);
        this.categories = [];
      }
    });
  }

  canPayByQr(order: OrderListItem): boolean {
    return (order.finalPrice || 0) > (order.paidAmount || 0);
  }

  openQrPayment(order: OrderListItem) {
    if (!this.canPayByQr(order)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Không thể thanh toán',
        detail: 'Đơn hàng này đã được thanh toán đủ.'
      });
      return;
    }

    this.stopPaymentTracking();
    this.qrOrder = order;
    this.qrPayment = null;
    this.qrExpired = false;
    this.qrError = '';
    this.qrRemainingSeconds = 0;
    this.paymentCompletionHandled = false;
    this.qrDialog = true;
    this.createQrPayment();
  }

  closeQrDialog() {
    this.stopPaymentTracking();
    this.qrDialog = false;
  }

  createQrPayment() {
    if (!this.qrOrder || this.qrLoading) {
      return;
    }

    this.stopPaymentTracking();
    this.qrLoading = true;
    this.qrExpired = false;
    this.qrError = '';
    this.qrPayment = null;

    this.mydata.createVietQr(this.qrOrder.id).subscribe({
      next: (payment) => {
        this.qrLoading = false;
        if (!this.qrDialog) {
          return;
        }

        this.qrPayment = payment;
        this.startPaymentTracking();
      },
      error: (err) => {
        this.qrLoading = false;
        if (!this.qrDialog) {
          return;
        }

        this.qrError = this.getPaymentErrorMessage(err, 'Không thể tạo mã QR thanh toán.');
        this.messageService.add({
          severity: 'error',
          summary: 'Tạo QR thất bại',
          detail: this.qrError
        });
      }
    });
  }

  retryPaymentStatus() {
    if (!this.qrPayment || this.qrLoading || this.qrExpired) {
      return;
    }

    this.qrError = '';
    this.checkPaymentStatus();
    this.startPaymentTracking();
  }

  private startPaymentTracking() {
    if (!this.qrPayment || this.qrExpired || this.paymentCompletionHandled) {
      return;
    }

    this.updateCountdown();
    this.paymentCountdownTimer = setInterval(() => this.updateCountdown(), 1000);
    this.paymentPollingTimer = setInterval(() => this.checkPaymentStatus(), 5000);
  }

  private updateCountdown() {
    if (!this.qrPayment?.expiresAt) {
      return;
    }

    const seconds = Math.max(0, Math.ceil((new Date(this.qrPayment.expiresAt).getTime() - Date.now()) / 1000));
    this.qrRemainingSeconds = Number.isFinite(seconds) ? seconds : 0;

    if (this.qrRemainingSeconds === 0) {
      this.markPaymentExpired();
    }
  }

  private checkPaymentStatus() {
    if (!this.qrPayment || this.qrExpired || this.paymentCompletionHandled) {
      return;
    }

    this.mydata.getPaymentStatus(this.qrPayment.paymentId).subscribe({
      next: (payment) => this.handlePaymentStatus(payment),
      error: (err) => {
        if (!this.qrDialog) {
          return;
        }

        this.stopPaymentTracking();
        this.qrError = this.getPaymentErrorMessage(err, 'Không thể kiểm tra trạng thái thanh toán.');
        this.messageService.add({
          severity: 'error',
          summary: 'Kiểm tra thanh toán thất bại',
          detail: this.qrError
        });
      }
    });
  }

  private handlePaymentStatus(payment: PaymentStatus) {
    if (!this.qrDialog) {
      return;
    }

    if (payment.status === 'CONFIRMED') {
      if (this.paymentCompletionHandled) {
        return;
      }

      this.paymentCompletionHandled = true;
      this.stopPaymentTracking();
      this.qrDialog = false;
      this.messageService.add({
        severity: 'success',
        summary: 'Thanh toán thành công',
        detail: 'Đơn hàng đã được xác nhận thanh toán qua QR.'
      });
      this.loadData();
      return;
    }

    if (payment.status === 'EXPIRED') {
      this.markPaymentExpired();
    }
  }

  private markPaymentExpired() {
    if (this.qrExpired || this.paymentCompletionHandled) {
      return;
    }

    this.qrExpired = true;
    this.stopPaymentTracking();
    this.messageService.add({
      severity: 'warn',
      summary: 'Mã QR đã hết hạn',
      detail: 'Vui lòng tạo mã QR mới để tiếp tục thanh toán.'
    });
  }

  private stopPaymentTracking() {
    if (this.paymentPollingTimer) {
      clearInterval(this.paymentPollingTimer);
      this.paymentPollingTimer = undefined;
    }

    if (this.paymentCountdownTimer) {
      clearInterval(this.paymentCountdownTimer);
      this.paymentCountdownTimer = undefined;
    }
  }

  formatQrRemainingTime(): string {
    const minutes = Math.floor(this.qrRemainingSeconds / 60);
    const seconds = this.qrRemainingSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  private getPaymentErrorMessage(err: any, fallback: string): string {
    if (typeof err?.error === 'string') {
      return err.error;
    }

    return err?.error?.message || err?.message || fallback;
  }

  editOrder(order: Order | OrderListItem) {
    if (!('description' in order)) {
      this.mydata.getOrderById(order.id).subscribe({
        next: (fullOrder) => this.editOrder(fullOrder),
        error: (err) => this.handleError(err, 'KhÃ´ng thá»ƒ táº£i chi tiáº¿t Ä‘Æ¡n hÃ ng')
      });
      return;
    }

    this.order = { ...order };
    this.loadAllGuestTables(); // Tải tất cả bàn khi edit
    
    // KHÔNG reset các biến điểm ở đây!
    // Thay vào đó, tính toán từ dữ liệu đơn hàng
    
    console.log("ORDER:", order);
    console.log("Order guestTableId:", order.guestTableId);
    console.log("Discount in order:", order.discount);
    console.log("FinalPrice in order:", order.finalPrice);
    
    if (order.guestPhone) {
      this.guestPhone = order.guestPhone;
      this.searchGuestByPhone();
    } else {
      this.guestPhone = '';
      this.guestName = '';
      this.guestPoints = 0;
      this.pointsAvailable = 0;
    }
    
    // Load thông tin giảm giá từ đơn hàng
    this.discount = order.discount || 0;
    this.finalPrice = order.finalPrice || order.totalPrice;
    this.pointsToUse = order.usedPoint || 0;
    this.pointsDiscount = this.pointsToUse * this.exchangeRate;
    
    this.mydata.getOrderItemsByOrderId(order.id).subscribe({
      next: (items) => {
        this.orderItems = items || [];
        this.calculateTotal();
        this.cd.markForCheck();
        
        // Tìm bàn tương ứng sau khi đã tải dữ liệu
        setTimeout(() => {
          this.selectedGuestTable = this.guesttables.find(t => t.id === order.guestTable?.id) || null;
          console.log('Selected table:', this.selectedGuestTable);
        }, 100);
      },
      error: (err) => {
        console.error('Lỗi khi tải chi tiết đơn hàng:', err);
        this.orderItems = [];
      }
    });
    this.orderDialog = true;
    // KHÔNG gọi calculateTotal() ở đây vì sẽ reset discount
  }
  saveOrder() {
    console.log(' Saving order:', this.order);
    console.log(' Order items:', this.orderItems);
    console.log(' Selected table:', this.selectedGuestTable);
  
    this.submitted = true;
  
    console.log(' Kiểm tra điều kiện:', {
      orderNumber: !!this.order.orderNumber?.trim(),
      hasItems: this.orderItems.length > 0,
    });
    
    // Validation
    if (!this.order.orderNumber?.trim()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Lỗi',
        detail: 'Vui lòng nhập số đơn hàng'
      });
      return;
    }

    if (this.orderItems.length === 0) {
      this.messageService.add({
        severity: 'error',
        summary: 'Lỗi',
        detail: 'Vui lòng thêm ít nhất một món vào đơn hàng'
      });
      return;
    }
    this.order.usedPoint = this.pointsToUse;
    // Cập nhật tổng tiền
    this.calculateTotal();

    this.order.guestTableId = this.selectedGuestTable?.id;
    
    if (this.order.id && this.order.id > 0) {
      const updateData: UpdateOrderRequest = {
        orderNumber: this.order.orderNumber,
        description: this.order.description,
        totalPrice: this.order.totalPrice,
        paidAmount: this.order.paidAmount,
        guestPhone: this.guestPhone || undefined,
        guestId: this.order.guestId,
        guestTableId: this.selectedGuestTable?.id,
        discount: this.order.discount,
        finalPrice: this.order.finalPrice,
        usedPoint: this.pointsToUse,
        // The API synchronizes these rows and the order total in one transaction.
        orderItems: this.orderItems.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description || '',
          quantity: item.quantity,
          salePrice: item.salePrice,
          itemId: item.itemId
        }))
      };

      this.mydata.updateOrder(this.order.id, updateData).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Cập nhật đơn hàng thành công'
          });
          this.loadData();
          this.hideDialog();
        },
        error: (err) => {
          this.handleError(err, 'Cập nhật đơn hàng thất bại');
        },
      });
    } else {
      // Backend tạo đơn cùng chi tiết món trong một transaction và yêu cầu danh sách này không rỗng.
      const { id, orderItems: _, ...orderData } = this.order;
      const orderToCreate: CreateOrderRequest = {
        ...orderData,
        pointsToUse: this.pointsToUse,
        orderItems: this.orderItems.map((item) => ({
          name: item.name,
          description: item.description || '',
          quantity: item.quantity,
          salePrice: item.salePrice,
          itemId: item.itemId
        }))
      };

      this.mydata.createOrder(orderToCreate).subscribe({
        next: (newOrder) => {
          console.log('Order created successfully:', newOrder);
          this.messageService.add({ 
            severity: 'success', 
            summary: 'Thành công', 
            detail: 'Tạo mới đơn hàng thành công' 
          });
          
          if (!newOrder?.id) {
            console.error('Order ID is missing in response:', newOrder);
            this.messageService.add({
              severity: 'error',
              summary: 'Lỗi',
              detail: 'Không nhận được ID đơn hàng từ server'
            });
            return;
          }

          this.loadData();
          this.hideDialog();
        },
        error: (err) => {
          this.handleError(err, 'Tạo mới đơn hàng thất bại');
        },
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

  deleteOrder(order: Order | OrderListItem) {
    this.confirmationService.confirm({
      message: 'Bạn có chắc chắn muốn xóa đơn hàng <strong>' + order.orderNumber + '</strong>?',
      header: 'Xác nhận',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Có',
      rejectLabel: 'Không',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.mydata.deleteOrder(order.id).subscribe({
          next: () => {
            this.messageService.add({ 
              severity: 'success', 
              summary: 'Thành công', 
              detail: `Đã xóa đơn hàng ${order.orderNumber}` 
            });
            this.loadData();
          },
          error: (err) => {
            this.messageService.add({ 
              severity: 'error', 
              summary: 'Lỗi', 
              detail: 'Xóa đơn hàng thất bại' 
            });
            console.error('Lỗi khi xóa đơn hàng:', err);
          },
        });
      },
    });
  }

  deleteSelectedOrders() {
    if (this.selectedOrders.length === 0) return;
    
    this.confirmationService.confirm({
      message: `Bạn có chắc chắn muốn xoá ${this.selectedOrders.length} đơn hàng đã chọn?`,
      header: 'Xác nhận xoá',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Có',
      rejectLabel: 'Không',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        const deletes = this.selectedOrders.map((order) =>
          this.mydata.deleteOrder(order.id)
        );
        forkJoin(deletes).subscribe({
          next: () => {
            this.messageService.add({ 
              severity: 'success', 
              summary: 'Thành công', 
              detail: `Đã xoá ${this.selectedOrders.length} đơn hàng đã chọn` 
            });
            this.selectedOrders = [];
            this.loadData();
          },
          error: (err) => {
            this.messageService.add({ 
              severity: 'error', 
              summary: 'Lỗi', 
              detail: 'Xóa các đơn hàng đã chọn thất bại' 
            });
          }
        });
      },
    });
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
