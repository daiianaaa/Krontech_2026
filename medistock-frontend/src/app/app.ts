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
import { UserService } from './services/user.service';

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
  destinationFacilities: string[] = [];

  currentUser: AuthUser | null = null;
  selectedMedicament: Medicament | null = null;
  backendError = '';

  activeTab:
    | 'dashboard'
    | 'medications'
    | 'transfers'
    | 'inbox'
    | 'alerts' = 'dashboard';

  constructor(
    private authService: AuthService,
    private transferService: TransferService,
    private medicationService: MedicationService,
    private userService: UserService
  ) {
    this.currentUser = this.authService.getCurrentUser();
  }

  ngOnInit(): void {
    if (this.currentUser) {
      this.loadMedications();
      this.loadFacilities();
    }
  }

  get currentFacility(): string {
    return this.currentUser?.institutionName || this.currentUser?.username || '';
  }

  loadFacilities(): void {
    this.userService.getFacilityNames().subscribe({
      next: (names: string[]) => {
        this.destinationFacilities = names.filter(
          (name: string) => name !== this.currentFacility
        );
      },
      error: (err) => console.error('Failed to load facilities', err)
    });
  }

  loadMedications(): void {
    this.medicationService.getMedications().subscribe({
      next: (data: Medicament[]) => {
        this.medicaments = data.sort((a: Medicament, b: Medicament) =>
          (a.name ?? '').localeCompare(b.name ?? '')
        );
      },
      error: (err) => {
        console.error('Failed to load medications', err);
        this.currentUser = null;
      }
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
    this.backendError = '';

    if (this.selectedMedicament) {
      if (!this.selectedMedicament.id) {
        this.backendError = 'Medication ID is missing.';
        return;
      }

      this.medicationService.updateMedication(this.selectedMedicament.id, m).subscribe({
        next: (updatedMed: Medicament) => {
          this.medicaments = this.medicaments.map((med: Medicament) =>
            med.id === updatedMed.id ? updatedMed : med
          );

          this.selectedMedicament = null;
        },
        error: (err) => {
          this.backendError =
            err.error?.message || err.error?.eroare || 'An error occurred';
        }
      });

      return;
    }

    this.medicationService.addMedication(m).subscribe({
      next: (newMed: Medicament) => {
        this.medicaments = [newMed, ...this.medicaments];
      },
      error: (err) => {
        this.backendError =
          err.error?.message || err.error?.eroare || 'An error occurred';
      }
    });
  }

  cancelMedicationEdit(): void {
    this.selectedMedicament = null;
  }

  onLoginSuccess(user: AuthUser): void {
    this.currentUser = user;
    this.loadFacilities();
    this.loadMedications();
    this.activeTab = 'dashboard';
  }

  logout(): void {
    this.authService.logout();
    this.currentUser = null;
    this.medicaments = [];
    this.destinationFacilities = [];
    this.selectedMedicament = null;
    this.activeTab = 'dashboard';
  }

  canAddMedication(): boolean {
    return (
      this.currentUser?.role === 'ADMIN' ||
      this.currentUser?.role === 'PHARMACIST'
    );
  }

  get activeCount(): number {
    return this.medicaments.filter((m: Medicament) => m.isActive !== false).length;
  }

  get inactiveCount(): number {
    return this.medicaments.filter((m: Medicament) => m.isActive === false).length;
  }

  get controlledCount(): number {
    return this.medicaments.filter(
      (m: Medicament) => m.controlledSubstance
    ).length;
  }

  get criticalCount(): number {
    return this.medicaments.filter(
      (m: Medicament) =>
        m.criticality === 'CRITICAL' || m.criticality === 'HIGH'
    ).length;
  }

  getMedicationStatus(
    m: Medicament
  ): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INACTIVE' | 'OK' {
    if (!m.isActive) return 'INACTIVE';
    if (m.criticality === 'CRITICAL') return 'CRITICAL';
    if (m.criticality === 'HIGH') return 'HIGH';
    if (m.criticality === 'MEDIUM') return 'MEDIUM';
    if (m.criticality === 'LOW') return 'LOW';
    return 'OK';
  }

  get priorityAlerts(): Medicament[] {
    return this.medicaments.filter(
      (m: Medicament) =>
        m.criticality === 'CRITICAL' ||
        m.criticality === 'HIGH' ||
        m.isActive === false
    );
  }

  editMed(med: Medicament): void {
    this.selectedMedicament = { ...med };
    this.activeTab = 'medications';
  }

  deleteMed(id: string): void {
    const confirmed = confirm('Are you sure you want to delete this medication?');

    if (!confirmed) return;

    this.medicationService.deleteMedication(id).subscribe({
      next: () => {
        this.medicaments = this.medicaments.filter(
          (m: Medicament) => m.id !== id
        );
      },
      error: (err) => console.error('Failed to delete medication', err)
    });
  }
}