import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router } from '@angular/router';
import { AppRole, AuthService } from '../service/authservice';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login']);
      return false;
    }

    const roles = route.data['roles'] as AppRole[] | undefined;
    if (roles?.length && !this.auth.hasAnyRole(roles)) {
      this.router.navigateByUrl(this.auth.landingRoute());
      return false;
    }

    return true;
  }
}
