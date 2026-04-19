import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-b2c-layout',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="b2c-shell">
      <header class="b2c-topbar">
        <div class="b2c-brand">
          <span class="logo-icon">🏥</span>
          <span class="logo-text">MediStock</span>
          <span class="portal-tag">Patient Portal</span>
        </div>
        <nav class="b2c-nav">
          <a routerLink="/patient" routerLinkActive="active">Home</a>
          <a routerLink="/patient/book" routerLinkActive="active">Book Vaccine</a>
          <a routerLink="/patient/schedule" routerLinkActive="active">My Schedule</a>
          <a routerLink="/patient/find" routerLinkActive="active">Find Pharmacy</a>
        </nav>
      </header>
      <main class="b2c-content">
        <router-outlet />
      </main>
      <footer class="b2c-footer">
        <p>© 2026 MediStock — KronTech Challenge</p>
      </footer>
    </div>
  `,
  styleUrl: './b2c-layout.scss'
})
export class B2cLayout {}
