import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pharmacy-locator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="animate-in">
      <div class="page-header"><h1>Find a Pharmacy</h1><p>Locate nearby pharmacies with live stock info</p></div>
      <p class="text-muted">Map + list placeholder — connect PharmacyService & embed map.</p>
    </div>
  `
})
export class PharmacyLocatorComponent {}
