import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
private apiUrl = `${environment.api}/api/Auth`;

  constructor(private http: HttpClient, private router: Router) {}

  login(username: string, password: string) {
    return this.http.post<{ token: string }>(`${this.apiUrl}/login`, { username, password });
  }

  changeMyPassword(username: string, oldPassword: string, newPassword: string) {
    return this.http.put<{ message: string }>(`${this.apiUrl}/change-my-password`, {
      username,
      oldPassword,
      newPassword
    });
  }

  logout() {
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }

  getToken() {
    return localStorage.getItem('token');
  }

  getRole(): string | null {
    const token = this.getToken();
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return (
      payload['role'] ||
      payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
      null
    );
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}
