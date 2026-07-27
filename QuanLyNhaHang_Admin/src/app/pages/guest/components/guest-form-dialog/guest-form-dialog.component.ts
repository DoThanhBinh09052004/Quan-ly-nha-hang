import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { Guest } from '../../../../../model/guest.model';

@Component({
  selector: 'app-guest-form-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, ButtonModule, InputTextModule, InputNumberModule],
  templateUrl: './guest-form-dialog.component.html',
  styleUrls: ['../../guest.scss']
})
export class GuestFormDialogComponent {
  @Input() visible = false;
  @Input() guest: Guest = { id: 0, name: '', phone: '', description: '', points: 0, created: new Date(), updated: new Date(), deleted: false };

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() save = new EventEmitter<Guest>();

  closeDialog() {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  saveGuest() {
    this.save.emit(this.guest);
  }
}
