import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MyData } from '../../my-data';
import { Role } from '../../../model/role.model';

@Component({
  selector: 'app-role',

  imports: [CommonModule],
  templateUrl: './role.html',
  styleUrls: ['./role.scss'],
})
export class RoleComponent implements OnInit {
  constructor(private mydata: MyData) {}

  roles: Role[] = [];

  ngOnInit(): void {
    this.mydata.getAllRoles().subscribe({
      next: (data) => {
        this.roles = data;
        console.log('Roles fetched successfully:', data);
      },
      error: (error) => {
        console.error('Error fetching roles:', error);
      },
      complete: () => {
        console.log('Role fetching completed.');
      },
    });
  }
}
