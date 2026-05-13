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
  @Input() backendError: string = '';

  @Output() save = new EventEmitter<Medicament>();
  @Output() cancelEdit = new EventEmitter<void>();

  model: Medicament = this.getEmptyModel();
  validationError: string = '';

  readonly formOptions = {
    forms: ['tablet', 'capsule', 'syrup', 'injection', 'cream', 'drops', 'patch', 'suppository', 'inhaler', 'powder'],
    criticalities: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    storageTypes: ['NORMAL', 'COLD', 'FROZEN', 'CONTROLLED']
  };

  get isEditMode(): boolean {
    return this.medicamentToEdit !== null;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['medicamentToEdit']) {
      this.model = this.medicamentToEdit
        ? { ...this.medicamentToEdit }
        : this.getEmptyModel();
      this.validationError = '';
      this.backendError = '';
    }
  }

  private validateTextField(value: string | undefined | null, fieldName: string, maxLength: number = 100): string {
    if (!value || !value.trim()) return `${fieldName} is required.`;
    if (value.trim().length > maxLength) return `${fieldName} cannot exceed ${maxLength} characters.`;
    return '';
  }

  private validateOptionalTextField(value: string | undefined | null, fieldName: string, maxLength: number = 100): string {
    if (value && value.trim().length > maxLength) return `${fieldName} cannot exceed ${maxLength} characters.`;
    return '';
  }

  submit(): void {
    this.validationError =
      this.validateTextField(this.model.code, 'Code', 50) ||
      this.validateTextField(this.model.name, 'Name') ||
      this.validateTextField(this.model.category, 'Category') ||
      this.validateOptionalTextField(this.model.genericName, 'Generic Name') ||
      this.validateOptionalTextField(this.model.therapeuticClass, 'Therapeutic Class') ||
      this.validateOptionalTextField(this.model.concentration, 'Concentration', 50) ||
      this.validateOptionalTextField(this.model.unit, 'Unit', 50);

    if (this.validationError) return;

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
      id: '',
      code: '',
      name: '',
      category: '',
      genericName: '',
      therapeuticClass: '',
      form: '',
      concentration: '',
      unit: '',
      criticality: '',
      requiredStorageType: '',
      controlledSubstance: false,
      standardDailyUsagePerPatient: undefined,
      defaultMinBufferDays: undefined,
      defaultTargetBufferDays: undefined,
      isActive: true
    };
  }
}