import { Component, Input, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Medicament } from '../../models/medicament';

@Component({
  selector: 'app-medicament-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './medicament-list.html',
  styleUrl: './medicament-list.scss',
})
export class MedicamentListComponent {
  @Input() medicaments: Medicament[] = [];

  @Output() edit = new EventEmitter<Medicament>();
  @Output() delete = new EventEmitter<string>();

  searchTerm = '';
  selectedStatus= '';
  selectedCategory = 'ALL';
  statusFilter: 'ALL' | 'ACTIVE' | 'INACTIVE' = 'ALL';

  page = 0;
  size = 20;

  get categories(): string[] {
    return [...new Set(this.medicaments.map((m) => m.category))].filter(Boolean);
  }

  get filteredMedications(): Medicament[] {
    return this.medicaments.filter((m) => {
      const matchesSearch =
        (m.name ?? '').toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        m.code?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        m.genericName?.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesCategory =
        this.selectedCategory === 'ALL' || m.category === this.selectedCategory;

      const isActive = m.isActive !== false;
      const matchesStatus = this.statusFilter === 'ALL' ||
                            (this.statusFilter === 'ACTIVE' && isActive) ||
                            (this.statusFilter === 'INACTIVE' && !isActive);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredMedications.length / this.size));
  }

  get paginatedMedications(): Medicament[] {
    const start = this.page * this.size;
    const end = start + this.size;
    return this.filteredMedications.slice(start, end);
  }

  onSearchChange(): void {
    this.page = 0;
  }

  onCategoryChange(): void {
    this.page = 0;
  }

  onStatusChange(): void {
    this.page = 0;
  }

  nextPage(): void {
    if (this.page < this.totalPages - 1) {
      this.page++;
    }
  }

  previousPage(): void {
    if (this.page > 0) {
      this.page--;
    }
  }

  onEdit(m: Medicament): void {
    this.edit.emit(m);
  }

  onDelete(id: string): void {
    this.delete.emit(id);
  }

  getCriticalityClass(criticality: string | undefined): string {
    switch (criticality?.toUpperCase()) {
      case 'CRITICAL': return 'status-critical';
      case 'HIGH': return 'status-high';
      case 'MEDIUM': return 'status-medium';
      case 'LOW': return 'status-low';
      default: return '';
    }
  }
}