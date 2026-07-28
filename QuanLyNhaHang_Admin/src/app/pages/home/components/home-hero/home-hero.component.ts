import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BusinessOverview } from '../../../../../model/revenue.model';

@Component({
  selector: 'app-home-hero',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home-hero.component.html',
  styleUrls: ['./home-hero.component.scss']
})
export class HomeHeroComponent implements OnInit {
  @Input() businessOverview: BusinessOverview | null = null;
  @Input() totalTables = 0;
  @Input() occupiedTables = 0;
  @Input() lowStockCount = 0;
  @Input() reservationCount = 0;
  @Input() currentUser: any = null;

  today = new Date();
  greeting = 'Chào bạn';

  ngOnInit() {
    this.setGreeting();
  }

  setGreeting() {
    const h = this.today.getHours();
    if (h < 12) this.greeting = 'Chào buổi sáng';
    else if (h < 18) this.greeting = 'Chào buổi chiều';
    else this.greeting = 'Chào buổi tối';
  }

  formatMoney(val: number | undefined | null): string {
    if (val == null || val === 0) return '0 ₫';
    if (val >= 1_000_000_000) return (val / 1_000_000_000).toFixed(1) + ' tỷ ₫';
    if (val >= 1_000_000) return (val / 1_000_000).toFixed(1) + ' triệu ₫';
    if (val >= 1_000) return (val / 1_000).toFixed(1) + ' nghìn ₫';
    return val.toLocaleString('vi-VN') + ' ₫';
  }
}
