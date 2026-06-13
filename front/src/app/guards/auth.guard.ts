import { inject } from '@angular/core';
import { CanActivateFn, CanActivateChildFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth-service';

const checkAuth = async (state: RouterStateSnapshot): Promise<boolean | ReturnType<Router['createUrlTree']>> => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const autenticado = await authService.isAuthenticated();
    if (autenticado) return true;
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

export const authGuard: CanActivateFn = async (_route, state) => checkAuth(state);
export const authChildGuard: CanActivateChildFn = async (_route, state) => checkAuth(state);
