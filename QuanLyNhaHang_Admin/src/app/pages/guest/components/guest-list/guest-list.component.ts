import { Component, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { Guest } from '../../../../../model/guest.model';

@Component({
  selector: 'app-guest-list',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, InputTextModule, TagModule],
  templateUrl: './guest-list.component.html',
  styleUrls: ['../../guest.scss']
})
export class GuestListComponent {
  @Input() guests: Guest[] = [];
  @Input() selectedGuests: Guest[] = [];
  @Input() loading = false;

  @Output() selectedGuestsChange = new EventEmitter<Guest[]>();
  @Output() edit = new EventEmitter<Guest>();
  @Output() delete = new EventEmitter<Guest>();
  @Output() analyze = new EventEmitter<Guest>();

  @ViewChild('dt') table!: Table;

  onSelectionChange(selection: Guest[]) {
    this.selectedGuests = selection;
    this.selectedGuestsChange.emit(selection);
  }

  filter(event: Event): void {
    if (this.table) {
      this.table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }
  }
}
