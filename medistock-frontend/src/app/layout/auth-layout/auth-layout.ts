import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="auth-shell">
      <div class="auth-brand">
        <div class="brand-logo">
          <span class="logo-icon">🏥</span>
          <span class="logo-text">MediStock</span>
        </div>
        <p class="brand-tagline">Smart Medical Inventory — Zero Waste</p>
      </div>
      <div class="auth-card">
        <router-outlet />
      </div>
    </div>
  `,
  styleUrl: './auth-layout.scss'
})
export class AuthLayout {}
