import { Injectable } from "@angular/core";
import { environment } from "../environments/environment";
import { HttpClient, HttpHeaders, HttpParams } from "@angular/common/http";
import { catchError, map, Observable, tap, throwError } from "rxjs";
import { Restaurant } from "../model/restaurant.model";
import { Role } from "../model/role.model";
import { Status } from "../model/status.model";
import { GuestTable } from "../model/guesttable.model";
import { CreateOrderRequest, Order, UpdateOrderRequest } from "../model/order.model";
import { OrderListQuery, OrderListResponse } from "../model/order-list.model";
import { Item } from "../model/item.model";
import { OrderItem } from "../model/orderitem.model";
import { Unit } from "../model/unit.model";
import { Category } from "../model/category.model";
import { User } from "../model/user.model";
import { Guest } from "../model/guest.model";
import {
  AiIngredientDailyForecastRow,
  AiIngredientRestockRow,
  CreateIngredientBatchRequest,
  CreateIngredientRequest,
  Ingredient,
  IngredientBatch,
  UpdateIngredientBatchRequest,
  UpdateIngredientRequest,
} from "../model/ingredient.model";
import { Recipe } from "../model/recipe.model";
import { PaymentStatus, VietQrPayment } from "../model/payment.model";
import { BusinessChatRequest, BusinessChatResponse } from "../model/business-chat.model";
import { Reservation, ReservationRequest, ReservationTableQuery } from "../model/reservation.model";
import { BusinessOverview, GrossProfitMarginReport, NetProfitReport, PayrollReport } from "../model/revenue.model";
import { Expense, ExpenseCategory, ExpenseRequest } from "../model/expense.model";
import { KitchenDashboard, KitchenOrderItem, UpdateKitchenItemStatusRequest } from "../model/kitchen.model";
import { WorkShift } from '../model/workshift.model';


export interface AiCustomerSegmentResponse {
  guestId: number;
  cluster: number;
  clusterName: string;
  clusterDescription: string;
  clusterTraits: string[];
  guestProfileName: string;
  guestProfileDescription: string;
  guestProfileTraits: string[];
  clusterFeatures: Record<string, number>;
  behaviorLabel: string;
  behaviorDescription: string;
  behaviorTraits: string[];
  features: Record<string, number>;
}

interface AiCustomerSegmentApiResponse {
  guest_id: number;
  cluster: number;
  cluster_name: string;
  cluster_description: string;
  cluster_traits: string[];
  guest_profile_name: string;
  guest_profile_description: string;
  guest_profile_traits: string[];
  cluster_features: Record<string, number>;
  behavior_label: string;
  behavior_description: string;
  behavior_traits: string[];
  features: Record<string, number>;
}

