import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Medicament } from '../models/medicament';

@Injectable({
  providedIn: 'root'
})
export class MedicationService {
  private readonly API_URL = 'http://localhost:8080/api/medication';

  constructor(private http: HttpClient) {}

  private calculateDaysUntilExpiry(expiryDate: string): number {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private mapMedication(med: any): Medicament {
    return {
      ...med,
      daysUntilExpiry: this.calculateDaysUntilExpiry(med.expiryDate)
    };
  }

  getMedications(): Observable<Medicament[]> {
    return this.http.get<any[]>(this.API_URL, { withCredentials: true }).pipe(
      map(meds => meds.map(med => this.mapMedication(med)))
    );
  }

  addMedication(med: Partial<Medicament>): Observable<Medicament> {
    const { id, ...newMedicationPayload } = med; // Remove ID to let backend generate it
    return this.http.post<any>(this.API_URL, newMedicationPayload, { withCredentials: true }).pipe(
      map(response => this.mapMedication(response))
    );
  }

  updateMedication(id: number, med: Partial<Medicament>): Observable<Medicament> {
    return this.http.put<any>(`${this.API_URL}/${id}`, med, { withCredentials: true }).pipe(
      map(response => this.mapMedication(response))
    );
  }

  deleteMedication(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`, { withCredentials: true });
  }
}
