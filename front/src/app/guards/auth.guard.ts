import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth-service';

/**
 * Protege las rutas privadas: si no hay sesión válida, redirige a /login.
 * Al estar en la ruta padre `dashboard`, cubre también todas sus hijas
 * (acceso directo por URL incluido).
 */
export const authGuard: CanActivateFn = async () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const autenticado = await authService.isAuthenticated();
    return autenticado ? true : router.createUrlTree(['/login']);
};
