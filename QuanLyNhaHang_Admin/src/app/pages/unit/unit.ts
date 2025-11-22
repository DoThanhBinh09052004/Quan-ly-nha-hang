import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { MyData } from '../../my-data';
import { Unit } from '../../../model/unit.model';

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
  selector: 'app-unit',
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
  ],
  providers: [MessageService, ConfirmationService, MyData],
  templateUrl: './unit.html',
  styleUrl: './unit.scss',
})
export class UnitComponent implements OnInit {
  unitDialog: boolean = false;
  units!: Unit[];
  unit: Unit = this.createEmptyUnit();
  selectedUnits!: Unit[];
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

  ngOnInit() {
    this.loadData();

    this.cols = [
      { field: 'id', header: 'Mã' },
      { field: 'name', header: 'Tên' },
      { field: 'description', header: 'Mô tả' },
      { field: 'created', header: 'Ngày tạo' },
      { field: 'updated', header: 'Ngày cập nhật' },
    ];

    this.exportColumns = this.cols.map((col) => ({
      title: col.header,
      dataKey: col.field,
    }));
  }

  loadData() {
    // Giả định mydata.getAllUnits() tồn tại
    this.mydata.getAllUnits().subscribe((data) => {
      this.units = data;
      this.cd.markForCheck();
      console.log('Units loaded:', this.units);
    });
  }

  createEmptyUnit(): Unit {
    return {
      id: 0,
      name: '',
      description: '',
      created: new Date(),
      updated: new Date(),
      deleted: false,
    };
  }

  openNew() {
    this.unit = this.createEmptyUnit();
    this.submitted = false;
    this.unitDialog = true;
  }

  hideDialog() {
    this.unitDialog = false;
    this.submitted = false;
  }

  editUnit(unit: Unit) {
    this.unit = { ...unit };
    this.unitDialog = true;
  }

  saveUnit() {
    console.log('Saving unit:', this.unit);
    this.submitted = true;
    if (this.unit.name.trim()) {
      if (this.unit.id) {
        // Giả định mydata.updateUnit() tồn tại
        this.mydata.updateUnit(this.unit.id, this.unit).subscribe(() => {
          this.messageService.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Cập nhật đơn vị hàng tính thành công',
          });
          this.loadData();
          this.hideDialog();
        });
      } else {
        // Giả định mydata.createUnit() tồn tại
        this.mydata.createUnit(this.unit).subscribe(() => {
          this.messageService.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Tạo mới đơn vị hàng tính thành công',
          });
          this.loadData();
          this.hideDialog();
        });
      }
    }
  }

  deleteUnit(unit: Unit) {
    this.confirmationService.confirm({
      message: 'Bạn có chắc chắn muốn xóa đơn vị hàng tính này?',
      icon: 'pi pi-exclamation-triangle',
      header: 'Xác nhận xóa',
      accept: () => {
        // Giả định mydata.deleteUnit() tồn tại
        this.mydata.deleteUnit(unit.id).subscribe(() => {
          this.messageService.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Xóa đơn vị hàng tính thành công',
          });
          this.loadData();
        });
      },
    });
  }

  deleteSelectedUnits() {
    this.confirmationService.confirm({
      message: 'Bạn có chắc chắn muốn xoá các đơn vị hàng tính đã chọn?',
      header: 'Xác nhận xoá',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        const deletes = this.selectedUnits.map((u) =>
          this.mydata.deleteUnit(u.id)
        );
        forkJoin(deletes).subscribe(() => {
          this.messageService.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Đã xoá các đơn vị hàng tính đã chọn',
          });
          this.selectedUnits = [];
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