import { Component } from '@angular/core';
import { Medicament } from './models/medicament';
import { MEDICAMENTS_MOCK } from './data/medicaments.mock';
import { MedicamentListComponent } from './components/medicament-list/medicament-list';
import { MedicationForm } from './components/medication-form/medication-form';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [MedicamentListComponent, MedicationForm],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  medicaments: Medicament[] = MEDICAMENTS_MOCK;

  addMed(m: Medicament) {
    m.id = this.medicaments.length + 1; // simplu pt mock
    this.medicaments = [m, ...this.medicaments];
  }
}