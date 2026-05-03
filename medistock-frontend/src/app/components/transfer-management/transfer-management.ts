import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { DESTINATION_FACILITIES_MOCK } from '../../data/transfers.mock';
import { Medicament } from '../../models/medicament';
import { AuthUser } from '../../models/auth';
import {
  FacilityStock,
  TransferRequest,
  TransferStatus,
  mapMedicationToFacilityStock
} from '../../models/transfer';
import { TransferService } from '../../services/transfer.service';

@Component({
  selector: 'app-transfer-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './transfer-management.html',
  styleUrl: './transfer-management.scss'
})
export class TransferManagementComponent implements OnInit, OnChanges {
  @Input() medicaments: Medicament[] = [];
  @Input() currentUser: AuthUser | null = null;
  @Input() mode: 'transfers' | 'inbox' = 'transfers';
  @Output() stockTransferred = new EventEmitter<{ medicationId: number; quantity: number }>();

  currentFacility = "Spitalul Clinic Județean de Urgență Brașov";
  destinationFacilities = DESTINATION_FACILITIES_MOCK;
  candidateStocks: FacilityStock[] = [];
  transfers: TransferRequest[] = [];

  selectedMedicationId: number | null = null;
  selectedDestination = this.destinationFacilities[0];
  quantity = 1;
  reason = 'Expiring stock redistribution before waste.';
  errorMessage = '';
  successMessage = '';

  constructor(private transferService: TransferService) { }

  ngOnInit(): void {
    this.refreshCandidates();
    this.transfers = this.transferService.getTransfers();

    this.transferService.transfers$.subscribe((transfers) => {
      this.transfers = transfers;
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['medicaments']) {
      this.refreshCandidates();
    }
  }

  get visibleTransfers(): TransferRequest[] {
    return this.transfers.filter((transfer) => transfer.fromFacility === this.currentFacility || transfer.toFacility === this.currentFacility);
  }

  get incomingTransfers(): TransferRequest[] {
    return this.transfers.filter((transfer) => transfer.toFacility === this.currentFacility);
  }

  get pendingIncomingTransfers(): TransferRequest[] {
    return this.incomingTransfers.filter((transfer) => transfer.status === 'PENDING');
  }

  get incomingNotificationCount(): number {
    return this.pendingIncomingTransfers.length;
  }

  get outgoingTransfers(): TransferRequest[] {
    return this.transfers.filter((transfer) => transfer.fromFacility === this.currentFacility);
  }

  get selectedSource(): FacilityStock | undefined {
    return this.candidateStocks.find(
      (stock) => stock.medicationId === Number(this.selectedMedicationId)
    );
  }

  get pendingTransfersCount(): number {
    return this.transfers.filter((transfer) => transfer.status === 'PENDING').length;
  }

  get estimatedSavedValue(): number {
    return this.transfers.reduce(
      (sum, transfer) => sum + transfer.estimatedSavedValue,
      0
    );
  }

  get expiringCandidatesCount(): number {
    return this.candidateStocks.length;
  }

  get canManageTransfers(): boolean {
    return this.currentUser?.role === 'ADMIN' || this.currentUser?.role === 'PHARMACIST';
  }

  createTransfer(): void {
    this.errorMessage = '';
    this.successMessage = '';

    const source = this.selectedSource;

    if (!source) {
      this.errorMessage = 'Select a medication batch.';
      return;
    }

    if (this.quantity < 1 || this.quantity > source.stock) {
      this.errorMessage = `Quantity must be between 1 and ${source.stock}.`;
      return;
    }

    const transfer = this.transferService.createTransfer(
      {
        source: {
          ...source,
          facilityName: this.currentFacility,
        },
        toFacility: this.selectedDestination,
        quantity: this.quantity,
        reason: this.reason
      },
      this.currentUser?.username ?? 'demo-user'
    );

    this.stockTransferred.emit({
      medicationId: source.medicationId,
      quantity: this.quantity
    });

    this.successMessage = `Transfer request #${transfer.id} created. Stock was reserved locally.`;
    this.quantity = 1;
  }

  updateStatus(id: number, status: TransferStatus): void {
    this.transferService.updateStatus(id, status);
  }

  private refreshCandidates(): void {
    this.candidateStocks = this.medicaments
      .filter((medication) => medication.stock > 0 && medication.daysUntilExpiry <= 60)
      .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
      .map((medication) => mapMedicationToFacilityStock(medication, 1, this.currentFacility, 'Brașov'));

    if (!this.selectedMedicationId && this.candidateStocks.length > 0) {
      this.selectedMedicationId = this.candidateStocks[0].medicationId;
    }
  }
}