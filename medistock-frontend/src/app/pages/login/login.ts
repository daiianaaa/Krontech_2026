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

    this.authService.login({
      username: this.username.trim(),
      password: this.password
    }).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.isLoading = false;
          // Preia userul complet salvat in sessionStorage de către AuthService
          const user = this.authService.getCurrentUser();
          if (user) {
            this.loginSuccess.emit(user);
          }
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.isLoading = false;
          this.errorMessage = err.error?.message || err.error?.eroare || err.message || 'Username sau parolă incorectă.';
          this.cdr.detectChanges();
        });
      }
    });
  }
}