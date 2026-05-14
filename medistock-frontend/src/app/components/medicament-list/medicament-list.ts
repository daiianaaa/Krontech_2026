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
  @Output() delete = new EventEmitter<number>();

  searchTerm = '';
  selectedCategory = 'ALL';

  page = 0;
  size = 20;

  get categories(): string[] {
    return [...new Set(this.medicaments.map((m) => m.category))];
  }

  get filteredMedications(): Medicament[] {
    return this.medicaments.filter((m) => {
      const matchesSearch = m.name
        .toLowerCase()
        .includes(this.searchTerm.toLowerCase());

      const matchesCategory =
        this.selectedCategory === 'ALL' ||
        m.category === this.selectedCategory;

      return matchesSearch && matchesCategory;
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

  onDelete(id: number): void {
    this.delete.emit(id);
  }

  getStatus(m: Medicament): string {
    if (m.daysUntilExpiry < 0) return 'Expired';
    if (m.daysUntilExpiry <= 30) return 'Expiring Soon';
    if (m.stock <= 10) return 'Low Stock';
    return 'OK';
  }
}