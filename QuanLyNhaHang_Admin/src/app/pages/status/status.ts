import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { MyData } from '../../my-data';
import { Table, TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { RippleModule } from 'primeng/ripple';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { RadioButtonModule } from 'primeng/radiobutton';
import { RatingModule } from 'primeng/rating';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { FileUploadModule } from 'primeng/fileupload';
import { forkJoin } from 'rxjs';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { Status } from '../../../model/status.model';
import { CommonModule } from '@angular/common';
import { AutoCompleteCompleteEvent, AutoCompleteModule } from 'primeng/autocomplete';

interface Column {
  field: string;
  header: string;
  customExportHeader?: string;
  exportFunction?: (row: Status) => string;
}

interface ExportColumn {
  title: string;
  dataKey: string;
}

@Component({
  selector: 'app-status',
  standalone: true,
  imports: [
    ToastModule,
    ToolbarModule,
    ButtonModule,
    FileUploadModule,
    TableModule,
    DialogModule,
    ConfirmDialogModule,
    TagModule,
    RadioButtonModule,
    RatingModule,
    InputNumberModule,
    IconFieldModule,
    RippleModule,
    InputIconModule,
    FormsModule,
    InputTextModule,
    CommonModule,
    AutoCompleteModule,
    
    
  ],
  providers: [MessageService, ConfirmationService, MyData],
  templateUrl: './status.html',
  styleUrl: './status.scss',
})
export class Statuscomponent {
  StatusDialog: boolean = false;
  Statues!: Status[];
  Status: Status = {
    id: 0,
    name: '',
    description: '',
    created: new Date(),
    updated: new Date(),
    deleted: false,
  };
  selectedStatues!: Status[];
  submitted: boolean = false;

  @ViewChild('dt') dt!: Table;

  cols!: Column[];
  exportColumns!: ExportColumn[];

 

  constructor(
    private mydata: MyData,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private cd: ChangeDetectorRef
  ) {}

  // Xuất dữ liệu ra file CSV
  exportCSV() {
    this.dt.exportCSV();
  }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.mydata.getAllStatuses().subscribe((data) => {
      this.Statues = data;
      this.cd.markForCheck();
      console.log('Statuses loaded:', this.Statues);
    });

    this.cols = [
      { field: 'id', header: 'ID', customExportHeader: 'Status ID' },
      { field: 'name', header: 'Tên' },
      { field: 'description', header: 'Chú thích' },
      { field: 'created', header: 'Ngày tạo' },
      { field: 'updated', header: 'Ngày cập nhật' },
    ];

    this.exportColumns = this.cols.map((col) => ({
      title: col.header,
      dataKey: col.field,
    }));
  }


  openNew() {
    this.Status = {
      id: 0,
      name: '',
      description: '',
      created: new Date(),
      updated: new Date(),
      deleted: false,
    };
    this.submitted = false;
    this.StatusDialog = true;
  }

  hideDialog() {
    this.StatusDialog = false;
    this.submitted = false;
  }

  editStatus(Status: Status) {
    this.Status = { ...Status };
    this.StatusDialog = true;
  }

  saveStatus() {
    this.submitted = true;
    if (this.Status.name.trim()) {
      if (this.Status.id) {
        this.mydata.updateStatus(this.Status.id, this.Status).subscribe(() => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Cập nhật Status thành công',
          });
          this.loadData();
          this.hideDialog();
        });
      } else {
        this.mydata.createStatus(this.Status).subscribe(() => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Tạo mới Status thành công',
          });
          this.loadData();
          this.hideDialog();
        });
      }
    }
  }

  deleteStatus(Status: Status) {
    this.confirmationService.confirm({
      message: 'Bạn có chắc chắn muốn xóa Status này?',
      icon: 'pi pi-exclamation-triangle',
      header: 'Xác nhận xóa',
      accept: () => {
        this.mydata.deleteStatus(Status.id).subscribe(() => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Xóa Status thành công',
          });
          this.loadData();
        });
      },
    });
  }

  deleteSelectedStatues(Statues: Status[]) {
    this.confirmationService.confirm({
      message: 'Bạn có chắc chắn muốn xoá các Status đã chọn?',
      header: 'Xác nhận xoá',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        const deletes = this.selectedStatues.map((r) =>
          this.mydata.deleteStatus(r.id)
        );
        forkJoin(deletes).subscribe(() => {
          this.messageService.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Đã xoá Status',
          });
          this.selectedStatues = [];
          this.loadData();
        });
      },
    });
  }
  
  
}
