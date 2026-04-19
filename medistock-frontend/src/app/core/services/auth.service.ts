import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { User, AuthState } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API = '/api/auth';

  // Reactive state using Angular signals
  private _state = signal<AuthState>({
    user: null,
    token: localStorage.getItem('ms_token'),
    isAuthenticated: !!localStorage.getItem('ms_token'),
    isLoading: false
  });

  readonly state = this._state.asReadonly();
  readonly currentUser = computed(() => this._state().user);
  readonly isAuthenticated = computed(() => this._state().isAuthenticated);
  readonly isB2BUser = computed(() => {
    const role = this._state().user?.role;
    return ['admin', 'manager', 'pharmacist', 'warehouse'].includes(role ?? '');
  });

  constructor(private http: HttpClient, private router: Router) {}

  login(email: string, password: string): Observable<{ user: User; token: string }> {
    this._state.update(s => ({ ...s, isLoading: true }));
    return this.http.post<{ user: User; token: string }>(`${this.API}/login`, { email, password }).pipe(
      tap(({ user, token }) => {
        localStorage.setItem('ms_token', token);
        this._state.set({ user, token, isAuthenticated: true, isLoading: false });
      }),
      catchError(err => {
        this._state.update(s => ({ ...s, isLoading: false }));
        return throwError(() => err);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('ms_token');
    this._state.set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    this.router.navigate(['/auth/login']);
  }

  refreshUser(): Observable<User> {
    return this.http.get<User>(`${this.API}/me`).pipe(
      tap(user => this._state.update(s => ({ ...s, user })))
    );
  }
}
