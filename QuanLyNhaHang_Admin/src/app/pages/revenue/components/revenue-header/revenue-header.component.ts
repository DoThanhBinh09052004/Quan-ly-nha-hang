import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-revenue-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './revenue-header.component.html',
  styleUrls: ['./revenue-header.component.scss']
})
export class RevenueHeaderComponent {
  @Input() currentDate = '';
  @Input() loading = false;
  @Input() activeTab: 'gross' | 'net' | 'forecast' = 'gross';

  @Output() refresh = new EventEmitter<void>();
  @Output() tabChange = new EventEmitter<'gross' | 'net' | 'forecast'>();
  @Output() exportClick = new EventEmitter<void>();

  onRefresh() {
    this.refresh.emit();
  }

  onExport() {
    this.exportClick.emit();
  }

  setTab(tab: 'gross' | 'net' | 'forecast') {
    this.tabChange.emit(tab);
  }
}
