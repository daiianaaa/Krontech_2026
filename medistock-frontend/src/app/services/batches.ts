import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MedicationBatch } from '../models/medication-batch';

@Injectable({
  providedIn: 'root'
})
export class BatchesService {
  private readonly apiUrl = '/api/batches';

  constructor(private http: HttpClient) {}

  getBatches(): Observable<MedicationBatch[]> {
    return this.http.get<MedicationBatch[]>(this.apiUrl);
  }
}