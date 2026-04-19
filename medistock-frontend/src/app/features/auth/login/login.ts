import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="login-wrapper animate-in">
      <h2>Sign In</h2>
      <p class="text-secondary mb-2">Access your MediStock portal</p>

      <form [formGroup]="form" (ngSubmit)="submit()" style="display:flex;flex-direction:column;gap:1.25rem;">
        <div class="form-group">
          <label for="email">Email address</label>
          <input id="email" class="input" type="email" formControlName="email" placeholder="you@hospital.ro" />
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input id="password" class="input" type="password" formControlName="password" placeholder="••••••••" />
        </div>
        <button id="login-btn" class="btn btn-primary" type="submit" [disabled]="form.invalid || isLoading" style="width:100%;justify-content:center;">
          {{ isLoading ? 'Signing in…' : 'Sign In' }}
        </button>
        <p *ngIf="error" class="text-danger text-sm">{{ error }}</p>
      </form>

      <p class="text-sm text-muted" style="margin-top:1.5rem;text-align:center;">
        Don't have an account? <a routerLink="/auth/register">Register</a>
      </p>
    </div>
  `,
  styles: [`.login-wrapper { width: 100%; max-width: 400px; }`]
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  form = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  isLoading = false;
  error = '';

  submit(): void {
    if (this.form.invalid) return;
    this.isLoading = true;
    const { email, password } = this.form.value;
    this.auth.login(email!, password!).subscribe({
      next: ({ user }) => {
        this.isLoading = false;
        const dest = ['admin','manager','pharmacist','warehouse'].includes(user.role) ? '/dashboard' : '/patient';
        this.router.navigate([dest]);
      },
      error: (e) => {
        this.isLoading = false;
        this.error = e?.error?.message ?? 'Invalid credentials';
      }
    });
  }
}
