import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MEDICAMENTS_MOCK } from "../../data/medicaments.mock";
import { Medicament } from "../../models/medicament";
@Component({
  selector: 'app-medicament-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './medicament-list.html',
  styleUrl: './medicament-list.scss',
})
export class MedicamentListComponent {
  page = 0;
  size = 20;
  get totalPages(): number {
    return Math.ceil(this.medicaments.length / this.size);
  }
  get paginatedMedications() {
    const start = this.page * this.size;
    const end = start + this.size;
    return this.medicaments.slice(start, end);
  }

  nextPage() {
    if (this.page < this.totalPages - 1) {
      this.page++;
    }
  }

  previousPage() {
    if (this.page > 0) {
      this.page--;
    }
  }
  @Input() medicaments: Medicament[] = [];

  getStatus(m: Medicament): string {

    if (m.daysUntilExpiry < 0) return 'Expired';

    if (m.daysUntilExpiry <= 30) return 'Expiring Soon';

    if (m.stock <= 10) return 'Low Stock';

    return 'OK';

  }


}