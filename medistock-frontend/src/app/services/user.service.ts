import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface FacilityUser {
  id: number;
  name: string;
  username: string;
  type: string;
  region: string;
  address: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly API_URL = 'http://localhost:8080/api/users';

  constructor(private http: HttpClient) {}

  getAllUsers(): Observable<FacilityUser[]> {
    return this.http.get<FacilityUser[]>(this.API_URL, { withCredentials: true });
  }

  getFacilityNames(): Observable<string[]> {
    return this.getAllUsers().pipe(
      map(users => users.map(u => u.username))
    );
  }
}
