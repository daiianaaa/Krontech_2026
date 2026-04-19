import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { InventoryService } from '../../../core/services/inventory.service';
import { PredictionService } from '../../../core/services/prediction.service';
import { StockSummary, WastePrevention } from '../../../core/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  template: `
    <div class="animate-in">
      <div class="page-header">
        <h1>Operations Dashboard</h1>
        <p>Real-time overview of your medical inventory network</p>
      </div>

      <!-- KPI Cards -->
      <div class="grid-4 mb-2" *ngIf="summary">
        <div class="stat-card">
          <span class="stat-label">Total SKUs</span>
          <span class="stat-value">{{ summary.totalItems }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Expiring Soon</span>
          <span class="stat-value text-warning">{{ summary.expiringItems }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Critical Stock</span>
          <span class="stat-value text-danger">{{ summary.criticalItems }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Efficiency Score</span>
          <span class="stat-value text-success">{{ summary.efficiencyScore }}%</span>
        </div>
      </div>

      <!-- Waste Prevention Banner -->
      <div class="card card-glass mb-2" *ngIf="wastePrevention">
        <div class="flex items-center justify-between">
          <div>
            <h3>💡 Waste Prevented This Month</h3>
            <p>Through AI-driven transfers and smart redistribution</p>
          </div>
          <div class="text-right">
            <div class="stat-value text-success">€{{ wastePrevention.valueWastePrevented | number:'1.0-0' }}</div>
            <div class="text-sm text-muted">{{ wastePrevention.transfersInitiated }} transfers initiated</div>
          </div>
        </div>
      </div>

      <p *ngIf="isLoading" class="text-muted">Loading dashboard data…</p>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  private inventoryService = inject(InventoryService);
  private predictionService = inject(PredictionService);

  summary: StockSummary | null = null;
  wastePrevention: WastePrevention | null = null;
  isLoading = true;

  ngOnInit(): void {
    this.inventoryService.getSummary().subscribe({
      next: (s: StockSummary) => { this.summary = s; this.isLoading = false; },
      error: () => { this.isLoading = false; }
    });
    this.predictionService.getWastePreventionStats(30).subscribe((w: WastePrevention) => this.wastePrevention = w);
  }
}
