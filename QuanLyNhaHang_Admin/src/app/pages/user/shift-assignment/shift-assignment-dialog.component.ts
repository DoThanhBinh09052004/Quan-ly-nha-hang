import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AutoCompleteCompleteEvent, AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { TooltipModule } from 'primeng/tooltip';

import { User } from '../../../../model/user.model';
import { Shift, WorkShift } from '../models/user-management.models';

export interface PenaltyChange {
  assignment: WorkShift;
  penaltyAmount: number;
}

@Component({
  selector: 'app-shift-assignment-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AutoCompleteModule,
    ButtonModule,
    DialogModule,
    InputNumberModule,
    TooltipModule,
  ],
  templateUrl: './shift-assignment-dialog.component.html',
  styleUrl: './shift-assignment-dialog.component.scss',
})
export class ShiftAssignmentDialogComponent implements OnChanges {
  @Input() visible = false;
  @Input() date: Date | null = null;
  @Input() shift: Shift | null = null;
  @Input() users: User[] = [];
  @Input() assignments: WorkShift[] = [];

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() add = new EventEmitter<User>();
  @Output() penaltyChange = new EventEmitter<PenaltyChange>();
  @Output() remove = new EventEmitter<WorkShift>();

  selectedUser: User | null = null;
  suggestions: User[] = [];
  penaltyAmounts: Record<number, number> = {};

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['assignments']) {
      this.penaltyAmounts = this.assignments.reduce<Record<number, number>>((amounts, assignment) => {
        amounts[assignment.id] = assignment.penaltyAmount || 0;
        return amounts;
      }, {});
    }
  }

  searchUsers(event: AutoCompleteCompleteEvent): void {
    const query = (event.query || '').trim().toLocaleLowerCase('vi-VN');
    this.suggestions = this.users.filter((user) => {
      if (this.has(user)) {
        return false;
      }

      const label = `${user.fullName ?? ''} ${user.username}`.toLocaleLowerCase('vi-VN');
      return !query || label.includes(query);
    });
  }

  selectUser(user: User): void {
    if (!user) return;
    this.add.emit(user);
    this.selectedUser = null;
    this.suggestions = [];
  }

  savePenalty(assignment: WorkShift): void {
    this.penaltyChange.emit({
      assignment,
      penaltyAmount: this.penaltyAmounts[assignment.id] ?? 0,
    });
  }

  closeDialog(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  has(user: User): boolean {
    return this.assignments.some((assignment) => assignment.userId === user.id);
  }
}
