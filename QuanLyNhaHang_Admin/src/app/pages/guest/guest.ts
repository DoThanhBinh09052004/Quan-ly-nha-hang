import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { forkJoin } from 'rxjs';
import { Guest } from '../../../model/guest.model';
import { AiCustomerSegmentResponse, MyData } from '../../my-data';

import { GuestToolbarComponent } from './components/guest-toolbar/guest-toolbar.component';
import { GuestListComponent } from './components/guest-list/guest-list.component';
import { GuestFormDialogComponent } from './components/guest-form-dialog/guest-form-dialog.component';
import { GuestAnalysisDialogComponent } from './components/guest-analysis-dialog/guest-analysis-dialog.component';

interface FeatureRow { key: string; label: string; value: number; center: number; format: 'number' | 'currency' | 'percent' | 'days' | 'minutes'; }

@Component({
  selector: 'app-guest',
  standalone: true,
  imports: [
    CommonModule, 
    ToastModule, 
    ConfirmDialogModule,
    GuestToolbarComponent,
    GuestListComponent,
    GuestFormDialogComponent,
    GuestAnalysisDialogComponent
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './guest.html',
  styleUrl: './guest.scss'
})
export class GuestComponent implements OnInit {
  guests: Guest[] = [];
  selectedGuests: Guest[] = [];
  guestDialog = false;
  analysisDialog = false;
  loadingGuests = false;
  loadingAnalysis = false;
  submitted = false;
  editingGuest: Guest = this.emptyGuest();
  selectedGuest?: Guest;
  analysis?: AiCustomerSegmentResponse;

  readonly featureMeta: Record<string, Pick<FeatureRow, 'label' | 'format'>> = {
    recency_days: { label: 'Số ngày từ lần ghé gần nhất', format: 'days' },
    frequency: { label: 'Số lượt mua', format: 'number' },
    monetary_sum: { label: 'Tổng chi tiêu', format: 'currency' },
    monetary_avg: { label: 'Giá trị đơn trung bình', format: 'currency' },
    party_avg: { label: 'Số khách/bàn trung bình', format: 'number' },
    duration_avg: { label: 'Thời lượng dùng bữa TB', format: 'minutes' },
    weekend_ratio: { label: 'Tỷ lệ ghé cuối tuần', format: 'percent' },
    evening_ratio: { label: 'Tỷ lệ ghé buổi tối', format: 'percent' },
    tenure_days: { label: 'Thời gian gắn bó', format: 'days' },
    points: { label: 'Điểm tích lũy', format: 'number' },
    account_age_days: { label: 'Tuổi tài khoản', format: 'days' }
  };

  constructor(private readonly data: MyData, private readonly messages: MessageService, private readonly confirmation: ConfirmationService) {}

  ngOnInit(): void { this.loadGuests(); }

  get featureRows(): FeatureRow[] {
    if (!this.analysis) return [];
    return Object.entries(this.featureMeta).map(([key, meta]) => ({ key, ...meta, value: this.analysis?.features[key] ?? 0, center: this.analysis?.clusterFeatures[key] ?? 0 }));
  }

  loadGuests(): void {
    this.loadingGuests = true;
    this.data.getAllGuests().subscribe({
      next: guests => { this.guests = guests; this.loadingGuests = false; },
      error: () => { this.loadingGuests = false; this.messages.add({ severity: 'error', summary: 'Không thể tải', detail: 'Không thể lấy danh sách khách hàng.' }); }
    });
  }

  openNew(): void { this.editingGuest = this.emptyGuest(); this.submitted = false; this.guestDialog = true; }
  edit(guest: Guest): void { this.editingGuest = { ...guest }; this.submitted = false; this.guestDialog = true; }
  closeGuestDialog(visible: boolean): void { this.guestDialog = visible; this.submitted = false; }
  closeAnalysisDialog(visible: boolean): void { this.analysisDialog = visible; }
  onSelectionChange(selection: Guest[]): void { this.selectedGuests = selection; }

  saveGuest(savedGuest: Guest): void {
    this.submitted = true;
    if (!savedGuest.name.trim() || !savedGuest.phone.trim()) return;
    const request = { ...savedGuest };
    const result = request.id ? this.data.updateGuest(request.id, request) : this.data.createGuest(request);
    result.subscribe({
      next: () => { this.messages.add({ severity: 'success', summary: 'Thành công', detail: request.id ? 'Đã cập nhật khách hàng.' : 'Đã thêm khách hàng.' }); this.closeGuestDialog(false); this.loadGuests(); },
      error: () => this.messages.add({ severity: 'error', summary: 'Không thể lưu', detail: 'Vui lòng kiểm tra lại dữ liệu.' })
    });
  }

  delete(guest: Guest): void {
    this.confirmation.confirm({ header: 'Xác nhận xóa', message: `Xóa khách hàng ${guest.name}?`, icon: 'pi pi-exclamation-triangle', accept: () => this.data.deleteGuest(guest.id).subscribe({ next: () => this.loadGuests(), error: () => this.messages.add({ severity: 'error', summary: 'Không thể xóa', detail: 'Thao tác xóa không thành công.' }) }) });
  }

  deleteSelected(): void {
    if (!this.selectedGuests.length) return;
    this.confirmation.confirm({
      header: 'Xác nhận xóa',
      message: `Xóa ${this.selectedGuests.length} khách hàng đã chọn?`,
      icon: 'pi pi-exclamation-triangle',
      accept: () => forkJoin(this.selectedGuests.map(guest => this.data.deleteGuest(guest.id))).subscribe({
        next: () => { this.selectedGuests = []; this.loadGuests(); },
        error: () => this.messages.add({ severity: 'error', summary: 'Không thể xóa', detail: 'Một hoặc nhiều khách hàng chưa được xóa.' })
      })
    });
  }

  analyze(guest: Guest): void {
    this.selectedGuest = guest;
    this.analysis = undefined;
    this.analysisDialog = true;
    this.loadingAnalysis = true;
    this.data.getCustomerSegment(guest.id).subscribe({
      next: analysis => { this.analysis = analysis; this.loadingAnalysis = false; },
      error: () => { this.loadingAnalysis = false; this.messages.add({ severity: 'error', summary: 'Không thể phân tích', detail: 'Dữ liệu AI chưa sẵn sàng.' }); }
    });
  }

  private emptyGuest(): Guest { return { id: 0, name: '', phone: '', description: '', points: 0, created: new Date(), updated: new Date(), deleted: false }; }
}
