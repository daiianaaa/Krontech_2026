import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { VaccinationRecord, VaccinationScheme } from '../models';

@Injectable({ providedIn: 'root' })
export class VaccinationService {
  private readonly API = '/api/vaccinations';

  constructor(private http: HttpClient) {}

  getMyRecords(): Observable<VaccinationRecord[]> {
    return this.http.get<VaccinationRecord[]>(`${this.API}/my`);
  }

  getMySchemes(): Observable<VaccinationScheme[]> {
    return this.http.get<VaccinationScheme[]>(`${this.API}/my/schemes`);
  }

  downloadCertificate(recordId: string): Observable<Blob> {
    return this.http.get(`${this.API}/${recordId}/certificate`, { responseType: 'blob' });
  }
}
