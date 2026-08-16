import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { MenubarModule } from 'primeng/menubar';

import { ThemeSwitcher } from '../../themeswitcher';
import { AuthService } from './service/authservice';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [MenuModule, MenubarModule, RouterModule, ThemeSwitcher, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected title = 'QuanLyNhaHang_Admin';
  items: MenuItem[] = [];

  get showMenu(): boolean {
    return this.router.url !== '/login' && this.router.url !== '/change-password';
  }

  constructor(public router: Router, private readonly auth: AuthService) {}

  ngOnInit(): void {
    this.router.events.subscribe(() => (this.items = this.buildMenu()));
    this.items = this.buildMenu();
  }

  private buildMenu(): MenuItem[] {
    const role = this.auth.getRole();

    if (role === 'Service Staff') {
      return [
        this.menuItem('Đơn hàng & thanh toán', 'pi pi-shopping-cart', '/order'),
        this.menuItem('Bàn & lịch hẹn', 'pi pi-calendar', '/guesttable'),
        this.menuItem('Lịch làm của tôi', 'pi pi-calendar-clock', '/my-schedule'),
        this.menuItem('Khách hàng', 'pi pi-users', '/guest'),
        this.logoutItem(),
      ];
    }

    if (role === 'Kitchen') {
      return [
        this.menuItem('Bếp', 'pi pi-receipt', '/kitchen'),
        this.menuItem('Lịch làm của tôi', 'pi pi-calendar-clock', '/my-schedule'),
        this.logoutItem(),
      ];
    }

    if (role !== 'Manager') {
      return [];
    }

    return [
      this.menuItem('Trang chủ', 'pi pi-home', '/home'),
      this.menuItem('Nhân sự', 'pi pi-user', '/user'),
      this.menuItem('Bàn ăn', 'pi pi-table', '/guesttable'),
      this.menuItem('Đơn hàng', 'pi pi-shopping-cart', '/order'),
      this.menuItem('Bếp', 'pi pi-receipt', '/kitchen'),
      this.menuItem('Doanh thu', 'pi pi-chart-bar', '/revenue-chart'),
      this.menuItem('Khách hàng', 'pi pi-users', '/guest'),
      this.menuItem('Nguyên liệu', 'pi pi-box', '/ingredient'),
      {
        label: 'Chung',
        icon: 'pi pi-cog',
        items: [
          this.menuItem('Danh mục', 'pi pi-tags', '/category'),
          this.menuItem('Đơn vị tính', 'pi pi-calculator', '/unit'),
          this.menuItem('Tình trạng', 'pi pi-flag', '/status'),
          this.menuItem('Vai trò', 'pi pi-shield', '/role'),
          this.menuItem('Thư viện', 'pi pi-image', '/item-image'),
          this.menuItem('Công thức', 'pi pi-book', '/recipe'),
          this.menuItem('Món ăn', 'pi pi-calendar', '/items'),


        ],
      },
      this.menuItem('Lịch làm của tôi', 'pi pi-calendar-clock', '/my-schedule'),
      this.logoutItem(),
    ];
  }

  private menuItem(label: string, icon: string, route: string): MenuItem {
    return { label, icon, command: () => this.router.navigate([route]) };
  }

  private logoutItem(): MenuItem {
    return {
      label: 'Đăng xuất',
      icon: 'pi pi-sign-out',
      command: () => this.auth.logout(),
    };
  }
}
