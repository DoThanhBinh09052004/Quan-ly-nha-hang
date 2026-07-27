import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AutoCompleteCompleteEvent, AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';

import { Role } from '../../../../model/role.model';
import { User } from '../../../../model/user.model';

@Component({
  selector: 'app-user-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AutoCompleteModule,
    ButtonModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
  ],
  templateUrl: './user-form-dialog.component.html',
  styleUrl: './user-form-dialog.component.scss',
})
export class UserFormDialogComponent {
  @Input() visible = false;
  @Input() user!: User;
  @Input() roles: Role[] = [];
  @Input() role: Role | null = null;
  @Input() submitted = false;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() save = new EventEmitter<{ user: User; role: Role | null }>();

  roleResults: Role[] = [];

  searchRoles(event: AutoCompleteCompleteEvent): void {
    const query = event.query.trim().toLocaleLowerCase('vi-VN');
    this.roleResults = this.roles.filter((role) => {
      return !query || role.name.toLocaleLowerCase('vi-VN').includes(query);
    });
  }

  close(): void {
    this.visibleChange.emit(false);
  }

  submit(): void {
    this.save.emit({ user: this.user, role: this.role });
  }
}
