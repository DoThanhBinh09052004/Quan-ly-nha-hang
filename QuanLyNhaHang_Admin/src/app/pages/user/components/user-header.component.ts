import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

@Component({ selector: 'app-user-header', standalone: true, imports: [CommonModule, ButtonModule], templateUrl: './user-header.component.html', styleUrl: './user-header.component.scss' })
export class UserHeaderComponent {
  @Output() create = new EventEmitter<void>(); @Output() reload = new EventEmitter<void>(); @Output() payroll = new EventEmitter<void>(); @Output() deleteSelected = new EventEmitter<void>();
  @Input() selectedCount = 0;
}
