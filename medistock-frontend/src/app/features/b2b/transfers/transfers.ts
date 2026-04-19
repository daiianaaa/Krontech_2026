import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-transfers',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="animate-in">
      <div class="page-header"><h1>Stock Transfers</h1><p>Inter-location redistribution to prevent waste</p></div>
      <p class="text-muted">Transfer management placeholder — connect TransferService.</p>
    </div>
  `
})
export class TransfersComponent {}
