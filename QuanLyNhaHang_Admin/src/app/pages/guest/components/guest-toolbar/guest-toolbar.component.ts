import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-guest-toolbar',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  templateUrl: './guest-toolbar.component.html',
  styleUrls: ['../../guest.scss']
})
export class GuestToolbarComponent {
  @Input() guestCount = 0;
  @Input() selectedCount = 0;

  @Output() create = new EventEmitter<void>();
  @Output() deleteSelected = new EventEmitter<void>();
  @Output() reload = new EventEmitter<void>();
}
