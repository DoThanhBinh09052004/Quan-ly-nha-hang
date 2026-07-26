import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table'; import { ButtonModule } from 'primeng/button'; import { InputTextModule } from 'primeng/inputtext'; import { TagModule } from 'primeng/tag';
import { User } from '../../../../model/user.model';
@Component({ selector: 'app-user-table', standalone: true, imports: [CommonModule, TableModule, ButtonModule, InputTextModule, TagModule], templateUrl: './user-table.component.html', styleUrl: '../styles/user-component.scss' })
export class UserTableComponent {
 @Input() users: User[] = []; @Input() selected: User[] = []; @Input() shiftCounts: Record<number, number> = {}; @Output() selectedChange = new EventEmitter<User[]>(); @Output() edit = new EventEmitter<User>(); @Output() remove = new EventEmitter<User>(); @Output() schedule = new EventEmitter<User>();
 onFilter(event: Event, table: any) { table.filterGlobal((event.target as HTMLInputElement).value, 'contains'); }
 localDate(value: string | Date) { const d = new Date(value); return new Date(d.getTime() - d.getTimezoneOffset() * 60000); }
}
