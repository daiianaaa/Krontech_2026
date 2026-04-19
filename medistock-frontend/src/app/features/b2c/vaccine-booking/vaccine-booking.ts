import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-vaccine-booking',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="animate-in">
      <div class="page-header"><h1>Book a Vaccine</h1><p>Reserve your slot at a nearby pharmacy</p></div>
      <p class="text-muted">Booking form placeholder — connect PharmacyService & BookingService.</p>
    </div>
  `
})
export class VaccineBookingComponent {}
