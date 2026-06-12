import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpErrorResponse } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { Observable, catchError, throwError } from "rxjs";
import { AuthService } from "./auth-service";

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private authService: AuthService, private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = AuthService.token;

    const request = token
      ? req.clone({ headers: req.headers.set('Authorization', `Bearer ${token}`) })
      : req;

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        // Token ausente/expirado/inválido en una petición protegida: cerramos sesión.
        // Se excluyen login/registro para no interferir con sus propios errores 401.
        const esAuth = request.url.includes('/login') || request.url.includes('/register');
        if (error.status === 401 && !esAuth) {
          this.authService.logout();
          this.router.navigate(['/login']);
        }
        return throwError(() => error);
      })
    );
  }
}
