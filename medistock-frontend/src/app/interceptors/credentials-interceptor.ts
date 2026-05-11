import { HttpInterceptorFn } from '@angular/common/http';
import { tap } from 'rxjs';

export const credentialsInterceptor: HttpInterceptorFn = (request, next) => {

  const modifiedRequest = request.clone({
    withCredentials: true
  });

  return next(modifiedRequest).pipe(
    tap({
      next: (event) => {
        console.log('Response OK:', event);
      },
      error: (error) => {
        if (error.status === 401) {
          console.error('Unauthorized → user not logged in');
        }
      }
    })
  );
};