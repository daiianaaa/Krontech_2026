import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="animate-in">
      <div class="page-header flex items-center justify-between">
        <div><h1>Inventory</h1><p>Live stock levels across all locations</p></div>
        <div class="flex gap-1">
          <button class="btn btn-ghost">Export CSV</button>
          <button class="btn btn-primary">+ Add Stock</button>
        </div>
      </div>
      <p class="text-muted">Connect to the Inventory Service to display stock data.</p>
    </div>
  `
})
export class InventoryComponent {}
