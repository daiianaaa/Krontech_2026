import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Medicament } from './models/medicament';
import { MedicationService } from './services/medication.service';
import { MedicamentListComponent } from './components/medicament-list/medicament-list';
import { MedicationForm } from './components/medication-form/medication-form';
import { Login } from './pages/login/login';
import { AuthService } from './services/auth';
import { AuthUser } from './models/auth';
import { TransferManagementComponent } from './components/transfer-management/transfer-management';
import { TransferService } from './services/transfer.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    MedicamentListComponent,
    MedicationForm,
    Login,
    TransferManagementComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  medicaments: Medicament[] = [];

  currentUser: AuthUser | null = null;

  get currentFacility(): string {
    return this.currentUser?.username || 'Spitalul Clinic Județean de Urgență Brașov';
  }

  selectedMedicament: Medicament | null = null;

  activeTab:
    | 'dashboard'
    | 'medications'
    | 'transfers'
    | 'inbox'
    | 'alerts'
    | 'predictions' = 'dashboard';

  alertSearch = '';
  alertStatus: 'ALL' | 'LOW_STOCK' | 'EXPIRING' | 'EXPIRED' = 'ALL';
  alertPage = 0;
  alertPageSize = 5;

  constructor(
    private authService: AuthService,
    private transferService: TransferService,
    private medicationService: MedicationService
  ) {
    this.currentUser = this.authService.getCurrentUser();
  }

  ngOnInit(): void {
    this.loadMedications();
  }

  loadMedications(): void {
    this.medicationService.getMedications().subscribe({
      next: (data) => {
        // Sort descending by ID so newest are at the top
        this.medicaments = data.sort((a, b) => b.id - a.id);
      },
      error: (err) => console.error('Failed to load medications', err)
    });
  }

  get inboxNotificationCount(): number {
    return this.transferService
      .getTransfers()
      .filter(
        (transfer) =>
          transfer.toFacility === this.currentFacility &&
          transfer.status === 'PENDING'
      ).length;
  }

  saveMed(m: Medicament): void {
    if (this.selectedMedicament) {
      this.medicationService.updateMedication(this.selectedMedicament.id, m).subscribe({
        next: (updatedMed) => {
          this.medicaments = this.medicaments.map(med => 
            med.id === updatedMed.id ? updatedMed : med
          );
          this.selectedMedicament = null;
        },
        error: (err) => console.error('Failed to update medication', err)
      });
      return;
    }
  
    this.medicationService.addMedication(m).subscribe({
      next: (newMed) => {
        this.medicaments = [newMed, ...this.medicaments];
      },
      error: (err) => console.error('Failed to add medication', err)
    });
  }
  cancelMedicationEdit(): void {
    this.selectedMedicament = null;
  }

  reserveTransferredStock(event: { medicationId: number; quantity: number }): void {
    this.medicaments = this.medicaments.map((medicament) => {
      if (medicament.id !== event.medicationId) {
        return medicament;
      }

      return {
        ...medicament,
        stock: Math.max(0, medicament.stock - event.quantity)
      };
    });
  }

  onLoginSuccess(user: AuthUser): void {
    this.currentUser = user;
    this.activeTab = 'dashboard';
  }

  logout(): void {
    this.authService.logout();
    this.currentUser = null;
    this.activeTab = 'dashboard';
  }

  canAddMedication(): boolean {
    return this.currentUser?.role === 'ADMIN' || this.currentUser?.role === 'PHARMACIST';
  }

  canUpdateStock(): boolean {
    return this.currentUser?.role === 'ADMIN' || this.currentUser?.role === 'PHARMACIST';
  }

  canViewPredictions(): boolean {
    return this.currentUser?.role === 'ADMIN';
  }

  getMedicationStatus(m: Medicament): 'LOW_STOCK' | 'EXPIRING' | 'EXPIRED' | 'OK' {
    if (m.daysUntilExpiry < 0) return 'EXPIRED';
    if (m.daysUntilExpiry <= 30) return 'EXPIRING';
    if (m.stock <= 10) return 'LOW_STOCK';
    return 'OK';
  }

  get priorityAlerts(): Medicament[] {
    return this.medicaments.filter(
      (m: Medicament) => this.getMedicationStatus(m) !== 'OK'
    );
  }

  get filteredPriorityAlerts(): Medicament[] {
    return this.priorityAlerts.filter((m: Medicament) => {
      const search = this.alertSearch.toLowerCase();

      const matchesSearch =
        m.name.toLowerCase().includes(search) ||
        m.batchNumber.toLowerCase().includes(search);

      const matchesStatus =
        this.alertStatus === 'ALL' ||
        this.getMedicationStatus(m) === this.alertStatus;

      return matchesSearch && matchesStatus;
    });
  }

  get paginatedPriorityAlerts(): Medicament[] {
    const start = this.alertPage * this.alertPageSize;
    return this.filteredPriorityAlerts.slice(start, start + this.alertPageSize);
  }

  get alertTotalPages(): number {
    return Math.max(
      1,
      Math.ceil(this.filteredPriorityAlerts.length / this.alertPageSize)
    );
  }

  onAlertSearchChange(value: string): void {
    this.alertSearch = value;
    this.alertPage = 0;
  }

  onAlertStatusChange(value: string): void {
    this.alertStatus = value as 'ALL' | 'LOW_STOCK' | 'EXPIRING' | 'EXPIRED';
    this.alertPage = 0;
  }

  nextAlertPage(): void {
    if (this.alertPage < this.alertTotalPages - 1) {
      this.alertPage++;
    }
  }

  previousAlertPage(): void {
    if (this.alertPage > 0) {
      this.alertPage--;
    }
  }

  get lowStockCount(): number {
    return this.medicaments.filter((m: Medicament) => m.stock <= 10).length;
  }

  get expiredCount(): number {
    return this.medicaments.filter(
      (m: Medicament) => m.daysUntilExpiry < 0
    ).length;
  }

  get expiringSoonCount(): number {
    return this.medicaments.filter(
      (m: Medicament) => m.daysUntilExpiry >= 0 && m.daysUntilExpiry <= 30
    ).length;
  }

  get totalEstimatedLoss(): number {
    return this.medicaments
      .filter((m: Medicament) => m.daysUntilExpiry < 0)
      .reduce((sum: number, m: Medicament) => sum + m.stock * m.price, 0);
  }

  get highestRiskCategory(): string {
    const categoryLoss: Record<string, number> = {};

    this.medicaments
      .filter((m: Medicament) => m.daysUntilExpiry < 0)
      .forEach((m: Medicament) => {
        const loss = m.stock * m.price;
        categoryLoss[m.category] = (categoryLoss[m.category] || 0) + loss;
      });

    let maxCategory = 'N/A';
    let maxLoss = 0;

    for (const category in categoryLoss) {
      if (categoryLoss[category] > maxLoss) {
        maxLoss = categoryLoss[category];
        maxCategory = category;
      }
    }

    return maxCategory;
  }
  //edit and delete methods for the medication list component
  editMed(med: Medicament): void {
    this.selectedMedicament = { ...med };
    this.activeTab = 'medications';
  }
  deleteMed(id: number): void {
    const confirmed = confirm('Are you sure you want to delete this medication?');

    if (!confirmed) return;
    
    this.medicationService.deleteMedication(id).subscribe({
      next: () => {
        this.medicaments = this.medicaments.filter((m) => m.id !== id);
      },
      error: (err) => console.error('Failed to delete medication', err)
    });
  }

}
