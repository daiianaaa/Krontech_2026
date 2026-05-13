import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface BackendUser {
  id: string;
  hospitalId?: string;
  fullName?: string;
  username: string;
  email?: string;
  role: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly API_URL = '/api/users';

  constructor(private http: HttpClient) {}

  getAllUsers(): Observable<BackendUser[]> {
    return this.http.get<BackendUser[]>(this.API_URL, { withCredentials: true });
  }

  getFacilityNames(): Observable<string[]> {
    return this.getAllUsers().pipe(
      map(users => users.map(u => u.username))
    );
  }
}
