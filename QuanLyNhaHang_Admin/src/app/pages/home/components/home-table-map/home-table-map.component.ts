import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GuestTable } from '../../../../../model/guesttable.model';

@Component({
  selector: 'app-home-table-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home-table-map.component.html',
  styleUrls: ['./home-table-map.component.scss']
})
export class HomeTableMapComponent {
  @Input() guestTables: GuestTable[] = [];
  @Output() viewAll = new EventEmitter<void>();

  getTableStatusClass(table: GuestTable): string {
    const code = table.status?.code || table.status?.name || '';
    if (code.includes('OCCUPIED') || code.includes('Đang') || table.statusId === 2) {
      return 'status-occupied';
    }
    if (code.includes('RESERVED') || code.includes('Đặt') || table.statusId === 3) {
      return 'status-reserved';
    }
    return 'status-available';
  }

  getTableStatusText(table: GuestTable): string {
    const code = table.status?.code || table.status?.name || '';
    if (code.includes('OCCUPIED') || code.includes('Đang') || table.statusId === 2) {
      return 'Đang phục vụ';
    }
    if (code.includes('RESERVED') || code.includes('Đặt') || table.statusId === 3) {
      return 'Đã đặt';
    }
    return 'Bàn trống';
  }

  onViewAllClick() {
    this.viewAll.emit();
  }
}