@Injectable({
  providedIn: 'root'
})
export class MyData {
  private REST_API_SERVER = environment.api;
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    })
  };

  constructor(private httpClient: HttpClient) { }

  // ===== VAI TRÒ =====
  public getAllRoles(): Observable<Role[]> {
    const url = `${this.REST_API_SERVER}/role`;
    return this.httpClient.get<Role[]>(url, this.httpOptions);
  }
  public createRole(role: Omit<Role, 'id'>): Observable<Role> {
    const url = `${this.REST_API_SERVER}/role`;
    return this.httpClient.post<Role>(url, role, this.httpOptions);
  }
  public updateRole(id: number, role: Partial<Role>): Observable<Role> {
    const url = `${this.REST_API_SERVER}/role/${id}`;
    return this.httpClient.put<Role>(url, role, this.httpOptions);
  }
  public deleteRole(id: number): Observable<void> {
    const url = `${this.REST_API_SERVER}/role/${id}`;
    return this.httpClient.delete<void>(url, this.httpOptions);
  }

  // ===== TRẠNG THÁI =====
  public getAllStatuses(): Observable<Status[]> {
    const url = `${this.REST_API_SERVER}/status`;
    return this.httpClient.get<Status[]>(url, this.httpOptions);
  }
  public createStatus(status: Omit<Status, 'id'>): Observable<Status> {
    const url = `${this.REST_API_SERVER}/status`;
    return this.httpClient.post<Status>(url, status, this.httpOptions);
  }
  public updateStatus(id: number, status: Partial<Status>): Observable<Status> {
    const url = `${this.REST_API_SERVER}/status/${id}`;
    return this.httpClient.put<Status>(url, status, this.httpOptions);
  }
  public deleteStatus(id: number): Observable<void> {
    const url = `${this.REST_API_SERVER}/status/${id}`;
    return this.httpClient.delete<void>(url, this.httpOptions);
  }

  // ===== BÀN KHÁCH (GUEST TABLE) =====
  public getAllGuestTables(): Observable<GuestTable[]> {
    const url = `${this.REST_API_SERVER}/guesttable`;
    return this.httpClient.get<GuestTable[]>(url, this.httpOptions);
  }
  public getAllAvailableGuestTables(): Observable<GuestTable[]> {
    const url = `${this.REST_API_SERVER}/guesttable/available`;
    return this.httpClient.get<GuestTable[]>(url, this.httpOptions);
  }
  public createGuestTable(guestTable: Omit<GuestTable, 'id'>): Observable<GuestTable> {
    const url = `${this.REST_API_SERVER}/GuestTable`;
    return this.httpClient.post<GuestTable>(url, guestTable, this.httpOptions);
  }
  public updateGuestTable(id: number, guestTable: Partial<GuestTable>): Observable<GuestTable> {
    const url = `${this.REST_API_SERVER}/GuestTable/${id}`;
    return this.httpClient.put<GuestTable>(url, guestTable, this.httpOptions);
  }
  public deleteGuestTable(id: number): Observable<void> {
    const url = `${this.REST_API_SERVER}/GuestTable/${id}`;
    return this.httpClient.delete<void>(url, this.httpOptions);
  }
  public getGuestTableById(id: number): Observable<GuestTable> {
    const url = `${this.REST_API_SERVER}/guesttable/${id}`;
    return this.httpClient.get<GuestTable>(url, this.httpOptions);
  }
  public getGuestTablesByRestaurantId(restaurantId: number): Observable<GuestTable[]> {
    const url = `${this.REST_API_SERVER}/guesttable/restaurant/${restaurantId}`;
    return this.httpClient.get<GuestTable[]>(url, this.httpOptions);
  }

  // ===== LỊCH ĐẶT BÀN =====
  public getReservations(date?: string, tableId?: number): Observable<Reservation[]> {
    const url = `${this.REST_API_SERVER}/reservation`;
    let params = new HttpParams();
    if (date) params = params.set('date', date);
    if (tableId) params = params.set('tableId', tableId);
    return this.httpClient.get<Reservation[]>(url, { ...this.httpOptions, params });
  }

  public getReservationById(id: number): Observable<Reservation> {
    return this.httpClient.get<Reservation>(`${this.REST_API_SERVER}/reservation/${id}`, this.httpOptions);
  }

  public getReservationAvailableTables(query: ReservationTableQuery): Observable<GuestTable[]> {
    const url = `${this.REST_API_SERVER}/reservation/available-tables`;
    let params = new HttpParams()
      .set('start', query.start)
      .set('durationMinutes', query.durationMinutes)
      .set('partySize', query.partySize);
    if (query.excludedReservationId) {
      params = params.set('excludedReservationId', query.excludedReservationId);
    }
    return this.httpClient.get<GuestTable[]>(url, { ...this.httpOptions, params });
  }

  public createReservation(reservation: ReservationRequest): Observable<Reservation> {
    return this.httpClient.post<Reservation>(`${this.REST_API_SERVER}/reservation`, reservation, this.httpOptions);
  }

  public updateReservation(id: number, reservation: ReservationRequest): Observable<Reservation> {
    return this.httpClient.put<Reservation>(`${this.REST_API_SERVER}/reservation/${id}`, reservation, this.httpOptions);
  }

  public confirmReservation(id: number): Observable<Reservation> {
    return this.httpClient.put<Reservation>(`${this.REST_API_SERVER}/reservation/${id}/confirm`, {}, this.httpOptions);
  }

  public cancelReservation(id: number): Observable<Reservation> {
    return this.httpClient.put<Reservation>(`${this.REST_API_SERVER}/reservation/${id}/cancel`, {}, this.httpOptions);
  }

  public markReservationNoShow(id: number): Observable<Reservation> {
    return this.httpClient.put<Reservation>(`${this.REST_API_SERVER}/reservation/${id}/no-show`, {}, this.httpOptions);
  }

  // ===== ĐƠN HÀNG (ORDER) =====
  public getOrders(query: OrderListQuery): Observable<OrderListResponse> {
    const url = `${this.REST_API_SERVER}/order`;
    let params = new HttpParams()
      .set('page', query.page)
      .set('pageSize', query.pageSize);

    if (query.search?.trim()) {
      params = params.set('search', query.search.trim());
    }

    if (query.sortField) {
      params = params.set('sortField', query.sortField);
    }

    if (query.sortOrder) {
      params = params.set('sortOrder', query.sortOrder);
    }

    return this.httpClient.get<OrderListResponse>(url, { ...this.httpOptions, params });
  }
  public getOrderById(id: number): Observable<Order> {
    const url = `${this.REST_API_SERVER}/order/${id}`;
    return this.httpClient.get<Order>(url, this.httpOptions);
  }
  public createOrder(order: CreateOrderRequest): Observable<Order> {
    const url = `${this.REST_API_SERVER}/order`;
    return this.httpClient.post<Order>(url, order, this.httpOptions);
  }
  public updateOrder(id: number, order: UpdateOrderRequest): Observable<Order> {
    const url = `${this.REST_API_SERVER}/order/${id}`;
    return this.httpClient.put<Order>(url, order, this.httpOptions);
  }
  public deleteOrder(id: number): Observable<void> {
    const url = `${this.REST_API_SERVER}/order/${id}`;
    return this.httpClient.delete<void>(url, this.httpOptions);
  }
  public getOrdersByTableId(tableId: number): Observable<Order[]> {
    const url = `${this.REST_API_SERVER}/order/table/${tableId}`;
    return this.httpClient.get<Order[]>(url, this.httpOptions);
  }
  public getOrdersByStatus(status: string): Observable<Order[]> {
    const url = `${this.REST_API_SERVER}/order/status/${status}`;
    return this.httpClient.get<Order[]>(url, this.httpOptions);
  }
  public payOrder(orderId: number, paidAmount: number): Observable<Order> {
    const url = `${this.REST_API_SERVER}/order/${orderId}/pay`;
    return this.httpClient.put<Order>(url, { paidAmount }, this.httpOptions);
  }
  public voidOrder(orderId: number): Observable<Order> {
    const url = `${this.REST_API_SERVER}/order/${orderId}/void`;
    return this.httpClient.put<Order>(url, {}, this.httpOptions);
  }

  // ===== THANH TOÁN VIETQR =====
  public createVietQr(orderId: number): Observable<VietQrPayment> {
    const url = `${this.REST_API_SERVER}/payments/vietqr/create`;
    return this.httpClient.post<VietQrPayment>(url, { orderId }, this.httpOptions);
  }

  public getPaymentStatus(paymentId: number): Observable<PaymentStatus> {
    const url = `${this.REST_API_SERVER}/payments/${paymentId}`;
    return this.httpClient.get<PaymentStatus>(url, this.httpOptions);
  }

  // ===== MẶT HÀNG (ITEM) =====
  public getAllItems(): Observable<Item[]> {
    const url = `${this.REST_API_SERVER}/item`;
    return this.httpClient.get<Item[]>(url, this.httpOptions);
  }
  public getItemById(id: number): Observable<Item> {
    const url = `${this.REST_API_SERVER}/item/${id}`;
    return this.httpClient.get<Item>(url, this.httpOptions);
  }
  public createItem(item: any): Observable<Item> {
    const url = `${this.REST_API_SERVER}/item`;
    return this.httpClient.post<Item>(url, item, this.httpOptions);
  }
  public updateItem(id: number, item: Partial<Item>): Observable<Item> {
    const url = `${this.REST_API_SERVER}/item/${id}`;
    return this.httpClient.put<Item>(url, item, this.httpOptions);
  }
  public deleteItem(id: number): Observable<void> {
    const url = `${this.REST_API_SERVER}/item/${id}`;
    return this.httpClient.delete<void>(url, this.httpOptions);
  }

  // ===== CHI TIẾT ĐƠN HÀNG (ORDER ITEM) =====
  public getAllOrderItems(): Observable<OrderItem[]> {
    const url = `${this.REST_API_SERVER}/orderitem`;
    return this.httpClient.get<OrderItem[]>(url, this.httpOptions);
  }
  public getOrderItemsByOrderId(orderId: number): Observable<OrderItem[]> {
    const url = `${this.REST_API_SERVER}/orderitem/order/${orderId}`;
    return this.httpClient.get<OrderItem[]>(url, this.httpOptions);
  }
  public getOrderItemById(id: number): Observable<OrderItem> {
    const url = `${this.REST_API_SERVER}/orderitem/${id}`;
    return this.httpClient.get<OrderItem>(url, this.httpOptions);
  }

  // Trong my-data.service.ts
  public createOrderItem(orderItem: Omit<OrderItem, 'id'>): Observable<OrderItem> {
    const url = `${this.REST_API_SERVER}/orderitem`;

    console.log('🚀 Sending order item to server:', orderItem);

    return this.httpClient.post<OrderItem>(url, orderItem, this.httpOptions).pipe(
      tap(response => {
        console.log('✅ Order item created successfully:', response);
      }),
      catchError(error => {
        console.error('❌ Error creating order item:', error);
        console.error('❌ Error details:', error.error);
        return throwError(() => error);
      })
    );
  }

  public updateOrderItem(id: number, orderItem: Partial<OrderItem>): Observable<OrderItem> {
    const url = `${this.REST_API_SERVER}/orderitem/${id}`;
    return this.httpClient.put<OrderItem>(url, orderItem, this.httpOptions);
  }
  public deleteOrderItem(id: number): Observable<void> {
    const url = `${this.REST_API_SERVER}/orderitem/${id}`;
    return this.httpClient.delete<void>(url, this.httpOptions);
  }
  public deleteOrderItemsByOrderId(orderId: number): Observable<void> {
    const url = `${this.REST_API_SERVER}/orderitem/order/${orderId}`;
    return this.httpClient.delete<void>(url, this.httpOptions);
  }

  // ===== BẾP (KITCHEN) =====
  public getKitchenPendingItems(): Observable<KitchenOrderItem[]> {
    const url = `${this.REST_API_SERVER}/orderitem/kitchen/pending`;
    return this.httpClient.get<KitchenOrderItem[]>(url, this.httpOptions);
  }

  public getCompletedKitchenItems(): Observable<KitchenOrderItem[]> {
    const url = `${this.REST_API_SERVER}/orderitem/kitchen/completed`;
    return this.httpClient.get<KitchenOrderItem[]>(url, this.httpOptions);
  }

  public updateKitchenItemStatus(request: UpdateKitchenItemStatusRequest): Observable<void> {
    const url = `${this.REST_API_SERVER}/orderitem/kitchen/update-status`;
    return this.httpClient.put<void>(url, request, this.httpOptions);
  }

  public getKitchenDashboard(): Observable<KitchenDashboard> {
    const url = `${this.REST_API_SERVER}/orderitem/kitchen/dashboard`;
    return this.httpClient.get<KitchenDashboard>(url, this.httpOptions);
  }

  // ===== ĐƠN VỊ TÍNH (UNIT) =====
  public getAllUnits(): Observable<Unit[]> {
    const url = `${this.REST_API_SERVER}/unit`;
    return this.httpClient.get<Unit[]>(url, this.httpOptions);
  }
  public createUnit(unit: Omit<Unit, 'id'>): Observable<Unit> {
    const url = `${this.REST_API_SERVER}/unit`;
    return this.httpClient.post<Unit>(url, unit, this.httpOptions);
  }
  public updateUnit(id: number, unit: Partial<Unit>): Observable<Unit> {
    const url = `${this.REST_API_SERVER}/unit/${id}`;
    return this.httpClient.put<Unit>(url, unit, this.httpOptions);
  }
  public deleteUnit(id: number): Observable<void> {
    const url = `${this.REST_API_SERVER}/unit/${id}`;
    return this.httpClient.delete<void>(url, this.httpOptions);
  }

  // ===== Category =====
  public getAllCategories(): Observable<Category[]> {
    const url = `${this.REST_API_SERVER}/category`;
    return this.httpClient.get<Category[]>(url, this.httpOptions);
  }
  public getCategoryById(id: number): Observable<Category> {
    const url = `${this.REST_API_SERVER}/category/${id}`;
    return this.httpClient.get<Category>(url, this.httpOptions);
  }
  public createCategory(category: Omit<Category, 'id'>): Observable<Category> {
    const url = `${this.REST_API_SERVER}/category`;
    return this.httpClient.post<Category>(url, category, this.httpOptions);
  }
  public updateCategory(id: number, category: Partial<Category>): Observable<Category> {
    const url = `${this.REST_API_SERVER}/category/${id}`;
    return this.httpClient.put<Category>(url, category, this.httpOptions);
  }

  public deleteCategory(id: number): Observable<void> {
    const url = `${this.REST_API_SERVER}/category/${id}`;
    return this.httpClient.delete<void>(url, this.httpOptions);
  }

  // ===== User =====
  public getAllUsers(): Observable<User[]> {
    const url = `${this.REST_API_SERVER}/user`;
    return this.httpClient.get<User[]>(url, this.httpOptions);
  }
  public changeMyPassword(data: { username: string; oldPassword: string; newPassword: string }): Observable<any> {
    const url = `${this.REST_API_SERVER}/api/auth/change-my-password`;
    return this.httpClient.put(url, {
      Username: data.username,
      OldPassword: data.oldPassword,
      NewPassword: data.newPassword
    }, this.httpOptions);
  }

  public getUserById(id: number): Observable<User> {
    const url = `${this.REST_API_SERVER}/user/${id}`;
    return this.httpClient.get<User>(url, this.httpOptions);
  }

  public createUser(user: Omit<User, 'id'>): Observable<User> {
    const url = `${this.REST_API_SERVER}/user`;
    return this.httpClient.post<User>(url, user, this.httpOptions);
  }

  public updateUser(id: number, user: Partial<User>): Observable<User> {
    const url = `${this.REST_API_SERVER}/user/${id}`;
    return this.httpClient.put<User>(url, user, this.httpOptions);
  }

  public deleteUser(id: number): Observable<void> {
    const url = `${this.REST_API_SERVER}/user/${id}`;
    return this.httpClient.delete<void>(url, this.httpOptions);
  }

  // ===== DOANH THU (REVENUE) =====
  public getRevenueDaily(): Observable<any[]> {
    const url = `${this.REST_API_SERVER}/revenue/daily`;
    return this.httpClient.get<any[]>(url, this.httpOptions);
  }

  public getRevenueMonthly(): Observable<any[]> {
    const url = `${this.REST_API_SERVER}/revenue/monthly`;
    return this.httpClient.get<any[]>(url, this.httpOptions);
  }

  public getBusinessOverview(fromDate: string, toDate: string): Observable<BusinessOverview> {
    const url = `${this.REST_API_SERVER}/revenue/business-overview`;
    const params = new HttpParams().set('fromDate', fromDate).set('toDate', toDate);
    return this.httpClient.get<BusinessOverview>(url, { ...this.httpOptions, params });
  }

  public getGrossProfitMarginReport(fromDate?: string, toDate?: string): Observable<GrossProfitMarginReport> {
    let params = new HttpParams();
    if (fromDate) params = params.set('fromDate', fromDate);
    if (toDate) params = params.set('toDate', toDate);
    const url = `${this.REST_API_SERVER}/revenue/gross-profit-margin`;
    return this.httpClient.get<GrossProfitMarginReport>(url, { ...this.httpOptions, params });
  }

  public getNetProfitReport(fromDate?: string, toDate?: string): Observable<NetProfitReport> {
    let params = new HttpParams();
    if (fromDate) params = params.set('fromDate', fromDate);
    if (toDate) params = params.set('toDate', toDate);
    const url = `${this.REST_API_SERVER}/revenue/net-profit`;
    return this.httpClient.get<NetProfitReport>(url, { ...this.httpOptions, params });
  }

  public getPayrollReport(period: 'weekly' | 'monthly', date: string): Observable<PayrollReport> {
    const url = `${this.REST_API_SERVER}/payroll/${period}?date=${encodeURIComponent(date)}`;
    return this.httpClient.get<PayrollReport>(url, this.httpOptions);
  }

  public getExpenseCategories(): Observable<ExpenseCategory[]> {
    const url = `${this.REST_API_SERVER}/expense/categories`;
    return this.httpClient.get<ExpenseCategory[]>(url, this.httpOptions);
  }

  public getExpenses(fromDate?: string, toDate?: string): Observable<Expense[]> {
    let url = `${this.REST_API_SERVER}/expense`;
    let params = new HttpParams();
    if (fromDate) params = params.set('fromDate', fromDate);
    if (toDate) params = params.set('toDate', toDate);
    return this.httpClient.get<Expense[]>(url, { headers: this.httpOptions.headers, params });
  }

  public createExpense(expense: ExpenseRequest): Observable<Expense> {
    const url = `${this.REST_API_SERVER}/expense`;
    return this.httpClient.post<Expense>(url, expense, this.httpOptions);
  }

  public updateExpense(id: number, expense: ExpenseRequest): Observable<Expense> {
    const url = `${this.REST_API_SERVER}/expense/${id}`;
    return this.httpClient.put<Expense>(url, expense, this.httpOptions);
  }

  public deleteExpense(id: number): Observable<void> {
    const url = `${this.REST_API_SERVER}/expense/${id}`;
    return this.httpClient.delete<void>(url, this.httpOptions);
  }


  public predictRevenueByAi(date: string): Observable<{ date: string; predictedRevenue: number }> {
    const url = `${this.REST_API_SERVER}/revenue/ai-predict`;
    return this.httpClient.post<{ date: string; predictedRevenue: number }>(
      url,
      { date },
      this.httpOptions
    );
  }

  public getRevenueByHour(days = 30): Observable<any[]> {
    const url = `${this.REST_API_SERVER}/revenue/by-hour?days=${days}`;
    return this.httpClient.get<any[]>(url, this.httpOptions);
  }

  public getRevenueByDayOfWeek(days = 90): Observable<any[]> {
    const url = `${this.REST_API_SERVER}/revenue/by-day-of-week?days=${days}`;
    return this.httpClient.get<any[]>(url, this.httpOptions);
  }

  public getRevenueBestSellers(days = 30, top = 10): Observable<any[]> {
    const url = `${this.REST_API_SERVER}/revenue/best-sellers?days=${days}&top=${top}`;
    return this.httpClient.get<any[]>(url, this.httpOptions);
  }

  public getRevenueTableTurnover(days = 30): Observable<any> {
    const url = `${this.REST_API_SERVER}/revenue/table-turnover?days=${days}`;
    return this.httpClient.get<any>(url, this.httpOptions);
  }

  public getRevenueByPartySize(days = 90): Observable<any[]> {
    const url = `${this.REST_API_SERVER}/revenue/by-party-size?days=${days}`;
    return this.httpClient.get<any[]>(url, this.httpOptions);
  }

  public getRevenueByCategory(days = 30): Observable<any[]> {
    const url = `${this.REST_API_SERVER}/revenue/by-category?days=${days}`;
    return this.httpClient.get<any[]>(url, this.httpOptions);
  }

  public getRevenueForecast(days = 7): Observable<any> {
    const url = `${this.REST_API_SERVER}/revenue/forecast?days=${days}`;
    return this.httpClient.get<any>(url, this.httpOptions);
  }

  // ===== IMAGE =====
  public getAllImages(): Observable<any[]> {
    const url = `${this.REST_API_SERVER}/ItemImage`;
    return this.httpClient.get<any[]>(url, this.httpOptions);
  }

  public getImageById(id: number): Observable<any> {
    const url = `${this.REST_API_SERVER}/ItemImage/${id}`;
    return this.httpClient.get<any>(url, this.httpOptions);
  }

  public createImage(image: FormData): Observable<any> {
    const url = `${this.REST_API_SERVER}/ItemImage`;
    const httpOptions = { headers: new HttpHeaders({}) };
    return this.httpClient.post<any>(url, image, httpOptions);
  }

  public updateImage(id: number, image: FormData): Observable<any> {
    const url = `${this.REST_API_SERVER}/ItemImage/${id}`;
    const httpOptions = { headers: new HttpHeaders({}) };
    return this.httpClient.put<any>(url, image, httpOptions);
  }

  public deleteImage(id: number): Observable<void> {
    const url = `${this.REST_API_SERVER}/ItemImage/${id}`;
    return this.httpClient.delete<void>(url, this.httpOptions);
  }

  // ===== KHÁCH HÀNG (GUEST) =====
  public getAllGuests(): Observable<Guest[]> {
    const url = `${this.REST_API_SERVER}/guest`;
    return this.httpClient.get<Guest[]>(url, this.httpOptions);
  }

  public createGuest(guest: Omit<Guest, 'id'>): Observable<Guest> {
    const url = `${this.REST_API_SERVER}/guest`;
    return this.httpClient.post<Guest>(url, guest, this.httpOptions);
  }

  public updateGuest(id: number, guest: Partial<Guest>): Observable<Guest> {
    const url = `${this.REST_API_SERVER}/guest/${id}`;
    return this.httpClient.put<Guest>(url, guest, this.httpOptions);
  }

  public deleteGuest(id: number): Observable<void> {
    const url = `${this.REST_API_SERVER}/guest/${id}`;
    return this.httpClient.delete<void>(url, this.httpOptions);
  }

  public getOrdersByGuestId(guestId: number): Observable<Order[]> {
    const url = `${this.REST_API_SERVER}/order/guest/${guestId}`;
    return this.httpClient.get<Order[]>(url, this.httpOptions);
  }
  public getGuestByPhone(phone: string): Observable<Guest> {
    const url = `${this.REST_API_SERVER}/guest/search?phone=${encodeURIComponent(phone)}`;
    return this.httpClient.get<Guest>(url, this.httpOptions);
  }
  // ===== NGUYÊN LIỆU (INGREDIENT) =====
  public getAllIngredients(): Observable<Ingredient[]> {
    const url = `${this.REST_API_SERVER}/ingredient`;
    return this.httpClient.get<Ingredient[]>(url, this.httpOptions);
  }

  public getIngredientById(id: number): Observable<Ingredient> {
    const url = `${this.REST_API_SERVER}/ingredient/${id}`;
    return this.httpClient.get<Ingredient>(url, this.httpOptions);
  }

  public createIngredient(ingredient: CreateIngredientRequest): Observable<Ingredient> {
    const url = `${this.REST_API_SERVER}/ingredient`;
    return this.httpClient.post<Ingredient>(url, ingredient, this.httpOptions);
  }

  public updateIngredient(id: number, ingredient: UpdateIngredientRequest): Observable<void> {
    const url = `${this.REST_API_SERVER}/ingredient/${id}`;
    return this.httpClient.put<void>(url, ingredient, this.httpOptions);
  }

  public deleteIngredient(id: number): Observable<void> {
    const url = `${this.REST_API_SERVER}/ingredient/${id}`;
    return this.httpClient.delete<void>(url, this.httpOptions);
  }

  public getLowStockIngredients(): Observable<Ingredient[]> {
    const url = `${this.REST_API_SERVER}/ingredient/low-stock`;
    return this.httpClient.get<Ingredient[]>(url, this.httpOptions);
  }

  public getIngredientBatches(id: number, includeDepleted = true): Observable<IngredientBatch[]> {
    const url = `${this.REST_API_SERVER}/ingredient/${id}/batches?includeDepleted=${includeDepleted}`;
    return this.httpClient.get<IngredientBatch[]>(url, this.httpOptions);
  }

  public createIngredientBatch(
    ingredientId: number,
    batch: CreateIngredientBatchRequest,
  ): Observable<IngredientBatch> {
    const url = `${this.REST_API_SERVER}/ingredient/${ingredientId}/batches`;
    return this.httpClient.post<IngredientBatch>(url, batch, this.httpOptions);
  }

  public updateIngredientBatch(
    ingredientId: number,
    batchId: number,
    batch: UpdateIngredientBatchRequest,
  ): Observable<IngredientBatch> {
    const url = `${this.REST_API_SERVER}/ingredient/${ingredientId}/batches/${batchId}`;
    return this.httpClient.put<IngredientBatch>(url, batch, this.httpOptions);
  }

  public deleteIngredientBatch(ingredientId: number, batchId: number): Observable<void> {
    const url = `${this.REST_API_SERVER}/ingredient/${ingredientId}/batches/${batchId}`;
    return this.httpClient.delete<void>(url, this.httpOptions);
  }

  // ===== CÔNG THỨC (RECIPE) =====
  public getAllRecipes(): Observable<Recipe[]> {
    const url = `${this.REST_API_SERVER}/recipe`;
    return this.httpClient.get<Recipe[]>(url, this.httpOptions);
  }

  public getRecipesByItem(itemId: number): Observable<any[]> {
    const url = `${this.REST_API_SERVER}/recipe/by-item/${itemId}`;
    return this.httpClient.get<any[]>(url, this.httpOptions);
  }

  public createRecipe(recipe: any): Observable<any> {
    const url = `${this.REST_API_SERVER}/recipe`;
    return this.httpClient.post<any>(url, recipe, this.httpOptions);
  }

  public updateRecipe(id: number, recipe: any): Observable<any> {
    const url = `${this.REST_API_SERVER}/recipe/${id}`;
    return this.httpClient.put<any>(url, recipe, this.httpOptions);
  }

  public deleteRecipe(id: number): Observable<void> {
    const url = `${this.REST_API_SERVER}/recipe/${id}`;
    return this.httpClient.delete<void>(url, this.httpOptions);
  }

  // ===== AI SERVICE RECOMMENDATIONS =====
  public getRecommendations(currentItems: string[], topN: number = 5): Observable<any[]> {
    const url = `${this.REST_API_SERVER}/order/ai-recommendations`;
    return this.httpClient.post<any[]>(url, { currentItems, topN }, this.httpOptions);
  }

  public analyzeMarketBasket(items: string[], topN: number = 5): Observable<any[]> {
    const url = `${this.REST_API_SERVER}/order/ai-market-basket`;
    return this.httpClient.post<any[]>(url, { items, topN }, this.httpOptions);
  }

  // ===== AI SERVICE CUSTOMER SEGMENTATION =====
  public getCustomerSegment(guestId: number): Observable<AiCustomerSegmentResponse> {
    const url = `${this.REST_API_SERVER}/guest/${guestId}/ai-segment`;
    return this.httpClient.get<AiCustomerSegmentApiResponse>(url, this.httpOptions).pipe(
      map(response => ({
        guestId: response.guest_id,
        cluster: response.cluster,
        clusterName: response.cluster_name,
        clusterDescription: response.cluster_description,
        clusterTraits: response.cluster_traits,
        guestProfileName: response.guest_profile_name,
        guestProfileDescription: response.guest_profile_description,
        guestProfileTraits: response.guest_profile_traits,
        clusterFeatures: response.cluster_features,
        behaviorLabel: response.behavior_label,
        behaviorDescription: response.behavior_description,
        behaviorTraits: response.behavior_traits,
        features: response.features
      }))
    );
  }

  public getAiIngredientRestock(days: number = 14): Observable<AiIngredientRestockRow[]> {
    const url = `${this.REST_API_SERVER}/Ingredient/ai-restock?days=${days}`;
    return this.httpClient.get<AiIngredientRestockRow[]>(url, this.httpOptions);
  }

  // ===== CA LAM & BANG LUONG =====
  public getAllShifts(): Observable<any[]> {
    return this.httpClient.get<any[]>(`${this.REST_API_SERVER}/shift`, this.httpOptions);
  }

  public getWorkShifts(fromDate: string, toDate: string, userId?: number): Observable<any[]> {
    let url = `${this.REST_API_SERVER}/workshift?fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}`;
    if (userId) url += `&userId=${userId}`;
    return this.httpClient.get<any[]>(url, this.httpOptions);
  }

  public getMyWorkShifts(fromDate: string, toDate: string): Observable<WorkShift[]> {
    const url = `${this.REST_API_SERVER}/workshift/mine?fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}`;
    return this.httpClient.get<WorkShift[]>(url, this.httpOptions);
  }

  public createWorkShift(workShift: any): Observable<any> {
    return this.httpClient.post<any>(`${this.REST_API_SERVER}/workshift`, workShift, this.httpOptions);
  }

  public updateWorkShift(id: number, workShift: any): Observable<any> {
    return this.httpClient.put<any>(`${this.REST_API_SERVER}/workshift/${id}`, workShift, this.httpOptions);
  }

  public deleteWorkShift(id: number): Observable<void> {
    return this.httpClient.delete<void>(`${this.REST_API_SERVER}/workshift/${id}`, this.httpOptions);
  }

  public getPayroll(period: 'weekly' | 'monthly', date: string): Observable<any> {
    return this.httpClient.get<any>(`${this.REST_API_SERVER}/payroll/${period}?date=${encodeURIComponent(date)}`, this.httpOptions);
  }

  public getAiIngredientForecast(id: number, days: number = 14): Observable<AiIngredientDailyForecastRow[]> {
    const url = `${this.REST_API_SERVER}/Ingredient/${id}/ai-forecast?days=${days}`;
    return this.httpClient.get<AiIngredientDailyForecastRow[]>(url, this.httpOptions);
  }

  // ===== CHATBOT BUSINESS =====
  public chatbotBusiness(payload: BusinessChatRequest): Observable<BusinessChatResponse> {
    const url = `${this.REST_API_SERVER}/chatbot/business`;
    return this.httpClient.post<BusinessChatResponse>(url, payload, this.httpOptions);
  }
}
