import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Medicament } from './models/medicament';
import { MEDICAMENTS_MOCK } from './data/medicaments.mock';
import { MedicamentListComponent } from './components/medicament-list/medicament-list';
import { MedicationForm } from './components/medication-form/medication-form';
import { Login } from './pages/login/login';
import { AuthService } from './services/auth';
import { AuthUser } from './models/auth';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, MedicamentListComponent, MedicationForm, Login],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  medicaments: Medicament[] = MEDICAMENTS_MOCK;

  currentUser: AuthUser | null = null;

  activeTab: 'dashboard' | 'medications' | 'alerts' | 'predictions' = 'dashboard';

  alertSearch = '';
  alertStatus: 'ALL' | 'LOW_STOCK' | 'EXPIRING' | 'EXPIRED' = 'ALL';
  alertPage = 0;
  alertPageSize = 5;

  constructor(private authService: AuthService) {
    this.currentUser = this.authService.getCurrentUser();
  }

  addMed(m: Medicament): void {
    m.id = this.medicaments.length + 1;
    this.medicaments = [m, ...this.medicaments];
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
}