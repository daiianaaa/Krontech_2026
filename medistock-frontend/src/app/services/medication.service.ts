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

  getMedications(hospitalId?: string, hospitalName?: string, name?: string, category?: string, isActive?: boolean): Observable<Medicament[]> {
    let params: any = {};
    if (hospitalId) params.hospitalId = hospitalId;
    if (hospitalName) params.hospitalName = hospitalName;
    if (name) params.name = name;
    if (category && category !== 'ALL') params.category = category;
    if (isActive !== undefined) params.isActive = isActive;

    return this.http.get<Medicament[]>(this.API_URL, { 
      params,
      withCredentials: true 
    });
  }



  deleteMedication(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`, { withCredentials: true });
  }
}
