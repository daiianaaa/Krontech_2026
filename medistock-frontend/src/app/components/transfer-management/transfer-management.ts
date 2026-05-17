import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { Medicament } from '../../models/medicament';
import { AuthUser } from '../../models/auth';
import {
  FacilityStock,
  TransferRequest,
  TransferStatus,
  mapMedicationToFacilityStock
} from '../../models/transfer';
import { TransferService } from '../../services/transfer.service';
import { InboxService, InboxMessage } from '../../services/inbox.service';
import { MedicationDetailsModalComponent } from '../medication-details-modal/medication-details-modal';
import { HttpClient } from '@angular/common/http';
import { UserService, BackendUser } from '../../services/user.service';

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
export class TransferManagementComponent implements OnInit, OnChanges, OnDestroy {
  @Input() medicaments: Medicament[] = [];
  @Input() currentUser: AuthUser | null = null;
  @Input() mode: 'transfers' | 'inbox' | 'archive' = 'transfers';
  @Input() destinationFacilities: string[] = [];
  @Output() stockTransferred = new EventEmitter<{ medicationId: string; quantity: number }>();

  get currentFacility(): string {
    return this.currentUser?.institutionName || this.currentUser?.username || 'Central Hospital Pharmacy';
  }

  get currentFacilityId(): string | undefined {
    return this.currentUser?.id?.toString();
  }

  transferDirection: 'SEND' | 'REQUEST' = 'SEND';
  selectedOtherFacility = '';
  candidateStocks: FacilityStock[] = [];
  transfers: TransferRequest[] = [];
  selectedMedicationId: string | null = null;

  inboxMessages: InboxMessage[] = [];
  allUsers: BackendUser[] = [];

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
  isSubmitting = false;

  selectedStockForDetails: FacilityStock | null = null;

  readonly reasonMaxLength = 5000;

  batches: MedicationBatch[] = [];
  selectedBatchNumber: string | undefined = undefined;

  private subs = new Subscription();

