import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Table, TableModule } from 'primeng/table';
import { MyData } from '../my-data';
import { Button } from "primeng/button";
import { FileUpload } from "primeng/fileupload";
import { Toolbar } from "primeng/toolbar";
import { Toast } from "primeng/toast";
import { ConfirmDialog } from "primeng/confirmdialog";
import { Dialog } from "primeng/dialog";
import { FormsModule } from '@angular/forms'; 
import { FileUploadModule } from 'primeng/fileupload';
import { DatePipe } from '@angular/common';


@Component({
  selector: 'app-image',
  standalone: true,
  imports: [Button, FileUpload, Toolbar, Toast, ConfirmDialog, TableModule, Dialog, FormsModule, FileUploadModule,DatePipe],
  providers: [MessageService, ConfirmationService, MyData],
  templateUrl: './itemimage.html',
  styleUrls: ['./itemimage.scss'],
})
export class ItemimageComponent {
  ImageDialog: boolean = false;
  images: any[] = [];
  image: any = { id: 0, name: '', description: '', data: '' };

  @ViewChild('dt') dt!: Table;
  @ViewChild('fileUpload') fileUpload!: FileUpload;

  constructor(
    private mydata: MyData,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.mydata.getAllImages().subscribe((data) => {
      this.images = data;
      this.cd.markForCheck();
    });
  }

  openNew() {
    this.image = { id: 0, name: '', description: '', data: '' };
    this.ImageDialog = true;
  }

  hideDialog() {
    this.ImageDialog = false;
  }

  uploadImage(event: any) {
    if (!this.image.name) {
      this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Tên ảnh bắt buộc' });
      return;
    }

    const file = event.files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', this.image.name);
    formData.append('description', this.image.description || '');

    this.mydata.createImage(formData).subscribe(() => {
      this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Upload thành công' });
      this.loadData();
      this.ImageDialog = false;
      this.fileUpload.clear();
    });
  }

  deleteImage(image: any) {
    this.confirmationService.confirm({
      message: 'Xóa hình này?',
      accept: () => {
        this.mydata.deleteImage(image.id).subscribe(() => {
          this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Xóa thành công' });
          this.loadData();
        });
      },
    });
  }
  convertToLocalTime(utcDate: string | Date): Date {
    const date = new Date(utcDate);
    return new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
  }
}
