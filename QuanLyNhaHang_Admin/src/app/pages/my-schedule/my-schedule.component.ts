import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { MyData } from '../../my-data';
import { WorkShift } from '../../../model/workshift.model';

@Component({
  selector: 'app-my-schedule',
  standalone: true,
  imports: [CommonModule, DatePipe, ButtonModule, ProgressSpinnerModule],
  templateUrl: './my-schedule.component.html',
  styleUrl: './my-schedule.component.scss',
})
export class MyScheduleComponent implements OnInit {
  weekStart = this.getWeekStart(new Date());
  workShifts: WorkShift[] = [];
  isLoading = false;
  errorMessage = '';

  constructor(private readonly myData: MyData) {}

  ngOnInit(): void {
    this.loadSchedule();
  }

  get days(): Date[] {
    return Array.from({ length: 7 }, (_, index) => this.addDays(this.weekStart, index));
  }

  previousWeek(): void {
    this.weekStart = this.addDays(this.weekStart, -7);
    this.loadSchedule();
  }

  nextWeek(): void {
    this.weekStart = this.addDays(this.weekStart, 7);
    this.loadSchedule();
  }

  goToCurrentWeek(): void {
    this.weekStart = this.getWeekStart(new Date());
    this.loadSchedule();
  }

  shiftsFor(day: Date): WorkShift[] {
    const dateKey = this.toDateKey(day);
    return this.workShifts.filter((workShift) => workShift.workDate.slice(0, 10) === dateKey);
  }

  trackShift(_: number, workShift: WorkShift): number {
    return workShift.id;
  }

  time(value?: string): string {
    return value?.slice(0, 5) || '--:--';
  }

  private loadSchedule(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const fromDate = this.toDateKey(this.weekStart);
    const toDate = this.toDateKey(this.addDays(this.weekStart, 6));
    this.myData.getMyWorkShifts(fromDate, toDate).subscribe({
      next: (workShifts) => {
        this.workShifts = Array.isArray(workShifts) ? workShifts : [];
        this.isLoading = false;
      },
      error: () => {
        this.workShifts = [];
        this.errorMessage = 'Không thể tải lịch làm việc. Vui lòng thử lại.';
        this.isLoading = false;
      },
    });
  }

  private getWeekStart(date: Date): Date {
    const result = new Date(date);
    const day = result.getDay() || 7;
    result.setDate(result.getDate() - day + 1);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  private toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
