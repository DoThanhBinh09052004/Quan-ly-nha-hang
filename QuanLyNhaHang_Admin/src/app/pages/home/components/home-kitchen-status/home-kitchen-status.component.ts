import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KitchenDashboard, KitchenOrderItem } from '../../../../../model/kitchen.model';

@Component({
  selector: 'app-home-kitchen-status',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home-kitchen-status.component.html',
  styleUrls: ['./home-kitchen-status.component.scss']
})
export class HomeKitchenStatusComponent {
  @Input() kitchenDashboard: KitchenDashboard | null = null;
  @Input() pendingItems: KitchenOrderItem[] = [];
  @Output() viewKitchen = new EventEmitter<void>();

  onViewKitchenClick() {
    this.viewKitchen.emit();
  }
}
