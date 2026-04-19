import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlertService } from '../../../core/services/alert.service';
import { TransferService } from '../../../core/services/transfer.service';
import { Alert, TransferSuggestion } from '../../../core/models';

@Component({
  selector: 'app-expiry-alerts',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="animate-in">
      <div class="page-header">
        <h1>Expiry Alerts</h1>
        <p>Products approaching expiry — act now to prevent waste</p>
      </div>

      <!-- AI Suggestions -->
      <div class="card mb-2" *ngIf="suggestions.length">
        <h3 style="margin-bottom:1rem;">🤖 AI Transfer Suggestions</h3>
        <div *ngFor="let s of suggestions" class="suggestion-row">
          <div class="flex items-center justify-between">
            <div>
              <strong>{{ s.productName }}</strong>
              <span class="badge badge-danger ml-1">{{ s.daysToExpiry }}d left</span>
            </div>
            <div class="flex gap-1">
              <button class="btn btn-success" (click)="acceptSuggestion(s)">Accept Transfer</button>
              <span class="text-sm text-muted">Save €{{ s.estimatedSavings }}</span>
            </div>
          </div>
          <p class="text-sm text-muted mt-1">
            {{ s.quantity }} units · {{ s.fromLocationName }} → {{ s.toLocationName }}
          </p>
        </div>
      </div>

      <!-- Alert list -->
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Product</th><th>Location</th><th>Batch</th>
              <th>Expires</th><th>Severity</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let a of alerts">
              <td>{{ a.productName }}</td>
              <td>{{ a.locationName }}</td>
              <td>{{ a.batchNumber }}</td>
              <td>{{ a.expiryDate }}</td>
              <td><span class="badge" [class]="'badge-' + a.severity">{{ a.severity }}</span></td>
              <td>
                <button class="btn btn-ghost" (click)="markRead(a)">Mark Read</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class ExpiryAlertsComponent implements OnInit {
  private alertService = inject(AlertService);
  private transferService = inject(TransferService);

  alerts: Alert[] = [];
  suggestions: TransferSuggestion[] = [];

  ngOnInit(): void {
    this.alertService.getAlerts({ type: 'expiry' }).subscribe(a => this.alerts = a);
    this.transferService.getSuggestions().subscribe(s => this.suggestions = s);
  }

  markRead(alert: Alert): void {
    this.alertService.markAsRead(alert.id).subscribe();
  }

  acceptSuggestion(s: TransferSuggestion): void {
    this.transferService.acceptSuggestion(s).subscribe();
  }
}
