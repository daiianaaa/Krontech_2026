import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Medicament } from '../models/medicament';

@Injectable({
  providedIn: 'root'
})
export class MedicationService {
  private readonly API_URL = '/api/medication';

  constructor(private http: HttpClient) {}

  getMedications(): Observable<Medicament[]> {
    return this.http.get<Medicament[]>(this.API_URL, { withCredentials: true });
  }

  addMedication(med: Partial<Medicament>): Observable<Medicament> {
    // Strip id and timestamps — backend generates them
    const { id, createdAt, updatedAt, ...payload } = med as any;
    return this.http.post<Medicament>(this.API_URL, payload, { withCredentials: true });
  }

  updateMedication(id: string, med: Partial<Medicament>): Observable<Medicament> {
    const { createdAt, updatedAt, ...payload } = med as any;
    return this.http.put<Medicament>(`${this.API_URL}/${id}`, payload, { withCredentials: true });
  }

  deleteMedication(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`, { withCredentials: true });
  }
}
