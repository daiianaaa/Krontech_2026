import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { AuthUser, LoginRequest, LoginResponse, UserRole } from '../models/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = 'http://localhost:8080/api/auth';
  private readonly USER_KEY = 'medistock_user';

  constructor(private http: HttpClient) {}

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.API_URL}/login`, request, {
        withCredentials: true
      })
      .pipe(
        tap(() => {
          const user: AuthUser = {
            username: request.username,
            role: this.mapRoleFromUsername(request.username)
          };

          sessionStorage.setItem(this.USER_KEY, JSON.stringify(user));
        })
      );
  }

  logout(): void {
    sessionStorage.removeItem(this.USER_KEY);
  }

  getCurrentUser(): AuthUser | null {
    const storedUser = sessionStorage.getItem(this.USER_KEY);

    if (!storedUser) {
      return null;
    }

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

  private mapRoleFromUsername(username: string): UserRole {
    const normalized = username.toLowerCase();

    if (normalized.includes('admin')) {
      return 'ADMIN';
    }

    if (normalized.includes('pharma') || normalized.includes('farm')) {
      return 'PHARMACIST';
    }

    if (normalized.includes('provider')) {
      return 'PROVIDER';
    }

    return 'ADMIN';
  }
}