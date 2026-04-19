import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { inject } from '@angular/core';

@Component({
  selector: 'app-b2b-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="b2b-shell">
      <aside class="b2b-sidebar">
        <div class="sidebar-brand">
          <span class="logo-icon">🏥</span>
          <span class="logo-text">MediStock</span>
        </div>
        <nav class="sidebar-nav">
          <a routerLink="/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}">📊 Dashboard</a>
          <a routerLink="/dashboard/inventory" routerLinkActive="active">📦 Inventory</a>
          <a routerLink="/dashboard/alerts" routerLinkActive="active">⚠️ Expiry Alerts</a>
          <a routerLink="/dashboard/transfers" routerLinkActive="active">🔄 Transfers</a>
          <a routerLink="/dashboard/predictions" routerLinkActive="active">🤖 Predictions</a>
          <a routerLink="/dashboard/reports" routerLinkActive="active">📈 Reports</a>
        </nav>
        <div class="sidebar-footer">
          <button class="btn btn-ghost" (click)="auth.logout()">Sign Out</button>
        </div>
      </aside>
      <div class="b2b-main">
        <header class="b2b-topbar">
          <h2 class="topbar-title">MediStock B2B Portal</h2>
          <div class="topbar-right">
            <span class="text-muted text-sm">{{ auth.currentUser()?.email }}</span>
          </div>
        </header>
        <main class="b2b-content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styleUrl: './b2b-layout.scss'
})
export class B2bLayout {
  auth = inject(AuthService);
}
