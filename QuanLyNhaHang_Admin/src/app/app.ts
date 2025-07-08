import { Component } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { MenubarModule } from 'primeng/menubar';

import { Router } from '@angular/router';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [MenuModule, MenubarModule, RouterOutlet,RouterModule],
    templateUrl: './app.html',
    styleUrl: './app.scss'
})
export class App {
    protected title = 'QuanLyNhaHang_Admin';
    items: MenuItem[] = [];

    constructor(public router: Router) {}

    ngOnInit() {
        this.items = [
            {
                label: 'Nhà hàng',
                icon: 'pi pi-home',
                command: () => {
                    // Navigate to home or perform some action
                    this.router.navigate(['/restaurant']);
                }
            },
            {
                label: 'Quyền',
                icon: 'pi pi-key',
                command: () => {
                    // Navigate to roles or perform some action
                    this.router.navigate(['/role']);
                }
            },
            {
                label: 'Tình trạng',
                icon: 'pi pi-flag'
            },
            {
                label: 'Khu vực',
                icon: 'pi pi-share-alt'
            },
            {
                label: 'Đơn vị',
                icon: 'pi pi-filter',
                items: [
                    { label: 'Đơn vị 1' },
                    { label: 'Đơn vị 2' }
                ]
            },
            {
                label: 'Thể loại',
                icon: 'pi pi-sliders-h'
            },
            {
                label: 'Nhân sự',
                icon: 'pi pi-user'
            },
            {
                label: 'Bàn ăn',
                icon: 'pi pi-table'
            },
            {
                label: 'Thức ăn',
                icon: 'pi pi-calendar',
                items: [
                    { label: 'Món chính' },
                    { label: 'Tráng miệng' }
                ]
            },
            {
                label: 'Logout',
                icon: 'pi pi-sign-out'
            }
        ];
    }
}


