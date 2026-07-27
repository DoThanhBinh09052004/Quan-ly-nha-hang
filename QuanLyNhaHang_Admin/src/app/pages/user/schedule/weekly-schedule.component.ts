import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';

import { User } from '../../../../model/user.model';
import { Shift, WorkShift } from '../models/user-management.models';

export interface ScheduleSlot {
  date: Date;
  shift: Shift;
  assignment?: WorkShift;
}

@Component({
  selector: 'app-weekly-schedule',
  standalone: true,
  imports: [CommonModule, ButtonModule, DialogModule],
  templateUrl: './weekly-schedule.component.html',
  styleUrl: './weekly-schedule.component.scss',
})
export class WeeklyScheduleComponent {
  @Input() shifts: Shift[] = [];
  @Input() workShifts: WorkShift[] = [];
  @Input() weekStart = new Date();
  @Input() selectedUser: User | null = null;
  @Input() userDialog = false;

  @Output() previous = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();
  @Output() today = new EventEmitter<void>();
  @Output() assign = new EventEmitter<ScheduleSlot>();
  @Output() userDialogChange = new EventEmitter<boolean>();

  get days(): Date[] {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(this.weekStart);
      date.setDate(date.getDate() + index);
      return date;
    });
  }

  assignments(shift: Shift, day: Date): WorkShift[] {
    const dateKey = this.toDateKey(day);
    return this.workShifts.filter((workShift) => {
      return workShift.shiftId === shift.id && workShift.workDate.slice(0, 10) === dateKey;
    });
  }

  personalAssignment(shift: Shift, day: Date): WorkShift | undefined {
    return this.assignments(shift, day).find((assignment) => assignment.userId === this.selectedUser?.id);
  }

  count(user: User): number {
    return this.workShifts.filter((workShift) => workShift.userId === user.id).length;
  }

  time(value?: string): string {
    return value?.slice(0, 5) || '--:--';
  }

  private toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
