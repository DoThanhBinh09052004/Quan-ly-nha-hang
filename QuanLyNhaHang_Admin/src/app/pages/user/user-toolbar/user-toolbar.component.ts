import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-user-toolbar',
  standalone: true,
  imports: [ButtonModule],
  templateUrl: './user-toolbar.component.html',
  styleUrl: './user-toolbar.component.scss',
})
export class UserToolbarComponent {
  @Input() selectedCount = 0;

  @Output() create = new EventEmitter<void>();
  @Output() reload = new EventEmitter<void>();
  @Output() payroll = new EventEmitter<void>();
  @Output() deleteSelected = new EventEmitter<void>();
}
