import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="animate-in">
      <div class="page-header"><h1>Reports & Analytics</h1><p>KPIs, waste analysis and efficiency metrics</p></div>
      <p class="text-muted">Reports placeholder — connect reporting service.</p>
    </div>
  `
})
export class ReportsComponent {}
