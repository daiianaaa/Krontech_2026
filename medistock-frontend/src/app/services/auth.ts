import { Injectable } from '@angular/core';
import { LoginRequest, LoginResponse, AuthUser } from '../models/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'medistock_token';
  private readonly USER_KEY = 'medistock_user';

  // mock users (fără parole)
  private mockUsers = [
    {
      id: 1,
      username: 'admin',
      role: 'ADMIN' as const
    },
    {
      id: 2,
      username: 'pharmacist',
      role: 'PHARMACIST' as const
    },
    {
      id: 3,
      username: 'provider',
      role: 'PROVIDER' as const
    }
  ];

  login(request: LoginRequest): LoginResponse {
    // mock logic: username valid + parolă non-goală
    const foundUser = this.mockUsers.find(
      user => user.username === request.username
    );

    if (!foundUser || !request.password || request.password.length < 1) {
      throw new Error('Invalid username or password');
    }

    const authUser: AuthUser = {
      id: foundUser.id,
      username: foundUser.username,
      role: foundUser.role
    };

    const response: LoginResponse = {
      token: 'mock-jwt-token-' + foundUser.role,
      user: authUser
    };

    localStorage.setItem(this.TOKEN_KEY, response.token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));

    return response;
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getCurrentUser(): AuthUser | null {
    const user = localStorage.getItem(this.USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  hasRole(role: string): boolean {
    return this.getCurrentUser()?.role === role;
  }
}