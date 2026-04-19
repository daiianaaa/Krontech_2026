import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { VaccineBooking, TimeSlot } from '../models';

@Injectable({ providedIn: 'root' })
export class BookingService {
  private readonly API = '/api/bookings';

  constructor(private http: HttpClient) {}

  getMyBookings(): Observable<VaccineBooking[]> {
    return this.http.get<VaccineBooking[]>(`${this.API}/my`);
  }

  getBookingById(id: string): Observable<VaccineBooking> {
    return this.http.get<VaccineBooking>(`${this.API}/${id}`);
  }

  getAvailableSlots(pharmacyId: string, productId: string, date: string): Observable<TimeSlot[]> {
    return this.http.get<TimeSlot[]>(`${this.API}/slots`, {
      params: { pharmacyId, productId, date }
    });
  }

  createBooking(booking: Partial<VaccineBooking>): Observable<VaccineBooking> {
    return this.http.post<VaccineBooking>(this.API, booking);
  }

  cancelBooking(id: string): Observable<VaccineBooking> {
    return this.http.delete<VaccineBooking>(`${this.API}/${id}`);
  }
}
