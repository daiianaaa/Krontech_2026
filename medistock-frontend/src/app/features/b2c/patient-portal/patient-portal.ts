import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-patient-portal',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="animate-in">
      <div class="page-header">
        <h1>Welcome back, Patient</h1>
        <p>Manage your vaccinations and find available stock near you</p>
      </div>

      <div class="grid-auto">
        <div class="card" routerLink="/patient/book" style="cursor:pointer">
          <div style="font-size:2.5rem;margin-bottom:.75rem">💉</div>
          <h3>Book a Vaccine</h3>
          <p>Find available vaccines near you and reserve your slot</p>
        </div>
        <div class="card" routerLink="/patient/schedule" style="cursor:pointer">
          <div style="font-size:2.5rem;margin-bottom:.75rem">📅</div>
          <h3>My Vaccination Schedule</h3>
          <p>Track your doses, boosters, and upcoming appointments</p>
        </div>
        <div class="card" routerLink="/patient/find" style="cursor:pointer">
          <div style="font-size:2.5rem;margin-bottom:.75rem">🗺️</div>
          <h3>Find a Pharmacy</h3>
          <p>Locate the nearest pharmacy with your needed medication</p>
        </div>
      </div>
    </div>
  `
})
export class PatientPortalComponent {}
