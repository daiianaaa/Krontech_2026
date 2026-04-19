import { Routes } from '@angular/router';
import { authGuard, b2bGuard, b2cGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // ── Default redirect ──────────────────────────────────────────
  { path: '', redirectTo: '/auth/login', pathMatch: 'full' },

  // ── Auth (Public) ─────────────────────────────────────────────
  {
    path: 'auth',
    canActivate: [guestGuard],
    loadComponent: () => import('./layout/auth-layout/auth-layout').then(m => m.AuthLayout),
    children: [
      { path: 'login',    loadComponent: () => import('./features/auth/login/login').then(m => m.LoginComponent) },
      { path: 'register', loadComponent: () => import('./features/auth/register/register').then(m => m.RegisterComponent) },
      { path: '', redirectTo: 'login', pathMatch: 'full' }
    ]
  },

  // ── B2B Portal (Staff / Managers) ────────────────────────────
  {
    path: 'dashboard',
    canActivate: [b2bGuard],
    loadComponent: () => import('./layout/b2b-layout/b2b-layout').then(m => m.B2bLayout),
    children: [
      { path: '',          loadComponent: () => import('./features/b2b/dashboard/dashboard').then(m => m.DashboardComponent) },
      { path: 'inventory', loadComponent: () => import('./features/b2b/inventory/inventory').then(m => m.InventoryComponent) },
      { path: 'alerts',    loadComponent: () => import('./features/b2b/expiry-alerts/expiry-alerts').then(m => m.ExpiryAlertsComponent) },
      { path: 'transfers', loadComponent: () => import('./features/b2b/transfers/transfers').then(m => m.TransfersComponent) },
      { path: 'predictions', loadComponent: () => import('./features/b2b/predictions/predictions').then(m => m.PredictionsComponent) },
      { path: 'reports',   loadComponent: () => import('./features/b2b/reports/reports').then(m => m.ReportsComponent) },
    ]
  },

  // ── B2C Portal (Patients) ─────────────────────────────────────
  {
    path: 'patient',
    canActivate: [b2cGuard],
    loadComponent: () => import('./layout/b2c-layout/b2c-layout').then(m => m.B2cLayout),
    children: [
      { path: '',          loadComponent: () => import('./features/b2c/patient-portal/patient-portal').then(m => m.PatientPortalComponent) },
      { path: 'book',      loadComponent: () => import('./features/b2c/vaccine-booking/vaccine-booking').then(m => m.VaccineBookingComponent) },
      { path: 'schedule',  loadComponent: () => import('./features/b2c/vaccination-schedule/vaccination-schedule').then(m => m.VaccinationScheduleComponent) },
      { path: 'find',      loadComponent: () => import('./features/b2c/pharmacy-locator/pharmacy-locator').then(m => m.PharmacyLocatorComponent) },
    ]
  },

  // ── Catch-all ─────────────────────────────────────────────────
  { path: '**', redirectTo: '/auth/login' }
];
