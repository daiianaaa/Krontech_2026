import { Component, EventEmitter, Output, NgZone, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { AuthUser, UserRole } from '../../models/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {
  @Output() loginSuccess = new EventEmitter<AuthUser>();

  username = '';
  password = '';
  errorMessage = '';
  isLoading = false;

  constructor(
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private authService: AuthService
  ) {}

  submit(): void {
    this.errorMessage = '';

    if (!this.username.trim() || !this.password.trim()) {
      this.errorMessage = 'Username and password are required';
      return;
    }

    this.isLoading = true;

    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        username: this.username.trim(),
        password: this.password
      })
    })
    .then(async (res) => {
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.eroare || data.message || 'Username sau parolă incorectă.');
      }

      return data;
    })
    .then((data) => {
      this.ngZone.run(() => {
        // Folosim rolul din backend, sau mapam din username
        const role: UserRole = this.mapRole(data?.user?.role || this.username);

        const user: AuthUser = {
          username: this.username.trim(),
          role: role
        };

        sessionStorage.setItem('medistock_user', JSON.stringify(user));
        this.isLoading = false;
        this.loginSuccess.emit(user);
        this.cdr.detectChanges();
      });
    })
    .catch((err) => {
      this.ngZone.run(() => {
        this.isLoading = false;
        this.errorMessage = err.message || 'Username sau parolă incorectă.';
        this.cdr.detectChanges();
      });
    });
  }

  private mapRole(value: string): UserRole {
    const v = value.toLowerCase();
    if (v.includes('admin')) return 'ADMIN';
    if (v.includes('pharma') || v.includes('farm')) return 'PHARMACIST';
    if (v.includes('provider')) return 'PROVIDER';
    return 'ADMIN';
  }
}