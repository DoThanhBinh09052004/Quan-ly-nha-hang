import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Table, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { User } from '../../../../model/user.model';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, ButtonModule, InputTextModule, TableModule, TagModule, TooltipModule],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.scss',
})
export class UserListComponent {
  @Input() users: User[] = [];
  @Input() selected: User[] = [];
  @Input() shiftCounts: Record<number, number> = {};

  @Output() selectedChange = new EventEmitter<User[]>();
  @Output() edit = new EventEmitter<User>();
  @Output() remove = new EventEmitter<User>();
  @Output() schedule = new EventEmitter<User>();

  onFilter(event: Event, table: Table): void {
    const value = (event.target as HTMLInputElement).value;
    table.filterGlobal(value, 'contains');
  }

  localDate(value: string | Date): Date {
    const date = new Date(value);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  }
}
