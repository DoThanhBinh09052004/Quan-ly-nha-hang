import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { MyData } from '../../my-data';
import { User } from '../../../model/user.model';

import { ConfirmationService, MessageService } from 'primeng/api';
import { Table, TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { FileUploadModule } from 'primeng/fileupload';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { RippleModule } from 'primeng/ripple';
import { Role } from '../../../model/role.model';
import { AutoCompleteCompleteEvent, AutoCompleteModule } from 'primeng/autocomplete';
import { TagModule } from 'primeng/tag';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { UserHeaderComponent } from './components/user-header.component';
import { UserTableComponent } from './components/user-table.component';
import { UserFormDialogComponent } from './components/user-form-dialog.component';
import { WeeklyScheduleComponent } from './components/weekly-schedule.component';
import { ShiftAssignmentDialogComponent } from './components/shift-assignment-dialog.component';
import { PayrollReportDialogComponent } from './components/payroll-report-dialog.component';
import { PayrollReport, Shift, WorkShift } from './models/user-management.models';
import { ViewEncapsulation } from '@angular/core';

interface Column {
  field: string;
  header: string;
  customExportHeader?: string;
}

interface ExportColumn {
  title: string;
  dataKey: string;
}

@Component({
  selector: 'app-User',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ToastModule,
    ToolbarModule,
    ButtonModule,
    FileUploadModule,
    DialogModule,
    ConfirmDialogModule,
    InputTextModule,
    InputNumberModule,
    IconFieldModule,
    InputIconModule,
    RippleModule,
    AutoCompleteModule,TagModule,
    UserHeaderComponent, UserTableComponent, UserFormDialogComponent, WeeklyScheduleComponent, ShiftAssignmentDialogComponent, PayrollReportDialogComponent,
  ],
  providers: [MessageService, ConfirmationService, MyData],
  templateUrl: './user.html',
  styleUrl: './user.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class UserComponent implements OnInit {
  UserDialog: boolean = false;
  Users: User[] = [];
  User: User = {
    id: 0,
    username: '',
    //password: '',
    created: new Date(),
    updated: new Date(),
    deleted: false,
    
  };
  selectedUsers: User[] = [];
  submitted: boolean = false;

  @ViewChild('dt') dt!: Table;

  cols!: Column[];
  exportColumns!: ExportColumn[];
  roles:Role[]=[];
  selectedRole:Role | null = null;
  filteredRoles: Role[] = [];
  shifts: Shift[] = [];
  workShifts: WorkShift[] = [];
  weekStart = this.startOfWeek(new Date());
  scheduleDialog = false;
  assignmentDialog = false;
  payrollDialog = false;
  selectedScheduleUser: User | null = null;
  selectedDate: Date | null = null;
  selectedShift: Shift | null = null;
  selectedAssignment: WorkShift | null = null;
  payrollPeriod: 'weekly' | 'monthly' = 'weekly';
  payrollReport: PayrollReport | null = null;

  constructor(
    private mydata: MyData,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadData();
    this.loadRoles();
    this.loadScheduleData();
    this.cols = [
      { field: 'id', header: 'Mã' },
      { field: 'username', header: 'Tên' },
      { field: 'created', header: 'Ngày tạo' },
      { field: 'updated', header: 'Ngày cập nhật' },
    ];

    this.exportColumns = this.cols.map((col) => ({
      title: col.header,
      dataKey: col.field,
    }));
  }

  startOfWeek(date: Date): Date {
    const result = new Date(date);
    const day = result.getDay() || 7;
    result.setDate(result.getDate() - day + 1);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  get weekDays(): Date[] { return Array.from({ length: 7 }, (_, i) => { const d = new Date(this.weekStart); d.setDate(d.getDate() + i); return d; }); }
  get weekEnd(): Date { const d = new Date(this.weekStart); d.setDate(d.getDate() + 6); return d; }
  get weekRangeLabel(): string { return `${this.weekStart.toLocaleDateString('vi-VN')} - ${this.weekEnd.toLocaleDateString('vi-VN')}`; }

  loadScheduleData() {
    const from = this.toDateKey(this.weekStart);
    const to = this.toDateKey(this.weekEnd);
    this.mydata.getAllShifts().subscribe({
      next: (shifts) => { this.shifts = shifts as Shift[]; this.cd.markForCheck(); },
      error: () => this.messageService.add({ severity: 'warn', summary: 'Không tải được ca làm', detail: 'Dữ liệu phân ca vẫn được tải riêng.' })
    });
    this.mydata.getWorkShifts(from, to).subscribe({
      next: (workShifts) => {
        this.workShifts = workShifts as WorkShift[];
        if (!this.shifts.length) {
          this.shifts = Array.from(new Map(this.workShifts.filter(item => item.shift).map(item => [item.shiftId, item.shift!])).values());
        }
        this.cd.markForCheck();
      },
      error: () => this.messageService.add({ severity: 'warn', summary: 'Không tải được phân công', detail: 'Vui lòng kiểm tra lại lịch làm việc.' })
    });
  }

  previousWeek() { this.weekStart.setDate(this.weekStart.getDate() - 7); this.weekStart = new Date(this.weekStart); this.loadScheduleData(); }
  nextWeek() { this.weekStart.setDate(this.weekStart.getDate() + 7); this.weekStart = new Date(this.weekStart); this.loadScheduleData(); }
  goToCurrentWeek() { this.weekStart = this.startOfWeek(new Date()); this.loadScheduleData(); }
  formatTime(value: string): string { return value ? value.slice(0, 5) : ''; }
  shiftAssignments(shift: Shift, day: Date): WorkShift[] { const key = this.toDateKey(day); return this.workShifts.filter(ws => ws.shiftId === shift.id && String(ws.workDate).slice(0, 10) === key); }
  userAssignment(user: User, shift: Shift, day: Date): WorkShift | undefined { return this.shiftAssignments(shift, day).find(ws => ws.userId === user.id); }

  openAssignment(date: Date, shift: Shift, existing?: WorkShift) {
    if (!existing && this.scheduleDialog && this.selectedScheduleUser) {
      this.selectedDate = date;
      this.selectedShift = shift;
      this.assignEmployee(this.selectedScheduleUser);
      return;
    }

    this.selectedDate = date;
    this.selectedShift = shift;
    this.selectedAssignment = existing || null;
    this.assignmentDialog = true;
  }
  assignEmployee(user: User) {
    if (!this.selectedDate || !this.selectedShift) return;
    this.mydata.createWorkShift({ userId: user.id, shiftId: this.selectedShift.id, workDate: this.toDateKey(this.selectedDate), penaltyAmount: 0 }).subscribe({
      next: () => { this.assignmentDialog = false; this.loadScheduleData(); this.messageService.add({ severity: 'success', summary: 'Đã phân ca', detail: `${user.fullName || user.username} đã được xếp ca.` }); },
      error: (e) => this.messageService.add({ severity: 'warn', summary: 'Không thể phân ca', detail: e.error || 'Nhân viên đã có ca này.' })
    });
  }
  removeAssignment(assignment: WorkShift) {
    this.mydata.deleteWorkShift(assignment.id).subscribe(() => { this.loadScheduleData(); this.messageService.add({ severity: 'success', summary: 'Đã bỏ phân ca', detail: 'Lịch làm việc đã được cập nhật.' }); });
  }
  openUserSchedule(user: User) { this.selectedScheduleUser = user; this.scheduleDialog = true; }
  getUserShiftCount(user: User): number { return this.workShifts.filter(ws => ws.userId === user.id).length; }

  openPayroll() { this.payrollDialog = true; this.loadPayroll(); }
  loadPayroll() { this.mydata.getPayroll(this.payrollPeriod, this.toDateKey(this.weekStart)).subscribe({ next: r => { this.payrollReport = r as PayrollReport; this.cd.markForCheck(); }, error: () => this.messageService.add({ severity: 'error', summary: 'Không tải được báo cáo lương', detail: 'Vui lòng thử lại.' }) }); }
  onPayrollPeriod(period: 'weekly' | 'monthly') { this.payrollPeriod = period; this.loadPayroll(); }
  get shiftCounts(): Record<number, number> { return this.workShifts.reduce((counts, item) => ({ ...counts, [item.userId]: (counts[item.userId] || 0) + 1 }), {} as Record<number, number>); }
  get selectedAssignments(): WorkShift[] { return this.selectedShift && this.selectedDate ? this.shiftAssignments(this.selectedShift, this.selectedDate) : []; }
  saveForm(value: { user: User; role: Role | null }) { this.User = value.user; this.selectedRole = value.role; this.saveUser(); }
  exportPayroll() {
    if (!this.payrollReport) return;
    const header = ['Nhân viên', 'Lương/ca', 'Số ca', 'Tổng lương', 'Khấu trừ', 'Thực nhận'];
    const rows = this.payrollReport.employees.map((x: any) => [x.fullName || x.username, x.shiftSalary, x.workShiftCount, x.grossSalary, x.deductionAmount, x.netSalary]);
    const content = [header, ...rows].map(r => r.map((v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url; a.download = `bao-cao-luong-${this.payrollReport.periodType}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  loadData() {
    this.mydata.getAllUsers().subscribe({
      next: (data) => {
        this.Users = Array.isArray(data) ? data : [];
        this.cd.markForCheck();
      },
      error: () => {
        this.Users = [];
        this.messageService.add({ severity: 'error', summary: 'Không tải được nhân viên', detail: 'Vui lòng kiểm tra lại kết nối API.' });
      }
    });
  }
  loadRoles() {
    this.mydata.getAllRoles().subscribe((data) => {
      this.roles=data;
      console.log('Roles loaded:', data);
      this.cd.markForCheck();
    });
  }
  searchRoles(event: AutoCompleteCompleteEvent) {
    const query = event.query.toLowerCase();
    if (query.trim().length === 0) {
      this.filteredRoles = [...this.roles];
    } else {
      this.filteredRoles = this.roles.filter((role) =>
        role.name.toLowerCase().includes(query)
      );
    }
    console.log('Filtered role:', this.filteredRoles); // Kiểm tra dữ liệu
    this.cd.markForCheck();
  }


 
  openNew() {
    this.User = {
      id: 0,
      username: '',
      password: '',
      created: new Date(),
      updated: new Date(),
      deleted: false,
      shiftSalary: 0,
    
    };
    this.selectedRole = null;
    
    this.submitted = false;
    this.UserDialog = true;
  }

  hideDialog() {
    this.UserDialog = false;
    this.submitted = false;
  }

  editUser(User: User) {
    // Không đưa mật khẩu hiện tại lên giao diện; để trống sẽ được backend giữ nguyên.
    this.User = { ...User, password: '' };
    this.selectedRole = this.roles.find(role => role.id === User.roleId || role.id === User.role?.id) || null;
    this.UserDialog = true;
  }

  saveUser() {
    console.log('Saving User:', this.User);
    console.log('Selected Role:', this.selectedRole);
    this.submitted = true;
    if (this.User.username.trim() && this.selectedRole) {
      this.User.roleId = this.selectedRole.id;
      if (this.User.id) {
        this.mydata.updateUser(this.User.id, this.User).subscribe(() => {
          this.messageService.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Cập nhật người dùng thành công',
          });
          this.loadData();
          this.hideDialog();
        });
      } else {
        this.mydata.createUser(this.User).subscribe(() => {
          this.messageService.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Tạo mới người dùng thành công',
          });
          this.loadData();
          this.hideDialog();
        });
      }
    }
  }

  deleteUser(User: User) {
    this.confirmationService.confirm({
      message: 'Bạn có chắc chắn muốn xóa người dùng này?',
      icon: 'pi pi-exclamation-triangle',
      header: 'Xác nhận xóa',
      accept: () => {
        this.mydata.deleteUser(User.id).subscribe(() => {
          this.messageService.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Xóa người dùng thành công',
          });
          this.loadData();
        });
      },
    });
  }

  deleteSelectedUsers() {
    this.confirmationService.confirm({
      message: 'Bạn có chắc chắn muốn xóa các người dùng đã chọn?',
      header: 'Xác nhận xóa',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        const deletes = this.selectedUsers.map((u) =>
          this.mydata.deleteUser(u.id)
        );
        forkJoin(deletes).subscribe(() => {
          this.messageService.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Đã xóa các người dùng đã chọn',
          });
          this.selectedUsers = [];
          this.loadData();
        });
      },
    });
  }

  onGlobalFilter(event: Event, table: Table) {
    const input = (event.target as HTMLInputElement).value;
    table.filterGlobal(input, 'contains');
  }

  convertToLocalTime(utcDate: string | Date): Date {
    const date = new Date(utcDate);
    return new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
  }
}

