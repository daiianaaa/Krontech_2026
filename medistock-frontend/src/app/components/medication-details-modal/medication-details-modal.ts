import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';
import { forkJoin } from 'rxjs';

import { AiPrediction, PredictionSummary, TransferRecommendation } from '../../models/prediction';
import { PredictionService } from '../../services/prediction.service';
import { FacilityStock } from '../../models/transfer';

@Component({
  selector: 'app-medication-details-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './medication-details-modal.html',
  styleUrl: './medication-details-modal.scss'
})
export class MedicationDetailsModalComponent implements OnInit {
  @Input() stock!: FacilityStock;

  @Output() close = new EventEmitter<void>();
  @Output() initiateAction = new EventEmitter<{
    recommendation: TransferRecommendation;
    action: 'SEND' | 'REQUEST';
  }>();

  predictions: AiPrediction[] = [];
  summaries: PredictionSummary[] = [];
  recommendations: TransferRecommendation[] = [];

  /** The resolved hospital name from the DB (detected at runtime) */
  resolvedHospitalName = '';

  loading = true;
  error = '';

  activeTab: 'predictions' | 'recommendations' | 'summary' = 'recommendations';

  Object = Object;

  constructor(
    private predictionService: PredictionService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';

    const predictions$ = this.predictionService.getPredictions(this.stock.medicationId);
    const summary$ = this.predictionService.getPredictionSummary(this.stock.medicationId);
    const recommendations$ = this.predictionService.getAllTransferRecommendations();

    forkJoin({
      predictions: predictions$,
      summaries: summary$,
      recommendations: recommendations$
    }).subscribe({
      next: (results) => {
        this.predictions = results.predictions || [];
        this.summaries = results.summaries || [];

        const allRecs = results.recommendations || [];

        // Step 1: Detect the user's real hospital name from the recommendations data
        this.resolvedHospitalName = this.detectHospitalName(allRecs);

        // Step 2: Filter — show only recommendations where the user's hospital
        // is source or destination
        this.recommendations = allRecs.filter(
          (rec: TransferRecommendation) => this.canSeeRecommendation(rec)
        );

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('MedicationDetailsModalComponent: Error loading data:', err);
        this.error = 'Failed to load AI insights. Please try again later.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  get currentFacilityName(): string {
    return this.resolvedHospitalName || this.stock?.facilityName || '';
  }

  /**
   * Extracts keywords from the username (e.g. "spital.suceava.judetean" → ["spital","suceava","judetean"])
   * and finds the best-matching hospital name from the recommendations data.
   */
  private detectHospitalName(recs: TransferRecommendation[]): string {
    const username = this.stock?.facilityName ?? '';
    if (!username) return '';

    // Extract keywords from the username (split on . , - _ and spaces)
    const keywords = username.toLowerCase()
      .split(/[.,\-_ ]+/)
      .filter(k => k.length > 2); // ignore very short tokens

    if (keywords.length === 0) return username;

    // Collect all unique hospital names from the recommendations
    const allNames = new Set<string>();
    for (const rec of recs) {
      if (rec.sourceHospitalName) allNames.add(rec.sourceHospitalName);
      if (rec.destinationHospitalName) allNames.add(rec.destinationHospitalName);
    }

    // Score each hospital name by how many username keywords it contains
    let bestName = '';
    let bestScore = 0;

    for (const name of allNames) {
      const normalized = this.removeDiacritics(name.toLowerCase());
      let score = 0;
      for (const keyword of keywords) {
        const normalizedKeyword = this.removeDiacritics(keyword);
        if (normalized.includes(normalizedKeyword)) {
          score++;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestName = name;
      }
    }

    // Only accept if at least 2 keywords matched (or all keywords if there's only 1-2)
    const minScore = Math.min(2, keywords.length);
    if (bestScore >= minScore) {
      return bestName;
    }

    return '';
  }

  /** Removes Romanian diacritics so "Județean" matches "judetean" */
  private removeDiacritics(str: string): string {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  isSource(rec: TransferRecommendation): boolean {
    return rec.sourceHospitalName === this.currentFacilityName;
  }

  isDestination(rec: TransferRecommendation): boolean {
    return rec.destinationHospitalName === this.currentFacilityName;
  }

  canSeeRecommendation(rec: TransferRecommendation): boolean {
    // Only show recommendations where the user's hospital is involved
    const isInvolved = this.isSource(rec) || this.isDestination(rec);
    const isSameMedication =
      this.removeDiacritics((rec.medicationName || '').trim().toLowerCase()) ===
      this.removeDiacritics((this.stock.medicationName || '').trim().toLowerCase());
    return isInvolved && isSameMedication;
  }

  getRecommendationAction(rec: TransferRecommendation): 'SEND' | 'REQUEST' {
    return this.isSource(rec) ? 'SEND' : 'REQUEST';
  }

  getRecommendationActionLabel(rec: TransferRecommendation): string {
    return this.isSource(rec) ? 'Send transfer' : 'Request transfer';
  }

  getUserTransferRole(rec: TransferRecommendation): string {
    if (this.isSource(rec)) return 'Source institution';
    if (this.isDestination(rec)) return 'Destination institution';
    return 'Not involved';
  }

  formatNumber(val: number | null | undefined, decimals = 1): string {
    if (val == null) return '—';
    return Number(val).toFixed(decimals);
  }

  getDaysUntilExpiry(expiryDate: string | null | undefined): number | null {
    if (!expiryDate) return null;

    const today = new Date();
    const expiry = new Date(expiryDate);

    return Math.ceil(
      (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  get shortageRisks(): PredictionSummary[] {
    return this.summaries.filter(
      (s: PredictionSummary) => s.predictionType === 'SHORTAGE_RISK'
    );
  }

  get expiryRisks(): PredictionSummary[] {
    return this.summaries.filter(
      (s: PredictionSummary) => s.predictionType === 'EXPIRY_RISK'
    );
  }

  onClose(): void {
    this.close.emit();
  }

  getObjectKeys(obj: unknown): string[] {
    if (!obj || typeof obj !== 'object') return [];
    return Object.keys(obj);
  }

  onInitiateAction(
    recommendation: TransferRecommendation,
    action: 'SEND' | 'REQUEST'
  ): void {
    this.initiateAction.emit({ recommendation, action });
  }

  onManualTransfer(action: 'SEND' | 'REQUEST'): void {
    // Build a minimal recommendation-like object from the stock data
    const manualRec = {
      recommendationId: 'manual',
      sourceHospitalName: action === 'SEND' ? this.currentFacilityName : 'Select Source Facility',
      sourceCity: '',
      sourceCounty: '',
      destinationHospitalName: action === 'REQUEST' ? this.currentFacilityName : 'Select Destination Facility',
      destinationCity: '',
      destinationCounty: '',
      medicationName: this.stock.medicationName,
      medicationCategory: this.stock.category,
      medicationCode: '',
      batchNumber: '',
      sourceBatchCurrentQuantity: 0,
      recommendedQuantity: 1,
      expiryDate: '',
      recommendedTransferDate: '',
      reason: 'Manual transfer request initiated by user',
      confidenceScore: 0,
      riskLevel: 'N/A',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.initiateAction.emit({ recommendation: manualRec, action });
  }
}