import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../service/authservice';

@Component({
  selector: 'app-change-password',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './change-password.html',
  styleUrl: './change-password.scss'
})
export class ChangePasswordComponent {
  username = '';
  oldPassword = '';
  newPassword = '';
  confirmPassword = '';
  showOldPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  errorMessage = '';
  successMessage = '';
  isSubmitting = false;

  constructor(private authService: AuthService, private router: Router) {}

  get passwordsMatch(): boolean {
    return this.newPassword === this.confirmPassword;
  }

  clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  onSubmit(): void {
    this.clearMessages();

    if (!this.passwordsMatch) {
      this.errorMessage = 'Xác nhận mật khẩu mới chưa khớp.';
      return;
    }

    this.isSubmitting = true;
    this.authService.changeMyPassword(this.username, this.oldPassword, this.newPassword).subscribe({
      next: (response) => {
        this.successMessage = response.message || 'Đổi mật khẩu thành công! Vui lòng đăng nhập lại.';
        this.oldPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
        this.isSubmitting = false;
        window.setTimeout(() => this.router.navigate(['/login']), 1500);
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Không thể đổi mật khẩu. Vui lòng thử lại.';
        this.isSubmitting = false;
      }
    });
  }
}
