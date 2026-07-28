import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MyData } from '../../my-data';

import { HomeHeroComponent } from './components/home-hero/home-hero.component';
import { HomeTableMapComponent } from './components/home-table-map/home-table-map.component';
import { HomeRecentOrdersComponent } from './components/home-recent-orders/home-recent-orders.component';
import { HomeKitchenStatusComponent } from './components/home-kitchen-status/home-kitchen-status.component';
import { HomeIngredientAlertsComponent } from './components/home-ingredient-alerts/home-ingredient-alerts.component';
import { HomeBestSellersComponent } from './components/home-best-sellers/home-best-sellers.component';
import { HomeRevenueChartComponent } from './components/home-revenue-chart/home-revenue-chart.component';

import { BusinessOverview } from '../../../model/revenue.model';
import { GuestTable } from '../../../model/guesttable.model';
import { KitchenDashboard, KitchenOrderItem } from '../../../model/kitchen.model';
import { Ingredient } from '../../../model/ingredient.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    HomeHeroComponent,
    HomeTableMapComponent,
    HomeRecentOrdersComponent,
    HomeKitchenStatusComponent,
    HomeIngredientAlertsComponent,
    HomeBestSellersComponent,
    HomeRevenueChartComponent
  ],
  templateUrl: './home.html',
  styleUrls: ['./home.scss']
})
export class HomeComponent implements OnInit {
  loading = true;
  loadError: string | null = null;
  currentUser: any = null;

  businessOverview: BusinessOverview | null = null;
  guestTables: GuestTable[] = [];
  recentOrders: any[] = [];
  kitchenDashboard: KitchenDashboard | null = null;
  pendingKitchenItems: KitchenOrderItem[] = [];
  lowStockIngredients: Ingredient[] = [];
  reservationCount = 0;
  bestSellers: any[] = [];
  dailyRevenue: any[] = [];
  forecastData: any = null;

  constructor(
    private myData: MyData,
    private router: Router
  ) {}

  ngOnInit() {
    const raw = localStorage.getItem('currentUser');
    if (raw) {
      try { this.currentUser = JSON.parse(raw); } catch (e) {}
    }
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.loading = true;
    this.loadError = null;

    const todayStr = new Date().toISOString().split('T')[0];

    forkJoin({
      overview: this.myData.getBusinessOverview(todayStr, todayStr).pipe(catchError(() => of(null))),
      tables: this.myData.getAllGuestTables().pipe(catchError(() => of([]))),
      orders: this.myData.getOrders({ page: 1, pageSize: 8, sortField: 'id', sortOrder: 'desc' }).pipe(catchError(() => of(null))),
      kitchenDash: this.myData.getKitchenDashboard().pipe(catchError(() => of(null))),
      kitchenPending: this.myData.getKitchenPendingItems().pipe(catchError(() => of([]))),
      lowStock: this.myData.getLowStockIngredients().pipe(catchError(() => of([]))),
      reservations: this.myData.getReservations(todayStr).pipe(catchError(() => of([]))),
      bestSellers: this.myData.getRevenueBestSellers(7, 5).pipe(catchError(() => of([]))),
      dailyRevenue: this.myData.getRevenueDaily().pipe(catchError(() => of([]))),
      forecast: this.myData.getRevenueForecast(3).pipe(catchError(() => of(null)))
    }).subscribe({
      next: (res) => {
        this.businessOverview = res.overview;
        this.guestTables = Array.isArray(res.tables) ? res.tables : [];
        this.recentOrders = res.orders?.items ? res.orders.items : [];
        this.kitchenDashboard = res.kitchenDash;
        this.pendingKitchenItems = Array.isArray(res.kitchenPending) ? res.kitchenPending : [];
        this.lowStockIngredients = Array.isArray(res.lowStock) ? res.lowStock : [];
        this.reservationCount = Array.isArray(res.reservations) ? res.reservations.length : 0;
        this.bestSellers = Array.isArray(res.bestSellers) ? res.bestSellers : [];
        this.dailyRevenue = Array.isArray(res.dailyRevenue) ? res.dailyRevenue : [];
        this.forecastData = res.forecast;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.loadError = err?.message || 'Không thể tải dữ liệu bảng điều khiển';
      }
    });
  }

  get totalTablesCount(): number {
    return this.guestTables.length;
  }

  get occupiedTablesCount(): number {
    return this.guestTables.filter(t => {
      const code = t.status?.code || t.status?.name || '';
      return code.includes('OCCUPIED') || code.includes('Đang') || t.statusId === 2;
    }).length;
  }

  navigateTo(route: string) {
    this.router.navigate([route]);
  }
}
