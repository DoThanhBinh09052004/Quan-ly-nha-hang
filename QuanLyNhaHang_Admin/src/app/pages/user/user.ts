import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';

import { Role } from '../../../model/role.model';
import { User } from '../../../model/user.model';
import { MyData } from '../../my-data';
import { PayrollReport, Shift, WorkShift } from './models/user-management.models';
import { PayrollReportDialogComponent } from './payroll/payroll-report-dialog.component';
import { WeeklyScheduleComponent } from './schedule/weekly-schedule.component';
import {
  PenaltyChange,
  ShiftAssignmentDialogComponent,
} from './shift-assignment/shift-assignment-dialog.component';
import { UserFormDialogComponent } from './user-form/user-form-dialog.component';
import { UserListComponent } from './user-list/user-list.component';
import { UserToolbarComponent } from './user-toolbar/user-toolbar.component';

@Component({
  selector: 'app-user',
  standalone: true,
  imports: [
    ConfirmDialogModule,
    ToastModule,
    UserToolbarComponent,
    UserListComponent,
    UserFormDialogComponent,
    WeeklyScheduleComponent,
    ShiftAssignmentDialogComponent,
    PayrollReportDialogComponent,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './user.html',
  styleUrl: './user.scss',
})
export class UserComponent implements OnInit {
  users: User[] = [];
  selectedUsers: User[] = [];
  roles: Role[] = [];
  shifts: Shift[] = [];
  workShifts: WorkShift[] = [];

  userDialog = false;
  assignmentDialog = false;
  scheduleDialog = false;
  payrollDialog = false;
  submitted = false;

  user = this.createEmptyUser();
  selectedRole: Role | null = null;
  selectedScheduleUser: User | null = null;
  selectedDate: Date | null = null;
  selectedShift: Shift | null = null;

  weekStart = this.startOfWeek(new Date());
  payrollPeriod: 'weekly' | 'monthly' = 'weekly';
  payrollReport: PayrollReport | null = null;

  constructor(
    private readonly myData: MyData,
    private readonly messageService: MessageService,
    private readonly confirmationService: ConfirmationService,
    private readonly changeDetector: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.loadRoles();
    this.loadScheduleData();
  }

  get shiftCounts(): Record<number, number> {
    return this.workShifts.reduce<Record<number, number>>((counts, workShift) => {
      counts[workShift.userId] = (counts[workShift.userId] ?? 0) + 1;
      return counts;
    }, {});
  }

  get selectedAssignments(): WorkShift[] {
    if (!this.selectedShift || !this.selectedDate) {
      return [];
    }

    return this.shiftAssignments(this.selectedShift, this.selectedDate);
  }

  reload(): void {
    this.loadData();
    this.loadScheduleData();
  }

  openNew(): void {
    this.user = this.createEmptyUser();
    this.selectedRole = null;
    this.submitted = false;
    this.userDialog = true;
  }

  editUser(user: User): void {
    this.user = { ...user, password: '' };
    this.selectedRole = this.roles.find((role) => role.id === user.roleId || role.id === user.role?.id) ?? null;
    this.submitted = false;
    this.userDialog = true;
  }

  saveForm(value: { user: User; role: Role | null }): void {
    this.user = value.user;
    this.selectedRole = value.role;
    this.saveUser();
  }

  deleteUser(user: User): void {
    this.confirmationService.confirm({
      header: 'Xác nhận xóa',
      message: 'Bạn có chắc chắn muốn xóa người dùng này?',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.myData.deleteUser(user.id).subscribe({
          next: () => {
            this.showSuccess('Xóa người dùng thành công');
            this.loadData();
          },
          error: () => this.showError('Không thể xóa người dùng. Vui lòng thử lại.'),
        });
      },
    });
  }

  deleteSelectedUsers(): void {
    if (!this.selectedUsers.length) {
      return;
    }

    this.confirmationService.confirm({
      header: 'Xác nhận xóa',
      message: 'Bạn có chắc chắn muốn xóa các người dùng đã chọn?',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        forkJoin(this.selectedUsers.map((user) => this.myData.deleteUser(user.id))).subscribe({
          next: () => {
            this.selectedUsers = [];
            this.showSuccess('Đã xóa các người dùng đã chọn');
            this.loadData();
          },
          error: () => this.showError('Không thể xóa một hoặc nhiều người dùng.'),
        });
      },
    });
  }

  previousWeek(): void {
    this.weekStart = this.addDays(this.weekStart, -7);
    this.loadScheduleData();
  }

  nextWeek(): void {
    this.weekStart = this.addDays(this.weekStart, 7);
    this.loadScheduleData();
  }

  goToCurrentWeek(): void {
    this.weekStart = this.startOfWeek(new Date());
    this.loadScheduleData();
  }

  openAssignment(date: Date, shift: Shift, existing?: WorkShift): void {
    if (!existing && this.scheduleDialog && this.selectedScheduleUser) {
      this.selectedDate = date;
      this.selectedShift = shift;
      this.assignEmployee(this.selectedScheduleUser);
      return;
    }

    this.selectedDate = date;
    this.selectedShift = shift;
    this.assignmentDialog = true;
  }

  assignEmployee(user: User): void {
    if (!this.selectedDate || !this.selectedShift) {
      return;
    }

    this.myData.createWorkShift({
      userId: user.id,
      shiftId: this.selectedShift.id,
      workDate: this.toDateKey(this.selectedDate),
      penaltyAmount: 0,
    }).subscribe({
      next: () => {
        this.assignmentDialog = false;
        this.loadScheduleData();
        this.showSuccess(`${user.fullName || user.username} đã được xếp ca.`);
      },
      error: (error) => this.showError(error.error || 'Nhân viên đã có ca này.'),
    });
  }

  updateAssignmentPenalty(change: PenaltyChange): void {
    const { assignment, penaltyAmount } = change;
    this.myData.updateWorkShift(assignment.id, {
      id: assignment.id,
      userId: assignment.userId,
      shiftId: assignment.shiftId,
      workDate: assignment.workDate,
      note: assignment.note,
      penaltyAmount,
    }).subscribe({
      next: () => {
        this.loadScheduleData();
        this.showSuccess('Đã cập nhật khoản trừ lương của ca làm.');
      },
      error: (error) => this.showError(error.error || 'Không thể cập nhật khoản trừ lương.'),
    });
  }

  removeAssignment(assignment: WorkShift): void {
    this.myData.deleteWorkShift(assignment.id).subscribe({
      next: () => {
        this.loadScheduleData();
        this.showSuccess('Lịch làm việc đã được cập nhật.');
      },
      error: () => this.showError('Không thể bỏ phân ca. Vui lòng thử lại.'),
    });
  }

  openUserSchedule(user: User): void {
    this.selectedScheduleUser = user;
    this.scheduleDialog = true;
  }

  openPayroll(): void {
    this.payrollDialog = true;
    this.loadPayroll();
  }

  onPayrollPeriod(period: 'weekly' | 'monthly'): void {
    this.payrollPeriod = period;
    this.loadPayroll();
  }

  exportPayroll(): void {
    if (!this.payrollReport) {
      return;
    }

    const header = ['Nhân viên', 'Lương/ca', 'Số ca', 'Tổng lương', 'Khấu trừ', 'Thực nhận'];
    const rows = this.payrollReport.employees.map((employee) => [
      employee.fullName || employee.username,
      employee.shiftSalary,
      employee.workShiftCount,
      employee.grossSalary,
      employee.deductionAmount,
      employee.netSalary,
    ]);
    const content = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' }));
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = `bao-cao-luong-${this.payrollReport.periodType}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private loadData(): void {
    this.myData.getAllUsers().subscribe({
      next: (users) => {
        this.users = Array.isArray(users) ? users : [];
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.users = [];
        this.showError('Không tải được nhân viên. Vui lòng kiểm tra kết nối API.');
      },
    });
  }

  private loadRoles(): void {
    this.myData.getAllRoles().subscribe({
      next: (roles) => {
        this.roles = Array.isArray(roles) ? roles : [];
        this.changeDetector.markForCheck();
      },
      error: () => this.showError('Không thể tải danh sách vai trò.'),
    });
  }

  private loadScheduleData(): void {
    const fromDate = this.toDateKey(this.weekStart);
    const toDate = this.toDateKey(this.addDays(this.weekStart, 6));

    this.myData.getAllShifts().subscribe({
      next: (shifts) => {
        this.shifts = shifts as Shift[];
        this.changeDetector.markForCheck();
      },
      error: () => this.showWarning('Không tải được danh sách ca làm.'),
    });

    this.myData.getWorkShifts(fromDate, toDate).subscribe({
      next: (workShifts) => {
        this.workShifts = workShifts as WorkShift[];
        this.changeDetector.markForCheck();
      },
      error: () => this.showWarning('Không tải được dữ liệu phân ca.'),
    });
  }

  private saveUser(): void {
    this.submitted = true;

    if (!this.user.username.trim() || !this.selectedRole) {
      return;
    }

    const request = {
      ...this.user,
      roleId: this.selectedRole.id,
    };
    const action = request.id
      ? this.myData.updateUser(request.id, request)
      : this.myData.createUser(request);

    action.subscribe({
      next: () => {
        this.userDialog = false;
        this.submitted = false;
        this.showSuccess(request.id ? 'Cập nhật người dùng thành công' : 'Tạo mới người dùng thành công');
        this.loadData();
      },
      error: (error) => this.showError(error.error || 'Không thể lưu người dùng.'),
    });
  }

  private loadPayroll(): void {
    this.myData.getPayroll(this.payrollPeriod, this.toDateKey(this.weekStart)).subscribe({
      next: (report) => {
        this.payrollReport = report as PayrollReport;
        this.changeDetector.markForCheck();
      },
      error: () => this.showError('Không tải được báo cáo lương. Vui lòng thử lại.'),
    });
  }

  private shiftAssignments(shift: Shift, day: Date): WorkShift[] {
    const dateKey = this.toDateKey(day);
    return this.workShifts.filter(
      (workShift) => workShift.shiftId === shift.id && workShift.workDate.slice(0, 10) === dateKey,
    );
  }

  private startOfWeek(date: Date): Date {
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

  private createEmptyUser(): User {
    return {
      id: 0,
      username: '',
      password: '',
      created: new Date(),
      updated: new Date(),
      deleted: false,
      shiftSalary: 0,
    };
  }

  private showSuccess(detail: string): void {
    this.messageService.add({ severity: 'success', summary: 'Thành công', detail });
  }

  private showWarning(detail: string): void {
    this.messageService.add({ severity: 'warn', summary: 'Lưu ý', detail });
  }

  private showError(detail: string): void {
    this.messageService.add({ severity: 'error', summary: 'Không thể thực hiện', detail });
  }
}
