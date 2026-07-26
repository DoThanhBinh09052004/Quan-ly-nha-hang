import { Component } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { MenubarModule } from 'primeng/menubar';

import { Router } from '@angular/router';
import { ThemeSwitcher } from "../../themeswitcher";
import { CommonModule } from '@angular/common';
import { ProgressBar } from 'primeng/progressbar';
import { Toast } from "primeng/toast";


@Component({
    selector: 'app-root',
    standalone: true,
    imports: [MenuModule, MenubarModule, RouterOutlet, RouterModule, ThemeSwitcher, CommonModule],
    templateUrl: './app.html',
    styleUrl: './app.scss'
})
export class App {
    protected title = 'QuanLyNhaHang_Admin';
    items: MenuItem[] = [];
    get showMenu(): boolean {
        return this.router.url !== '/login' && this.router.url !=='/change-password';
    }
    constructor(public router: Router) {}

    ngOnInit() {
       
        this.items = [
            
    
            {
                label: 'Nhân sự',
                icon: 'pi pi-user',
                command: () => {
                    this.router.navigate(['/user']);
                }
            },
            {
                label: 'Bàn ăn',
                icon: 'pi pi-table',
                command: () => {
                    this.router.navigate(['/guesttable']);
                }
            },
            {
                label:' Đơn hàng',
                icon: 'pi pi-shopping-cart',
                command: () => {
                    this.router.navigate(['/order'] );
                }
            },
            {
                label: 'Món ăn',
                icon: 'pi pi-calendar',
                command: () => {
                    this.router.navigate(['/items'] );
                }
             
            },
            {
                label: 'Doanh thu',
                icon: 'pi pi-chart-bar',
                command: () => {
                    this.router.navigate(['/revenue-chart']);
                }
            },
            {
                label: 'Khách hàng',
                icon: 'pi pi-users',
                command: () => {
                    this.router.navigate(['/guest']);
                }
            },
            {
                label: 'Nguyên liệu',
                icon: 'pi pi-box',
                command: () => {
                    this.router.navigate(['/ingredient']);
                }
            },
            {
                label: 'Công thức',
                icon: 'pi pi-book',
                command: () => {
                    this.router.navigate(['/recipe']);
                }
            },
            {
                label:'Chung',
                icon: 'pi pi-cog',
                items: [
                    {
                        label: 'Danh mục',
                        icon: 'pi pi-tags',
                        command: () => {
                            this.router.navigate(['/category'] );
                        }
                    },
                    {
                        label: 'Đơn vị tính',
                        icon: 'pi pi-calculator',
                        command: () => {
                            this.router.navigate(['/unit'] );
                        }
                    },
                    {
                        label: 'Tình trạng',
                        icon: 'pi pi-flag',
                        command: () => {
                            this.router.navigate(['/status']);
                        }
                    }
                    ,{
                        label: 'Vai trò',
                        icon: 'pi pi-shield',
                        command: () => {
                            this.router.navigate(['/role']);
                        }
                    }
                    ,{
                        label: 'Thư viện',
                        icon: 'pi pi-image',
                        command: () => {
                            this.router.navigate(['/item-image']);
                        }
                    }
                ]
                
                
               
            },
            
            {
                label: 'Logout',
                icon: 'pi pi-sign-out',
                command: () => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('role');
                    this.router.navigate(['/login']);
                }
            }
        ];
        
    }
}