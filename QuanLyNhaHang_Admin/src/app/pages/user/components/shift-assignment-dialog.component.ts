import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AutoCompleteCompleteEvent, AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { User } from '../../../../model/user.model';
import { Shift, WorkShift } from '../models/user-management.models';

@Component({
  selector: 'app-shift-assignment-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, AutoCompleteModule, ButtonModule, DialogModule],
  templateUrl: './shift-assignment-dialog.component.html',
  styleUrl: '../styles/user-component.scss'
})
export class ShiftAssignmentDialogComponent {
  @Input() visible = false;
  @Input() date: Date | null = null;
  @Input() shift: Shift | null = null;
  @Input() users: User[] = [];
  @Input() assignments: WorkShift[] = [];

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() add = new EventEmitter<User>();
  @Output() remove = new EventEmitter<WorkShift>();

  selectedUser: User | null = null;
  suggestions: User[] = [];

  searchUsers(event: AutoCompleteCompleteEvent) {
    const query = event.query.trim().toLocaleLowerCase('vi-VN');
    this.suggestions = this.users.filter((user) => {
      if (this.has(user)) return false;

      const label = `${user.fullName ?? ''} ${user.username}`.toLocaleLowerCase('vi-VN');
      return !query || label.includes(query);
    });
  }

  selectUser(user: User) {
    this.add.emit(user);
    this.selectedUser = null;
    this.suggestions = [];
  }

  has(user: User) {
    return this.assignments.some((assignment) => assignment.userId === user.id);
  }
}
