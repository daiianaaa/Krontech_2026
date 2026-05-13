import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Medicament } from '../../models/medicament';
import { AuthUser } from '../../models/auth';
import {
  FacilityStock,
  TransferRequest,
  TransferStatus,
  mapMedicationToFacilityStock
} from '../../models/transfer';
import { TransferService } from '../../services/transfer.service';
import { MedicationDetailsModalComponent } from '../medication-details-modal/medication-details-modal';
import { HttpClient } from '@angular/common/http';

export interface MedicationBatch {
  id: string;
  batchNumber: string;
  quantityCurrent: number;
  expiryDate: string;
}

@Component({
  selector: 'app-transfer-management',
  standalone: true,
  imports: [CommonModule, FormsModule, MedicationDetailsModalComponent],
  templateUrl: './transfer-management.html',
  styleUrl: './transfer-management.scss'
})
export class TransferManagementComponent implements OnInit, OnChanges {
  @Input() medicaments: Medicament[] = [];
  @Input() currentUser: AuthUser | null = null;
  @Input() mode: 'transfers' | 'inbox' = 'transfers';
  @Input() destinationFacilities: string[] = [];
  @Output() stockTransferred = new EventEmitter<{ medicationId: string; quantity: number }>();

  get currentFacility(): string {
    return this.currentUser?.institutionName || this.currentUser?.username || 'Central Hospital Pharmacy';
  }

  transferDirection: 'SEND' | 'REQUEST' = 'SEND';
  selectedOtherFacility = '';
  candidateStocks: FacilityStock[] = [];
  transfers: TransferRequest[] = [];
  selectedMedicationId: string | null = null;
  
  searchQuery = '';
  statusFilter: 'ALL' | 'ACTIVE' | 'INACTIVE' = 'ALL';
  categoryFilter = 'ALL';

  get uniqueCategories(): string[] {
    const categories = new Set(this.candidateStocks.map(s => s.category).filter(Boolean));
    return Array.from(categories).sort();
  }

