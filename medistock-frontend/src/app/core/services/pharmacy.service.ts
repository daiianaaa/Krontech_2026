import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Pharmacy } from '../models';

@Injectable({ providedIn: 'root' })
export class PharmacyService {
  private readonly API = '/api/pharmacies';

  constructor(private http: HttpClient) {}

  getNearby(lat: number, lng: number, radiusKm = 10): Observable<Pharmacy[]> {
    return this.http.get<Pharmacy[]>(`${this.API}/nearby`, {
      params: { lat: String(lat), lng: String(lng), radius: String(radiusKm) }
    });
  }

  searchByVaccine(productId: string, city?: string): Observable<Pharmacy[]> {
    let params = new HttpParams().set('productId', productId);
    if (city) params = params.set('city', city);
    return this.http.get<Pharmacy[]>(`${this.API}/search`, { params });
  }

  getPharmacyById(id: string): Observable<Pharmacy> {
    return this.http.get<Pharmacy>(`${this.API}/${id}`);
  }
}
