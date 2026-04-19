import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-vaccination-schedule',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="animate-in">
      <div class="page-header"><h1>My Vaccination Schedule</h1><p>Your vaccine history and upcoming doses</p></div>
      <p class="text-muted">Timeline placeholder — connect VaccinationService.</p>
    </div>
  `
})
export class VaccinationScheduleComponent {}