  get filteredCandidateStocks(): FacilityStock[] {
    return this.candidateStocks.filter(stock => {
      const matchesSearch = (stock.medicationName ?? '').toLowerCase().includes(this.searchQuery.toLowerCase());
      const isActive = stock.isActive !== false;
      const matchesStatus = this.statusFilter === 'ALL' ||
                            (this.statusFilter === 'ACTIVE' && isActive) ||
                            (this.statusFilter === 'INACTIVE' && !isActive);
      const matchesCategory = this.categoryFilter === 'ALL' || stock.category === this.categoryFilter;
      
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }
  quantity = 1;
  reason = 'Medication redistribution request.';
  errorMessage = '';
  successMessage = '';

  selectedStockForDetails: FacilityStock | null = null;

  readonly reasonMaxLength = 5000;
  
  batches: MedicationBatch[] = [];
  selectedBatchNumber: string | undefined = undefined;

  constructor(
    private transferService: TransferService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.refreshCandidates();
    this.transfers = this.transferService.getTransfers();

    this.transferService.transfers$.subscribe((transfers) => {
      this.transfers = transfers;
    });

    if (this.destinationFacilities.length > 0) {
      this.selectedOtherFacility = this.destinationFacilities[0];
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['medicaments']) {
      this.refreshCandidates();
    }
    if (changes['destinationFacilities'] && this.destinationFacilities.length > 0) {
      this.selectedOtherFacility = this.destinationFacilities[0];
    }
  }

  onMedicationChange(): void {
    this.fetchBatches();
  }

  private fetchBatches(): void {
    this.batches = [];
    this.selectedBatchNumber = undefined;
    if (this.selectedMedicationId) {
      this.http.get<MedicationBatch[]>(`/api/medication/${this.selectedMedicationId}/batches`).subscribe({
        next: (data) => {
          this.batches = data;
        },
        error: (err) => console.error('Failed to load batches', err)
      });
    }
  }

  get visibleTransfers(): TransferRequest[] {
    return this.transfers.filter(t => t.fromFacility === this.currentFacility || t.toFacility === this.currentFacility);
  }

  get incomingTransfers(): TransferRequest[] {
    return this.transfers.filter(t => t.toFacility === this.currentFacility);
  }

  get pendingIncomingTransfers(): TransferRequest[] {
    return this.incomingTransfers.filter(t => t.status === 'PENDING');
  }

  get incomingNotificationCount(): number {
    return this.pendingIncomingTransfers.length;
  }

  get selectedSource(): FacilityStock | undefined {
    return this.candidateStocks.find(stock => stock.medicationId === this.selectedMedicationId);
  }

  get pendingTransfersCount(): number {
    return this.transfers.filter(t => t.status === 'PENDING').length;
  }

  get canManageTransfers(): boolean {
    return this.currentUser?.role === 'ADMIN' || this.currentUser?.role === 'PHARMACIST';
  }

  get reasonTooLong(): boolean {
    return this.reason.length > this.reasonMaxLength;
  }

  createTransfer(): void {
    this.errorMessage = '';
    this.successMessage = '';

    const source = this.selectedSource;

    if (!source) {
      this.errorMessage = 'Select a medication.';
      return;
    }

    if (this.quantity < 1) {
      this.errorMessage = 'Quantity must be at least 1.';
      return;
    }

    if (!this.reason.trim()) {
      this.errorMessage = 'Reason for transfer is required.';
      return;
    }

    if (this.reasonTooLong) {
      this.errorMessage = `Reason cannot exceed ${this.reasonMaxLength} characters.`;
      return;
    }

    const fromFac = this.transferDirection === 'SEND' ? this.currentFacility : this.selectedOtherFacility;
    const toFac = this.transferDirection === 'SEND' ? this.selectedOtherFacility : this.currentFacility;

    const transfer = this.transferService.createTransfer(
      {
        source: {
          ...source,
          facilityName: fromFac,
        },
        batchNumber: this.selectedBatchNumber,
        toFacility: toFac,
        quantity: this.quantity,
        reason: this.reason
      },
      this.currentUser?.username ?? 'unknown'
    );

    this.successMessage = `Transfer request #${transfer.id} created successfully.`;
    this.quantity = 1;
  }

  updateStatus(id: number, status: TransferStatus): void {
    this.transferService.updateStatus(id, status);
  }

  private refreshCandidates(): void {
    this.candidateStocks = this.medicaments
      .map(medication => mapMedicationToFacilityStock(medication, 1, this.currentFacility));

    if (!this.selectedMedicationId && this.filteredCandidateStocks.length > 0) {
      this.selectedMedicationId = this.filteredCandidateStocks[0].medicationId;
      this.fetchBatches();
    }
  }

  openDetails(stock: FacilityStock): void {
    this.selectedStockForDetails = stock;
  }

  closeDetails(): void {
    this.selectedStockForDetails = null;
  }

  onInitiateActionFromModal(event: { recommendation: any, action: 'SEND' | 'REQUEST' }): void {
    const rec = event.recommendation;
    this.closeDetails();

    const stock = this.candidateStocks.find(s => s.medicationName === rec.medicationName);
    const medId = stock ? stock.medicationId : 'unknown';
    const category = stock ? stock.category : 'Unknown';

    // The recommendation already defines the correct route:
    // sourceHospitalName → destinationHospitalName
    const fromFac = rec.sourceHospitalName;
    const toFac = rec.destinationHospitalName;

    const transfer = this.transferService.createTransfer(
      {
        source: {
          facilityId: 0,
          facilityName: fromFac,
          medicationId: medId,
          medicationName: rec.medicationName,
          category: category
        },
        batchNumber: rec.batchNumber,
        toFacility: toFac,
        quantity: rec.recommendedQuantity,
        reason: `AI Recommended Transfer (Risk: ${rec.riskLevel}). ${rec.reason}`
      },
      this.currentUser?.username ?? 'unknown'
    );

    this.successMessage = `Transfer request #${transfer.id} automatically created from AI recommendation.`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}