import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { LoginRequest, AuthUser } from '../models/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly USER_KEY = 'medistock_user';
  private readonly API_URL = 'http://localhost:8080/api/auth';

  constructor(private http: HttpClient) {}

  login(request: LoginRequest): Observable<{ message: string, user: AuthUser }> {
    return this.http.post<{ message: string, user: AuthUser }>(`${this.API_URL}/login`, request, {
      withCredentials: true
    }).pipe(
      tap(response => {
        if (response.user) {
          localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.USER_KEY);
  }

  getCurrentUser(): AuthUser | null {
    const user = localStorage.getItem(this.USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  isLoggedIn(): boolean {
    return !!this.getCurrentUser();
  }

  hasRole(role: string): boolean {
    return this.getCurrentUser()?.role === role;
  }
}