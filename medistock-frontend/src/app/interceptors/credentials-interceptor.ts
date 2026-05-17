import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth';

export const credentialsInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);

  const modifiedRequest = request.clone({
    withCredentials: true
  });

  return next(modifiedRequest).pipe(
    catchError((error) => {
      // 401: not authenticated — cookie missing or invalid
      // 403: JWT cookie is expired/malformed → filter crashed → treat as session expired
      if (error.status === 401 || error.status === 403) {
        authService.logout(); // clears sessionStorage so login page is shown
      }
      return throwError(() => error);
    })
  );
};