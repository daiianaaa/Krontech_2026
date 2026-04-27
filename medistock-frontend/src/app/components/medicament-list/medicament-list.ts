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

  @Input() medicaments: Medicament[] = [];

  getStatus(m: Medicament): string {

    if (m.daysUntilExpiry < 0) return 'Expired';

    if (m.daysUntilExpiry <= 30) return 'Expiring Soon';

    if (m.stock <= 10) return 'Low Stock';

    return 'OK';

  }

}