  constructor(
    private transferService: TransferService,
    private inboxService: InboxService,
    private userService: UserService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.refreshCandidates();

    this.transferService.loadTransfers(this.currentUser ?? undefined);
    this.subs.add(
      this.transferService.transfers$.subscribe((transfers) => {
        this.transfers = transfers.filter(t => t.status !== 'COMPLETED');
      })
    );

    const targetId = this.currentUser?.hospitalId || this.currentUser?.id?.toString();
    if (targetId) {
      this.inboxService.loadMessages(targetId);
    } else {
      console.warn('Inbox not loaded: Current user has no identifiable ID.');
    }
    this.subs.add(
      this.inboxService.messages$.subscribe((messages) => {
        this.inboxMessages = messages;
      })
    );

    this.userService.getAllUsers().subscribe({
      next: (users) => {
        this.allUsers = users;
      },
      error: (err) => console.error('Failed to load users for ID resolution', err)
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

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  onMedicationChange(): void {
    this.fetchBatches();
  }

  private fetchBatches(): void {
    this.batches = [];
    this.selectedBatchNumber = undefined;
    if (this.selectedMedicationId) {
      // Determine which hospital's batches we want to see.
      // If SEND: we see our own batches.
      // If REQUEST: we see the other hospital's batches.
      let targetHospId: string | undefined = undefined;

      if (this.transferDirection === 'SEND') {
        targetHospId = this.currentUser?.hospitalId;
      } else {
        const otherUser = this.allUsers.find(u => 
          (u.fullName || u.username) === this.selectedOtherFacility || u.hospitalId === this.selectedOtherFacility
        );
        targetHospId = otherUser?.hospitalId;
      }

      let url = `/api/medication/${this.selectedMedicationId}/batches`;
      if (targetHospId) {
        url += `?hospitalId=${targetHospId}`;
      }

      this.http.get<MedicationBatch[]>(url, { withCredentials: true }).subscribe({
        next: (data) => { this.batches = data; },
        error: (err) => console.error('Failed to load batches', err)
      });
    }
  }

  get visibleTransfers(): TransferRequest[] {
    const myId = this.currentFacilityId;
    const myHospId = this.currentUser?.hospitalId;
    return this.transfers.filter(t => 
      t.fromFacility === myId || t.fromFacility === myHospId ||
      t.toFacility === myId || t.toFacility === myHospId
    );
  }

  get incomingTransfers(): TransferRequest[] {
    const myId = this.currentFacilityId;
    const myHospId = this.currentUser?.hospitalId;
    return this.transfers.filter(t => t.toFacility === myId || t.toFacility === myHospId);
  }

  get pendingIncomingTransfers(): TransferRequest[] {
    return this.incomingTransfers.filter(t => t.status === 'PENDING');
  }

  get activeInboxMessages(): InboxMessage[] {
    // Active messages are strictly those that are still pending
    return this.inboxMessages.filter(m => m.transferStatus === 'pending');
  }

  get archivedInboxMessages(): InboxMessage[] {
    // Archived messages are strictly those that are no longer pending (accepted/rejected)
    return this.inboxMessages.filter(m => m.transferStatus !== 'pending');
  }

  get incomingNotificationCount(): number {
    return this.activeInboxMessages.length;
  }

  get selectedSource(): FacilityStock | undefined {
    return this.candidateStocks.find(stock => stock.medicationId === this.selectedMedicationId);
  }

  get pendingTransfersCount(): number {
    return this.transfers.filter(t => t.status === 'PENDING').length;
  }

  get canManageTransfers(): boolean {
    return this.currentUser?.role === 'ADMIN' || 
           this.currentUser?.role === 'PHARMACIST' || 
           this.currentUser?.role === 'MANAGER';
  }

  get reasonTooLong(): boolean {
    return this.reason.length > this.reasonMaxLength;
  }

  createTransfer(): void {
    if (this.isSubmitting) return;
    this.errorMessage = '';
    this.successMessage = '';

    const source = this.selectedSource;
    if (!source) { this.errorMessage = 'Select a medication.'; return; }
    if (this.quantity < 1) { this.errorMessage = 'Quantity must be at least 1.'; return; }
    if (!this.reason.trim()) { this.errorMessage = 'Reason for transfer is required.'; return; }
    if (this.reasonTooLong) { this.errorMessage = `Reason cannot exceed ${this.reasonMaxLength} characters.`; return; }

    const fromFac = this.transferDirection === 'SEND' ? this.currentFacility : this.selectedOtherFacility;
    const toFac = this.transferDirection === 'SEND' ? this.selectedOtherFacility : this.currentFacility;

    // Automate ID resolution
    // We need to find the HOSPITAL ID, not the User ID.
    // allUsers contains BackendUser objects which have both id (user) and hospitalId.
    const senderUser = this.allUsers.find(u => 
      (u.fullName || u.username) === fromFac || u.hospitalId === fromFac
    );
    const receiverUser = this.allUsers.find(u => 
      (u.fullName || u.username) === toFac || u.hospitalId === toFac
    );
    const selectedBatch = this.batches.find(b => b.batchNumber === this.selectedBatchNumber);

    this.isSubmitting = true;

    this.transferService.createTransfer(
      {
        source: { ...source, facilityName: fromFac },
        batchNumber: this.selectedBatchNumber,
        batchId: selectedBatch?.id,
        senderHospitalId: senderUser?.hospitalId || this.currentUser?.hospitalId,
        receiverHospitalId: receiverUser?.hospitalId,
        sourceHospitalId: senderUser?.hospitalId || this.currentUser?.hospitalId,
        destinationHospitalId: receiverUser?.hospitalId,
        toFacility: toFac,
        quantity: this.quantity,
        reason: this.reason,
        transactionType: this.transferDirection.toLowerCase()
      },
      this.currentUser?.username ?? 'unknown',
      this.currentUser ?? undefined
    ).subscribe({
      next: (saved) => {
        this.successMessage = `Transfer request created successfully (ID: ${saved.transactionId?.slice(0, 8)}...).`;
        this.quantity = 1;
        this.isSubmitting = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to create transfer. Please try again.';
        this.isSubmitting = false;
      }
    });
  }

  resolveHospitalName(id: string): string {
    if (!id) return 'Unknown';
    const searchId = id.toLowerCase();
    
    // Hardcoded dictionary of standard hospital/pharmacy IDs for robust name resolution
    const hospitalMap: { [key: string]: string } = {
      'f3c552cf-78fe-45e6-8dc9-c3fc0e13724f': 'Spitalul Clinic Județean de Urgență Cluj',
      '7b6e6c53-dd6b-4d17-86fe-0ea5cdf0a4eb': 'Spitalul Municipal Turda',
      '14e40713-68b8-4900-82d1-86a1d0ef749c': 'Spitalul Județean de Urgență Alba Iulia',
      '425116c9-a892-4f83-808f-72da8f0ca11c': 'Spitalul Clinic Județean de Urgență Sibiu',
      'f37d51ab-9c68-4fb0-88c0-595d26f9ab46': 'Spitalul Clinic de Urgență București',
      'd739e829-ab98-4002-9e31-dfd3e84427a9': 'Spitalul Județean de Urgență Timișoara',
      'e875011f-97ed-49ba-8a58-923e546fa4f8': 'Spitalul Clinic Municipal Oradea',
      '940cd491-de7c-49f5-9ca2-26c9398a44e0': 'Spitalul Clinic Județean de Urgență Brașov',
      '1e9b1a11-4f6e-4ca4-9fd3-3e1d3b03ca89': 'Spitalul Clinic Județean de Urgență Iași',
      'c8804f26-9305-470b-b3ab-b0eabdc2af24': 'Spitalul Clinic Județean de Urgență Constanța',
      'f9bb5430-5afa-483d-a433-94e119bec814': 'Spitalul Județean de Urgență Craiova',
      '82313f0e-d9ed-4513-ad21-01564b095d4f': 'Spitalul Județean de Urgență Arad',
      '37f78631-9f5f-4681-b35d-cc9386ba7cf0': 'Spitalul Județean de Urgență Ploiești',
      '86d3effd-8bc5-473c-8989-2d41b08a2e46': 'Spitalul Județean de Urgență Bacău',
      '0e87f4b4-ad26-49d3-a813-732389f69d4f': 'Spitalul Județean de Urgență Suceava',
      '314693ca-2ce6-45e3-8503-6a9fe449f9b8': 'Spitalul Județean de Urgență Târgu Mureș',
      'ce57328f-4170-41b7-8a1c-58aff233bcbf': 'Spitalul Municipal Dej',
      '59c57f89-8de1-4792-83a1-331511b67eec': 'Spitalul Municipal Câmpia Turzii',
      '498f0ae1-1f47-4049-9191-b18893b3fe5e': 'Spitalul Orășenesc Huedin',
      '530b8398-7967-4f2a-b2a8-da4236f6a9d4': 'Spitalul Privat MedLife Transilvania',
      '576589b9-ac5b-4bd7-af92-356dc07968fd': 'Farmacia Ducfarm Cluj',
      '2d230994-8af3-46c7-9b43-5a266ec60f8d': 'Farmacia Catena Turda',
      'b3adc042-1db9-4eb0-980f-357ac230cf89': 'Farmacia Help Net Alba Iulia',
      'f32857d6-9cfc-43cf-90e7-0e2f9adcc538': 'Farmacia Dr. Max Sibiu',
      'f2cdbb1b-d7fc-431e-8f81-572a8cc73e32': 'Farmacia Sensiblu București',
      '82e1a24c-95ed-41a6-a56b-a0cf7a13f742': 'Farmacia Catena Timișoara',
      '41d9a742-4c74-4da3-86c0-16f3a8653d5f': 'Farmacia Ducfarm Oradea',
      '7a680f32-858c-4b46-a57f-9adba752d967': 'Farmacia Dr. Max Brașov',
      '29cf401a-5a90-43b8-9d74-9be10d1a2ac1': 'Farmacia Help Net Iași',
      'a963de25-6119-4b0e-9c83-050b69824b0a': 'Farmacia Catena Constanța'
    };
    
    if (hospitalMap[searchId]) {
      return hospitalMap[searchId];
    }
    
    const user = this.allUsers.find(u => 
      (u.hospitalId && u.hospitalId.toLowerCase() === searchId) || 
      (u.id && u.id.toString().toLowerCase() === searchId) || 
      (u.fullName && u.fullName.toLowerCase() === searchId) || 
      (u.username && u.username.toLowerCase() === searchId)
    );
    return user ? (user.fullName || user.username) : id;
  }

  updateStatusByBackendId(backendId: string, status: TransferStatus, userId?: string): void {
    const targetUserId = userId || this.currentUser?.id?.toString();
    if (!targetUserId) return;

    this.isSubmitting = true;
    this.transferService.updateStatusByBackendId(backendId, status, targetUserId).subscribe({
      next: () => {
        this.transfers = this.transfers.map(t => {
          if ((t as any).backendId === backendId) {
            return { ...t, status: status };
          }
          return t;
        }).filter(t => t.status !== 'COMPLETED' && t.status !== 'REJECTED');
        
        this.successMessage = `Transfer ${status.toLowerCase()}ed successfully.`;
        this.isSubmitting = false;
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        this.errorMessage = `Failed to update transfer.`;
        this.isSubmitting = false;
      }
    });
  }

  markInboxMessageRead(inboxId: string): void {
    this.inboxService.markAsRead(inboxId).subscribe({
      next: () => {
        const msg = this.inboxMessages.find(m => m.inboxId === inboxId);
        if (msg) {
          msg.inboxStatus = 'read';
          this.inboxMessages = [...this.inboxMessages]; // Trigger change detection
        }
      }
    });
  }

  deleteInboxMessage(inboxId: string): void {
    this.inboxService.deleteMessage(inboxId).subscribe({
      next: () => {
        this.successMessage = 'Notification deleted.';
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: () => {
        this.errorMessage = 'Failed to delete notification.';
        setTimeout(() => this.errorMessage = '', 3000);
      }
    });
  }

  handleInboxAction(msg: InboxMessage, status: TransferStatus): void {
    if (!msg.transferRequestId) return;
    
    // Fallback: if currentUser.id is missing, try to find it in allUsers by username
    let userId = this.currentUser?.id;
    if (!userId && this.currentUser?.username) {
      const found = this.allUsers.find(u => u.username.toLowerCase() === this.currentUser?.username.toLowerCase());
      userId = found?.id;
    }

    if (!userId) {
      this.errorMessage = 'Could not identify your user ID. Please log in again.';
      return;
    }

    this.isSubmitting = true;
    this.transferService.updateStatusByBackendId(msg.transferRequestId, status, userId.toString()).subscribe({
      next: () => {
        // Update local status so it moves to Archive immediately in the UI
        msg.transferStatus = (status === 'APPROVED' ? 'accepted' : 'rejected');
        
        if (status === 'REJECTED' && msg.inboxId) {
          // As requested: "daca dă reject se sterge si gata"
          this.deleteInboxMessage(msg.inboxId);
        } else if (msg.inboxId && msg.inboxStatus === 'unread') {
          // Mark as read after action for approved ones
          this.markInboxMessageRead(msg.inboxId);
        }
        
        this.inboxMessages = [...this.inboxMessages]; // Force change detection
        
        this.successMessage = `Transfer ${status.toLowerCase()}ed successfully.`;
        this.isSubmitting = false;

        // Refresh to get the latest state from server
        const targetId = this.currentUser?.hospitalId || this.currentUser?.id?.toString();
        if (targetId) {
          this.inboxService.loadMessages(targetId);
        }

        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        this.errorMessage = `Failed to ${status.toLowerCase()} transfer.`;
        this.isSubmitting = false;
        setTimeout(() => this.errorMessage = '', 3000);
      }
    });
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

  onInitiateActionFromModal(event: { recommendation: any, action: 'SEND' | 'REQUEST' | 'ACCEPT_AI' }): void {
    if (this.isSubmitting) return;
    const rec = event.recommendation;
    this.closeDetails();

    if (rec.recommendationId === 'manual') {
      const stock = this.candidateStocks.find(s => s.medicationName === rec.medicationName);
      const medId = stock ? stock.medicationId : null;

      this.mode = 'transfers';
      if (event.action === 'SEND' || event.action === 'REQUEST') {
        this.transferDirection = event.action;
      }
      if (medId) {
        this.selectedMedicationId = medId;
      }
      this.selectedOtherFacility = '';
      this.selectedBatchNumber = undefined;
      this.quantity = 1;
      this.reason = 'Manual transfer request.';
      
      this.fetchBatches();

      setTimeout(() => {
        const formElement = document.querySelector('.transfer-form');
        if (formElement) {
          formElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 100);
      return;
    }

    if (event.action === 'ACCEPT_AI') {
      this.isSubmitting = true;
      let userId = this.currentUser?.id;
      if (!userId && this.currentUser?.username) {
        const found = this.allUsers.find(u => u.username.toLowerCase() === this.currentUser?.username.toLowerCase());
        userId = found?.id;
      }

      this.http.put(`/api/recommendations/${rec.recommendationId}/accept?acceptedByUserId=${userId}`, {}, { withCredentials: true }).subscribe({
        next: () => {
          this.successMessage = `AI recommendation accepted! A pending transfer request has been sent to the other institution's inbox for approval.`;
          this.isSubmitting = false;
          
          // Refetch views: reload transfers and emit event so app.ts reloads inventory/medications
          this.transferService.loadTransfers(this.currentUser ?? undefined);
          
          // Reload inbox messages so the new notification appears if it's for us
          const targetId = this.currentUser?.hospitalId || this.currentUser?.id?.toString();
          if (targetId) {
            this.inboxService.loadMessages(targetId);
          }
          
          this.stockTransferred.emit({ medicationId: rec.medicationId, quantity: rec.recommendedQuantity });
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to accept AI recommendation.';
          this.isSubmitting = false;
        }
      });
      return;
    }

    const stock = this.candidateStocks.find(s => s.medicationName === rec.medicationName);
    const medId = stock ? stock.medicationId : 'unknown';
    const category = stock ? stock.category : 'Unknown';

    this.isSubmitting = true;

    // Automate ID resolution from names for AI recommendation (Fallback manual creation)
    const senderUser = this.allUsers.find(u => (u.fullName || u.username) === rec.sourceHospitalName);
    const receiverUser = this.allUsers.find(u => (u.fullName || u.username) === rec.destinationHospitalName);

    this.transferService.createTransfer(
      {
        source: {
          facilityId: 0,
          facilityName: rec.sourceHospitalName,
          medicationId: rec.medicationId || medId,
          medicationName: rec.medicationName,
          category: category
        },
        batchNumber: rec.batchNumber,
        batchId: rec.batchId,
        senderHospitalId: rec.sourceHospitalId || senderUser?.hospitalId,
        receiverHospitalId: rec.destinationHospitalId || receiverUser?.hospitalId,
        sourceHospitalId: rec.sourceHospitalId || senderUser?.hospitalId,
        destinationHospitalId: rec.destinationHospitalId || receiverUser?.hospitalId,
        toFacility: rec.destinationHospitalName,
        quantity: rec.recommendedQuantity,
        reason: `AI Recommended Transfer (Risk: ${rec.riskLevel}). ${rec.reason}`,
        transactionType: event.action.toLowerCase()
      },
      this.currentUser?.username ?? 'unknown',
      this.currentUser ?? undefined
    ).subscribe({
      next: (saved) => {
        this.successMessage = `Transfer created from AI recommendation (ID: ${saved.transactionId?.slice(0, 8)}...).`;
        this.isSubmitting = false;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to create AI transfer.';
        this.isSubmitting = false;
      }
    });
  }
}