import { Injectable } from "@angular/core";
import { environment } from "../environments/environment";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { catchError, Observable, tap, throwError } from "rxjs";
import { Restaurant } from "../model/restaurant.model";
import { Role } from "../model/role.model";
import { Status } from "../model/status.model";
import { GuestTable } from "../model/guesttable.model";
import { Order } from "../model/order.model";
import { Item } from "../model/item.model";
import { OrderItem } from "../model/orderitem.model";
import { Unit } from "../model/unit.model";
import { Category } from "../model/category.model";
import { User } from "../model/user.model";
import { Guest } from "../model/guest.model";
import { AiIngredientRestockRow, Ingredient } from "../model/ingredient.model";
import { Recipe } from "../model/recipe.model";

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

  constructor(private httpClient: HttpClient) {}

  // ===== NHÀ HÀNG =====
  public getAllRestaurants(): Observable<Restaurant[]> {
    const url = `${this.REST_API_SERVER}/restaurant`;
    return this.httpClient.get<Restaurant[]>(url, this.httpOptions);
  }
  public createRestaurant(restaurant: Omit<Restaurant, 'id'>): Observable<Restaurant> {
    const url = `${this.REST_API_SERVER}/restaurant`;
    return this.httpClient.post<Restaurant>(url, restaurant, this.httpOptions);
  }
  public updateRestaurant(id: number, restaurant: Partial<Restaurant>): Observable<Restaurant> {
    const url = `${this.REST_API_SERVER}/restaurant/${id}`;
    return this.httpClient.put<Restaurant>(url, restaurant, this.httpOptions);
  }
  public deleteRestaurant(id: number): Observable<void> {
    const url = `${this.REST_API_SERVER}/restaurant/${id}`;
    return this.httpClient.delete<void>(url, this.httpOptions);
  }

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

  // ===== ĐƠN HÀNG (ORDER) =====
  public getAllOrder(): Observable<Order[]> {
    const url = `${this.REST_API_SERVER}/order`;
    return this.httpClient.get<Order[]>(url, this.httpOptions);
  }
  public getOrderById(id: number): Observable<Order> {
    const url = `${this.REST_API_SERVER}/order/${id}`;
    return this.httpClient.get<Order>(url, this.httpOptions);
  }
  public createOrder(order: Omit<Order, 'id'>): Observable<Order> {
    const url = `${this.REST_API_SERVER}/order`;
    return this.httpClient.post<Order>(url, order, this.httpOptions);
  }
  public updateOrder(id: number, order: Partial<Order>): Observable<Order> {
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
  usePoints(orderId: number, pointsToUse: number): Observable<any> {
    const url = `${this.REST_API_SERVER}/order/${orderId}/use-points`;
    return this.httpClient.put<any>(url, { pointsToUse }, this.httpOptions);
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

  public createIngredient(ingredient: Omit<Ingredient, 'id'>): Observable<Ingredient> {
    const url = `${this.REST_API_SERVER}/ingredient`;
    return this.httpClient.post<Ingredient>(url, ingredient, this.httpOptions);
  }

  public updateIngredient(id: number, ingredient: Partial<Ingredient>): Observable<Ingredient> {
    const url = `${this.REST_API_SERVER}/ingredient/${id}`;
    return this.httpClient.put<Ingredient>(url, ingredient, this.httpOptions);
  }

  public deleteIngredient(id: number): Observable<void> {
    const url = `${this.REST_API_SERVER}/ingredient/${id}`;
    return this.httpClient.delete<void>(url, this.httpOptions);
  }

  public getLowStockIngredients(): Observable<Ingredient[]> {
    const url = `${this.REST_API_SERVER}/ingredient/low-stock`;
    return this.httpClient.get<Ingredient[]>(url, this.httpOptions);
  }

  // ===== CÔNG THỨC (RECIPE) =====
  public getAllRecipes(): Observable<any[]> {
    const url = `${this.REST_API_SERVER}/recipe`;
    return this.httpClient.get<any[]>(url, this.httpOptions);
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
  public getCustomerSegment(guestId: number): Observable<any> {
    const url = `${this.REST_API_SERVER}/guest/${guestId}/ai-segment`;
    return this.httpClient.get<any>(url, this.httpOptions);
  }

  public getAiIngredientRestock(days: number = 14): Observable<AiIngredientRestockRow[]> {
    const url = `${this.REST_API_SERVER}/Ingredient/ai-restock?days=${days}`;
    return this.httpClient.get<AiIngredientRestockRow[]>(url, this.httpOptions);
  }

  // ===== CHATBOT BUSINESS =====
  public chatbotBusiness(payload: {
    message: string;
    daysHour?: number;
    daysDow?: number;
    daysBest?: number;
    daysTurnover?: number;
    daysParty?: number;
    daysForecast?: number;
    topBest?: number;
  }): Observable<any> {
    const url = `${this.REST_API_SERVER}/chatbot/business`;
    return this.httpClient.post<any>(url, payload, this.httpOptions);
  }
}