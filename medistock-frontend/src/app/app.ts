import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Medicament } from './models/medicament';
import { MedicationService } from './services/medication.service';
import { MedicamentListComponent } from './components/medicament-list/medicament-list';
import { Login } from './pages/login/login';
import { AuthService } from './services/auth';
import { AuthUser } from './models/auth';
import { TransferManagementComponent } from './components/transfer-management/transfer-management';
import { TransferService } from './services/transfer.service';
import { InboxService } from './services/inbox.service';
import { UserService } from './services/user.service';
import { PredictionService } from './services/prediction.service';
import { TransferRecommendation } from './models/prediction';

import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    MedicamentListComponent,
    Login,
    TransferManagementComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  medicaments: Medicament[] = [];
  destinationFacilities: string[] = [];

  currentUser: AuthUser | null = null;
  private _activeTab: 'dashboard' | 'medications' | 'transfers' | 'inbox' | 'alerts' = 'dashboard';
  get activeTab() { return this._activeTab; }
  set activeTab(value) {
    this._activeTab = value;
    if (value === 'medications') {
      this.loadMedications();
    }
  }

  // Savings opportunities variables
  recommendations: TransferRecommendation[] = [];
  donutSegments: any[] = [];
  totalSavings = 0;
  
  realizedTransfers: TransferRecommendation[] = [];
  realizedSavings = 0;
  selectedRecommendation: TransferRecommendation | null = null;
  successMessage = '';
  errorMessage = '';

  constructor(
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private transferService: TransferService,
    private inboxService: InboxService,
    private medicationService: MedicationService,
    private userService: UserService,
    private predictionService: PredictionService
  ) {
    this.currentUser = this.authService.getCurrentUser();
  }

  notificationMessage = '';
  private previousUnreadCount = -1;

  ngOnInit(): void {
    if (this.currentUser) {
      this.loadMedications();
      this.loadFacilities();
      this.loadInbox();
      this.loadRecommendations();

      // Listen for inbox changes to trigger live notifications
      this.inboxService.messages$.subscribe(messages => {
        const currentUnread = messages.filter(m => m.inboxStatus === 'unread').length;
        if (this.previousUnreadCount !== -1 && currentUnread > this.previousUnreadCount) {
          // Trigger a live toast notification
          this.notificationMessage = `You have ${currentUnread - this.previousUnreadCount} new unread request(s) in your Inbox!`;
          setTimeout(() => { this.notificationMessage = ''; this.cdr.detectChanges(); }, 6000);
        }
        this.previousUnreadCount = currentUnread;
        this.cdr.detectChanges();
      });

      // Live polling every 10 seconds
      setInterval(() => {
        if (this.currentUser?.hospitalId) {
          this.inboxService.loadMessages(this.currentUser.hospitalId);
          // Also poll recommendations so the chart is live
          this.predictionService.getAllTransferRecommendations().subscribe({
            next: (data) => {
              // We'll just call the inner logic of loadRecommendations to avoid a massive rewrite here, 
              // but since loadRecommendations updates local state, let's just call it directly.
              this.loadRecommendations();
            }
          });
        }
      }, 10000);
    }
  }

  get currentFacility(): string {
    return this.currentUser?.institutionName || this.currentUser?.username || '';
  }

  loadFacilities(): void {
    this.userService.getFacilityNames().subscribe({
      next: (names: string[]) => {
        this.destinationFacilities = names.filter(name => name !== this.currentFacility);
      },
      error: (err) => console.error('Failed to load facilities', err)
    });
  }

  loadMedications(filters?: {name?: string, category?: string, isActive?: boolean}): void {
    const name = filters?.name;
    const category = filters?.category;
    const isActive = filters?.isActive;
    const hospitalId = this.currentUser?.hospitalId;

    this.medicationService.getMedications(hospitalId, undefined, name, category, isActive).subscribe({
      next: (data: Medicament[]) => {
        this.medicaments = data.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load medications', err);
        if (err.status === 401 || err.status === 403) {
          this.currentUser = null;
          this.cdr.detectChanges();
        }
      }
    });
  }

  loadRecommendations(): void {
    if (!this.currentUser) return;
    this.predictionService.getAllTransferRecommendations().subscribe({
      next: (data: TransferRecommendation[]) => {
        // Compute realized savings (already accepted transfers)
        this.realizedTransfers = data.filter(r => 
          r.status === 'accepted' && 
          r.netSavings > 0 && 
          (String(r.sourceHospitalId) === String(this.currentUser?.hospitalId) || String(r.destinationHospitalId) === String(this.currentUser?.hospitalId))
        ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        this.realizedSavings = this.realizedTransfers.reduce((sum, r) => sum + r.netSavings, 0);

        // Filter by current user's hospital and sort by highest savings to show top ones first
        const sorted = data.filter(r => 
          r.status === 'pending' && 
          r.netSavings > 0 && 
          (String(r.sourceHospitalId) === String(this.currentUser?.hospitalId) || String(r.destinationHospitalId) === String(this.currentUser?.hospitalId))
        ).sort((a, b) => b.netSavings - a.netSavings);
        this.recommendations = sorted;
        this.totalSavings = sorted.reduce((sum, r) => sum + r.netSavings, 0);

        let displayItems: any[] = [];
        if (sorted.length > 7) {
          const topItems = sorted.slice(0, 6);
          const others = sorted.slice(6);
          const othersSavings = others.reduce((sum, r) => sum + r.netSavings, 0);
          
          displayItems = [...topItems, {
            recommendationId: 'others',
            sourceHospitalName: 'Multiple',
            destinationHospitalName: 'Locations',
            netSavings: othersSavings,
            medicationName: `${others.length} other items`,
            isGrouped: true
          }];
        } else {
          displayItems = sorted;
        }

        let accumulatedPercentage = 0;
        const radius = 50;
        const circumference = 2 * Math.PI * radius; // ~314.16
        const colors = ['#2563eb', '#10b981', '#f97316', '#8b5cf6', '#ef4444', '#06b6d4', '#eab308', '#94a3b8'];

        this.donutSegments = displayItems.map((r, index) => {
          const percentage = this.totalSavings > 0 ? (r.netSavings / this.totalSavings) : 0;
          const arcLength = percentage * circumference;
          const strokeDasharray = `${arcLength} ${circumference}`;
          const strokeDashoffset = -accumulatedPercentage * circumference;
          accumulatedPercentage += percentage;

          return {
            id: r.recommendationId,
            name: r.isGrouped ? 'Other Opportunities' : `${r.sourceHospitalName} ➔ ${r.destinationHospitalName}`,
            value: r.netSavings,
            percentage: percentage * 100,
            strokeDasharray,
            strokeDashoffset: strokeDashoffset.toString(),
            color: r.isGrouped ? '#94a3b8' : colors[index % (colors.length - 1)],
            rawItem: r
          };
        });
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to load recommendations', err)
    });
  }

  getTransferType(r: TransferRecommendation): 'incoming' | 'outgoing' | 'network' {
    if (!this.currentUser) return 'network';
    if (r.destinationHospitalId === this.currentUser.hospitalId) {
      return 'incoming';
    }
    if (r.sourceHospitalId === this.currentUser.hospitalId) {
      return 'outgoing';
    }
    return 'network';
  }

  selectArc(segment: any): void {
    if (segment.rawItem.isGrouped) return; // Ignore clicks on the grouped "Others" segment
    this.selectedRecommendation = segment.rawItem;
    this.cdr.detectChanges();
  }

  closeDetails(): void {
    this.selectedRecommendation = null;
    this.cdr.detectChanges();
  }



  loadInbox(): void {
    if (this.currentUser?.hospitalId) {
      this.inboxService.loadMessages(this.currentUser.hospitalId);
    } else {
      this.inboxService.loadMessages();
    }
  }

  get inboxNotificationCount(): number {
    return this.inboxService.unreadCount;
  }

  onLoginSuccess(user: AuthUser): void {
    this.currentUser = user;
    this.loadFacilities();
    this.loadMedications();
    this.loadInbox();
    this.loadRecommendations();
    this.activeTab = 'dashboard';
  }

  logout(): void {
    this.authService.logout();
    this.currentUser = null;
    this.medicaments = [];
    this.destinationFacilities = [];
    this.recommendations = [];
    this.donutSegments = [];
    this.totalSavings = 0;
    this.selectedRecommendation = null;
    this.activeTab = 'dashboard';
  }

  get activeCount(): number { return this.medicaments.filter(m => m.isActive !== false).length; }
  get inactiveCount(): number { return this.medicaments.filter(m => m.isActive === false).length; }
  get controlledCount(): number { return this.medicaments.filter(m => m.controlledSubstance).length; }
  get criticalCount(): number { return this.medicaments.filter(m => m.criticality === 'CRITICAL' || m.criticality === 'HIGH').length; }

  getMedicationStatus(m: Medicament): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INACTIVE' | 'OK' {
    if (!m.isActive) return 'INACTIVE';
    if (m.criticality === 'CRITICAL') return 'CRITICAL';
    if (m.criticality === 'HIGH') return 'HIGH';
    if (m.criticality === 'MEDIUM') return 'MEDIUM';
    if (m.criticality === 'LOW') return 'LOW';
    return 'OK';
  }

  get priorityAlerts(): Medicament[] {
    return this.medicaments.filter(m => m.criticality === 'CRITICAL' || m.criticality === 'HIGH' || m.isActive === false);
  }

  deleteMed(id: string): void {
    if (!confirm('Are you sure you want to delete this medication?')) return;
    this.medicationService.deleteMedication(id).subscribe({
      next: () => { this.medicaments = this.medicaments.filter(m => m.id !== id); },
      error: (err) => console.error('Failed to delete medication', err)
    });
  }
}