import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize, Observable, timeout } from 'rxjs';
import { Router } from '@angular/router';

import { ConfirmationService, MessageService } from 'primeng/api';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { Table, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { RippleModule } from 'primeng/ripple';
import { TooltipModule } from 'primeng/tooltip';

import { MyData } from '../../my-data';
import { GuestTable } from '../../../model/guesttable.model';
import { Status } from '../../../model/status.model';
import {
  Reservation,
  ReservationRequest,
} from '../../../model/reservation.model';

@Component({
  selector: 'app-guest-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AutoCompleteModule,
    ButtonModule,
    ConfirmDialogModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    TableModule,
    TagModule,
    ToastModule,
    RippleModule,
    TooltipModule,
  ],
  providers: [MessageService, ConfirmationService, MyData],
  templateUrl: './guesttable.html',
  styleUrls: ['./guesttable.scss'],
})
export class GuesttableComponent implements OnInit {
  @ViewChild('reservationTable') reservationTable!: Table;

  selectedDate = this.toDateInputValue(new Date());
  selectedTableId?: number;
  reservations: Reservation[] = [];
  guestTables: GuestTable[] = [];
  reservationStatuses: Status[] = [];
  availableTables: GuestTable[] = [];
  selectedReservationTable: GuestTable | null = null;
  reservationForm: ReservationRequest = this.createEmptyReservationForm();
  reservationId?: number;
  reservationDialog = false;
  tableDialog = false;
  tableForm: GuestTable = this.createEmptyTableForm();
  selectedTableDetail: GuestTable | null = null;
  tableDetailDialog = false;
  tableSearch = '';
  tableFloorFilter?: number;
  tableStatusFilter = '';
  submitted = false;
  loadingReservations = false;
  loadingTables = false;
  findingTables = false;
  private availableTableRequestVersion = 0;

  constructor(
    private readonly mydata: MyData,
    private readonly messageService: MessageService,
    private readonly confirmationService: ConfirmationService,
    private readonly router: Router,
    private readonly cd: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loadTables();
    this.loadReservationStatuses();
    this.loadReservations();
  }

  loadReservationStatuses(): void {
    this.mydata.getAllStatuses().subscribe({
      next: (statuses) => {
        this.reservationStatuses = (Array.isArray(statuses) ? statuses : [])
          .filter(status => status.type === 'RESERVATION');
        this.cd.markForCheck();
      },
      error: (error) => this.showApiError(error, 'Không thể tải trạng thái lịch hẹn.'),
    });
  }

  loadTables(): void {
    this.loadingTables = true;
    this.mydata.getAllGuestTables()
      .pipe(finalize(() => {
        this.loadingTables = false;
        this.cd.markForCheck();
      }))
      .subscribe({
        next: (tables) => this.guestTables = Array.isArray(tables) ? tables : [],
        error: (error) => this.showApiError(error, 'Không thể tải danh sách bàn.'),
      });
  }

  loadReservations(): void {
    this.loadingReservations = true;
    this.mydata.getReservations(this.selectedDate, this.selectedTableId)
      .pipe(finalize(() => {
        this.loadingReservations = false;
        this.cd.markForCheck();
      }))
      .subscribe({
        next: (reservations) => this.reservations = Array.isArray(reservations) ? reservations : [],
        error: (error) => {
          this.reservations = [];
          this.showApiError(error, 'Không thể tải lịch hẹn.');
        },
      });
  }

  openNewReservation(): void {
    this.reservationId = undefined;
    this.reservationForm = this.createEmptyReservationForm();
    this.selectedReservationTable = null;
    this.availableTables = [];
    this.submitted = false;
    this.reservationDialog = true;
    this.findAvailableTables();
  }

  openNewTable(): void {
    this.tableForm = this.createEmptyTableForm();
    this.tableDialog = true;
  }

  editTable(table: GuestTable): void {
    this.tableForm = { ...table };
    this.tableDialog = true;
  }

  openTableDetails(table: GuestTable): void {
    this.selectedTableDetail = table;
    this.tableDetailDialog = true;
  }

  hideTableDetails(): void {
    this.tableDetailDialog = false;
    this.selectedTableDetail = null;
  }

  editSelectedTable(): void {
    if (this.selectedTableDetail) {
      this.editTable(this.selectedTableDetail);
      this.hideTableDetails();
    }
  }

  hideTableDialog(): void {
    this.tableDialog = false;
  }

