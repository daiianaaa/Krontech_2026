import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Medicament } from '../../models/medicament';

@Component({
  selector: 'app-medication-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './medication-form.html',
  styleUrl: './medication-form.scss'
})
export class MedicationForm {
  @Output() add = new EventEmitter<Medicament>();

  model: Medicament = {
    id: 0,                // va fi setat în App
    name: '',
    category: '',
    stock: 0,
    expiryDate: '',
    daysUntilExpiry: 0,   // calculat
    batchNumber: '',
    price: 0,
    supplier: ''
  };

  submit() {
    // calculează daysUntilExpiry
    const today = new Date();
    const exp = new Date(this.model.expiryDate);
    const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    this.model.daysUntilExpiry = diff;

    this.add.emit({ ...this.model });

    // reset form
    this.model = {
      id: 0,
      name: '',
      category: '',
      stock: 0,
      expiryDate: '',
      daysUntilExpiry: 0,
      batchNumber: '',
      price: 0,
      supplier: ''
    };
  }
}