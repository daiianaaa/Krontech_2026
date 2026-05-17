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


  @Output() delete = new EventEmitter<string>();
  @Output() filterChange = new EventEmitter<{name?: string, category?: string, isActive?: boolean}>();

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
    // Now the backend does the heavy lifting, so we just return the input list.
    return this.medicaments;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredMedications.length / this.size));
  }

  get paginatedMedications(): Medicament[] {
    const start = this.page * this.size;
    const end = start + this.size;
    return this.filteredMedications.slice(start, end);
  }

  emitFilter(): void {
    const isActive = this.statusFilter === 'ALL' ? undefined : (this.statusFilter === 'ACTIVE');
    this.filterChange.emit({
      name: this.searchTerm,
      category: this.selectedCategory,
      isActive: isActive
    });
    this.page = 0;
  }

  onSearchChange(): void {
    this.emitFilter();
  }

  onCategoryChange(): void {
    this.emitFilter();
  }

  onStatusChange(): void {
    this.emitFilter();
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