  saveTable(): void {
    if (!this.tableForm.name.trim() || this.tableForm.capacity < 1 || this.tableForm.floor < 1) {
      this.messageService.add({ severity: 'warn', summary: 'Thiếu thông tin', detail: 'Nhập tên bàn, sức chứa và tầng hợp lệ.' });
      return;
    }

    const payload: GuestTable = {
      ...this.tableForm,
      name: this.tableForm.name.trim(),
      description: this.tableForm.description?.trim(),
      updated: new Date(),
      deleted: false,
      statusManuallyOverridden: false,
    };
    const action = payload.id
      ? this.mydata.updateGuestTable(payload.id, payload)
      : this.mydata.createGuestTable(payload);

    action.subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Thành công', detail: payload.id ? 'Đã cập nhật bàn.' : 'Đã tạo bàn mới.' });
        this.hideTableDialog();
        this.refresh();
      },
      error: (error) => this.showApiError(error, 'Không thể lưu bàn.'),
    });
  }

  deleteTable(table: GuestTable): void {
    this.confirmationService.confirm({
      header: 'Xóa bàn',
      message: `Xóa ${table.name}? Thao tác này không thể hoàn tác.`,
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.mydata.deleteGuestTable(table.id).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Thành công', detail: 'Đã xóa bàn.' });
          this.refresh();
        },
        error: (error) => this.showApiError(error, 'Không thể xóa bàn.'),
      }),
    });
  }

  editReservation(reservation: Reservation): void {
    this.reservationId = reservation.id;
    this.reservationForm = {
      guestTableId: reservation.guestTableId,
      guestId: reservation.guestId,
      guestName: reservation.guestName,
      phone: reservation.phone,
      partySize: reservation.partySize,
      reservationTime: this.toDateTimeLocalValue(reservation.reservationTime),
      durationMinutes: reservation.durationMinutes,
      note: reservation.note,
    };
    this.selectedReservationTable = this.guestTables.find(table => table.id === reservation.guestTableId) ?? null;
    this.availableTables = this.selectedReservationTable ? [this.selectedReservationTable] : [];
    this.submitted = false;
    this.reservationDialog = true;
    this.findAvailableTables();
  }

  hideReservationDialog(): void {
    this.reservationDialog = false;
    this.submitted = false;
    this.findingTables = false;
  }

  findAvailableTables(): void {
    if (!this.reservationForm.reservationTime || !this.reservationForm.durationMinutes || !this.reservationForm.partySize) {
      return;
    }

    const requestVersion = ++this.availableTableRequestVersion;
    this.findingTables = true;
    this.mydata.getReservationAvailableTables({
      start: this.reservationForm.reservationTime,
      durationMinutes: this.reservationForm.durationMinutes,
      partySize: this.reservationForm.partySize,
      excludedReservationId: this.reservationId,
    })
      .pipe(timeout(10000), finalize(() => {
        if (requestVersion === this.availableTableRequestVersion) {
          this.findingTables = false;
        }
        this.cd.markForCheck();
      }))
      .subscribe({
        next: (tables) => {
          if (requestVersion !== this.availableTableRequestVersion) return;
          this.availableTables = Array.isArray(tables) ? tables : [];
          const selectedStillAvailable = this.selectedReservationTable &&
            this.availableTables.some(table => table.id === this.selectedReservationTable?.id);
          if (!selectedStillAvailable) {
            this.selectedReservationTable = null;
            this.reservationForm.guestTableId = 0;
          }
        },
        error: (error) => {
          if (requestVersion === this.availableTableRequestVersion) {
            this.availableTables = [];
            this.showApiError(error, 'Không thể kiểm tra bàn trống.');
          }
        },
      });
  }

  onAvailableTableDropdownClick(): void {
    this.findAvailableTables();
  }

  onReservationTableSelect(table: GuestTable): void {
    this.reservationForm.guestTableId = table.id;
  }

  saveReservation(): void {
    this.submitted = true;
    if (!this.isReservationFormValid()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Thiếu thông tin',
        detail: 'Vui lòng nhập đủ thông tin và chọn bàn còn trống.',
      });
      return;
    }

    const request: ReservationRequest = {
      ...this.reservationForm,
      guestName: this.reservationForm.guestName.trim(),
      phone: this.reservationForm.phone.trim(),
      note: this.reservationForm.note?.trim() || undefined,
    };
    const action = this.reservationId
      ? this.mydata.updateReservation(this.reservationId, request)
      : this.mydata.createReservation(request);

    action.subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Thành công',
          detail: this.reservationId ? 'Đã cập nhật lịch hẹn.' : 'Đã tạo lịch hẹn.',
        });
        this.hideReservationDialog();
        this.refresh();
      },
      error: (error) => this.showApiError(error, 'Không thể lưu lịch hẹn.'),
    });
  }

  confirmReservation(reservation: Reservation): void {
    this.confirmReservationAction(reservation, 'Xác nhận lịch hẹn này?', () => this.mydata.confirmReservation(reservation.id));
  }

  cancelReservation(reservation: Reservation): void {
    this.confirmReservationAction(reservation, 'Hủy lịch hẹn này?', () => this.mydata.cancelReservation(reservation.id));
  }

  markNoShow(reservation: Reservation): void {
    this.confirmReservationAction(reservation, 'Đánh dấu khách không đến?', () => this.mydata.markReservationNoShow(reservation.id));
  }

  createOrderFromReservation(reservation: Reservation): void {
    this.router.navigate(['/order'], {
      queryParams: { reservationId: reservation.id, autoCreate: true },
    });
  }

  canEdit(reservation: Reservation): boolean {
    return !['arrived', 'completed'].includes(this.statusKey(reservation.status));
  }

  canCreateOrder(reservation: Reservation): boolean {
    return this.statusKey(reservation.status) === 'confirmed';
  }

  isPending(reservation: Reservation): boolean { return this.statusKey(reservation.status) === 'pending'; }
  isCancelledOrNoShow(reservation: Reservation): boolean { return ['cancelled', 'no_show'].includes(this.statusKey(reservation.status)); }
  isConfirmed(reservation: Reservation): boolean { return this.statusKey(reservation.status) === 'confirmed'; }

  statusLabel(status: string): string {
    return this.reservationStatuses.find(item => item.code === status)?.name ?? status;
  }

  statusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    const key = this.statusKey(status);
    if (key === 'confirmed') return 'info';
    if (key === 'arrived' || key === 'completed') return 'success';
    if (key === 'pending') return 'warn';
    if (key === 'cancelled' || key === 'no_show') return 'danger';
    return 'secondary';
  }

  tableStatusSeverity(table: GuestTable): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    if (table.status?.code === 'TABLE_AVAILABLE') return 'success';
    if (table.status?.code === 'TABLE_RESERVED') return 'warn';
    if (table.status?.code === 'TABLE_OCCUPIED') return 'danger';
    return 'secondary';
  }

  tableCardClass(table: GuestTable): string {
    return `table-card--${this.tableState(table)}`;
  }

  get filteredGuestTables(): GuestTable[] {
    const search = this.tableSearch.trim().toLowerCase();
    return this.guestTables.filter(table => {
      const matchesSearch = !search || [table.name, table.description, table.currentGuestName]
        .filter(Boolean)
        .some(value => value!.toLowerCase().includes(search));
      const matchesFloor = !this.tableFloorFilter || table.floor === this.tableFloorFilter;
      const matchesStatus = !this.tableStatusFilter || this.tableState(table) === this.tableStatusFilter;
      return matchesSearch && matchesFloor && matchesStatus;
    });
  }

  get tableFloors(): number[] {
    return [...new Set(this.guestTables.map(table => table.floor))].sort((left, right) => left - right);
  }

  private tableState(table: GuestTable): 'available' | 'occupied' | 'reserved' | 'unknown' {
    const code = table.status?.code || '';
    if (code.endsWith('AVAILABLE')) return 'available';
    if (code.endsWith('OCCUPIED')) return 'occupied';
    if (code.endsWith('RESERVED')) return 'reserved';
    return 'unknown';
  }

  get pendingCount(): number {
    return this.reservations.filter(item => this.statusKey(item.status) === 'pending').length;
  }

  get confirmedCount(): number {
    return this.reservations.filter(item => this.statusKey(item.status) === 'confirmed').length;
  }

  get arrivedCount(): number {
    return this.reservations.filter(item => this.statusKey(item.status) === 'arrived').length;
  }

  private confirmReservationAction(reservation: Reservation, message: string, action: () => Observable<Reservation>): void {
    this.confirmationService.confirm({
      header: 'Xác nhận thao tác',
      message,
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        action().subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Thành công', detail: 'Đã cập nhật trạng thái lịch hẹn.' });
            this.refresh();
          },
          error: (error) => this.showApiError(error, 'Không thể cập nhật trạng thái lịch hẹn.'),
        });
      },
    });
  }

  private isReservationFormValid(): boolean {
    return Boolean(
      this.reservationForm.guestTableId &&
      this.reservationForm.guestName?.trim() &&
      this.reservationForm.phone?.trim() &&
      this.reservationForm.partySize > 0 &&
      this.reservationForm.durationMinutes >= 15 &&
      this.reservationForm.reservationTime,
    );
  }

  private statusKey(status: string): string {
    return status.replace(/^RESERVATION_/, '').toLowerCase();
  }

  private createEmptyReservationForm(): ReservationRequest {
    const nextHour = new Date();
    nextHour.setMinutes(0, 0, 0);
    nextHour.setHours(nextHour.getHours() + 1);
    return {
      guestTableId: 0,
      guestName: '',
      phone: '',
      partySize: 2,
      reservationTime: this.toDateTimeLocalValue(nextHour),
      durationMinutes: 120,
      note: '',
    };
  }

  private createEmptyTableForm(): GuestTable {
    return {
      id: 0,
      name: '',
      description: '',
      capacity: 4,
      floor: 1,
      created: new Date(),
      updated: new Date(),
      deleted: false,
      statusManuallyOverridden: false,
    };
  }

  private toDateInputValue(date: Date): string {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  private toDateTimeLocalValue(value: Date | string): string {
    const date = value instanceof Date ? value : new Date(value);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }

  private showApiError(error: any, fallback: string): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Có lỗi xảy ra',
      detail: error?.error?.message || error?.error || fallback,
    });
  }
}
