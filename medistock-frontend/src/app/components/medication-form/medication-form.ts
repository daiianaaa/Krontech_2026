import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
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
export class MedicationForm implements OnChanges {
  @Input() medicamentToEdit: Medicament | null = null;

  @Output() save = new EventEmitter<Medicament>();
  @Output() cancelEdit = new EventEmitter<void>();

  model: Medicament = this.getEmptyModel();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['medicamentToEdit'] && this.medicamentToEdit) {
      this.model = { ...this.medicamentToEdit };
    }
  }

  validationError: string = '';

  get isEditMode(): boolean {
    return this.medicamentToEdit !== null;
  }

  submit(): void {
    this.validationError = '';

    if (this.model.stock < 0) {
      this.validationError = 'Stock cannot be negative.';
      return;
    }

    if (this.model.price < 0) {
      this.validationError = 'Price cannot be negative.';
      return;
    }

    const today = new Date();
    const exp = new Date(this.model.expiryDate);
    const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    this.model.daysUntilExpiry = diff;

    this.save.emit({ ...this.model });

    this.resetForm();
  }

  cancel(): void {
    this.resetForm();
    this.cancelEdit.emit();
  }

  private resetForm(): void {
    this.validationError = '';
    this.model = this.getEmptyModel();
  }

  private getEmptyModel(): Medicament {
    return {
      id: 0,
      name: '',
      category: '',
      stock: null as any,
      expiryDate: '',
      daysUntilExpiry: 0,
      batchNumber: '',
      price: null as any,
      supplier: ''
    };
  }
}