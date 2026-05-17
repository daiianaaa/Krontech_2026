import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, switchMap } from 'rxjs';

import { AuthUser, LoginRequest, LoginResponse, UserRole } from '../models/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = '/api/auth';
  private readonly USER_KEY = 'medistock_user';

  constructor(private http: HttpClient) {}

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.API_URL}/login`, request, {
        withCredentials: true
      })
      .pipe(
        switchMap(() => {
          // Obținem profilul userului curent direct din JWT (fără a căuta prin toți userii)
          return this.http
            .get<any>(`${this.API_URL}/me`, { withCredentials: true })
            .pipe(
              tap((backendUser) => {
                const user: AuthUser = {
                  id: backendUser?.id,
                  username: backendUser?.username || request.username,
                  role: this.mapRole(backendUser?.role),
                  institutionName: backendUser?.fullName || request.username,
                  hospitalId: backendUser?.hospitalId
                };
                sessionStorage.setItem(this.USER_KEY, JSON.stringify(user));
              }),
              switchMap(() =>
                new Observable<LoginResponse>((obs) => {
                  obs.next({ message: 'Login successful' });
                  obs.complete();
                })
              )
            );
        })
      );
  }

  logout(): void {
    sessionStorage.removeItem(this.USER_KEY);
  }

  getCurrentUser(): AuthUser | null {
    const storedUser = sessionStorage.getItem(this.USER_KEY);
    if (!storedUser) return null;
    try {
      return JSON.parse(storedUser);
    } catch {
      sessionStorage.removeItem(this.USER_KEY);
      return null;
    }
  }

  isLoggedIn(): boolean {
    return this.getCurrentUser() !== null;
  }

  private mapRole(role?: string): UserRole {
    if (!role) return 'ADMIN';
    const r = role.toUpperCase();
    if (r === 'ADMIN') return 'ADMIN';
    if (r === 'PHARMACIST') return 'PHARMACIST';
    if (r === 'PROVIDER') return 'PROVIDER';
    if (r === 'MANAGER') return 'MANAGER';
    return 'ADMIN';
  }
}