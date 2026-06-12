import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/auth/auth/auth.component').then((m) => m.AuthComponent),
    children: [
      {
        path: 'login',
        loadComponent: () => import('./pages/auth/login/login.component').then((m) => m.LoginComponent),
      },
      {
        path: 'register',
        loadComponent: () => import('./pages/auth/register/register.component').then((m) => m.RegisterComponent),
      },
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full',
      }
    ]
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./layouts/dashboard/dashboard.component').then((m) => m.DashboardComponent),
    children: [
      {
        path: 'panel',
        loadComponent: () => import('./pages/dashboard/panel/panel.component').then((m) => m.PanelComponent),
      },
      {
        path: 'historial',
        loadComponent: () => import('./pages/dashboard/matches/matches.component').then((m) => m.MatchesComponent),
      },
      {
        path: 'classification',
        loadComponent: () => import('./pages/dashboard/classification/classification.component').then((m) => m.ClassificationComponent),
      },
      {
        path: 'ranking',
        loadComponent: () => import('./pages/dashboard/ranking/ranking.component').then((m) => m.RankingComponent),
      },
      {
        path: 'profile', // Renamed from 'perfil'
        loadComponent: () => import('./pages/dashboard/profile/profile.component').then((m) => m.ProfileComponent),
      },
      {
        path: 'match/:id', // Moved inside dashboard
        loadComponent: () => import('./pages/dashboard/match-detail/match-detail.component').then((m) => m.MatchDetailComponent),
      },
      {
        path: 'team/:teamName',
        loadComponent: () => import('./components/team-detail/team-detail.component').then((m) => m.TeamDetailComponent),
      },
      {
        path: '',
        redirectTo: 'historial',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '**', // Fallback
    redirectTo: 'login',
    pathMatch: 'full',
  },
];
