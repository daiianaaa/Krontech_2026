import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-predictions',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="animate-in">
      <div class="page-header"><h1>Demand Predictions</h1><p>AI-powered forecast to prevent over-ordering</p></div>
      <p class="text-muted">Prediction charts placeholder — connect PredictionService & chart library.</p>
    </div>
  `
})
export class PredictionsComponent {}
