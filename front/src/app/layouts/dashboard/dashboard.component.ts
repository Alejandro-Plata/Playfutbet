import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { grid, trophy, barChart, person, time, logOut, search, notifications, football } from 'ionicons/icons';
import { NotificationsComponent } from '../../components/notifications/notifications.component';
import { User } from '../../types/types';
import { AuthService } from '../../services/auth-service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, IonIcon, NotificationsComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  currentUser: User | null = null;
  pageTitle: string = 'PANEL DE CONTROL';

  constructor(private router: Router, private authService: AuthService) {
    addIcons({ grid, trophy, barChart, person, time, logOut, search, notifications, football });
  }

  updateTitle(url: string) {
    if (url.includes('/panel')) this.pageTitle = 'PANEL DE CONTROL';
    else if (url.includes('/historial')) this.pageTitle = 'PARTIDOS';
    else if (url.includes('/classification')) this.pageTitle = 'CLASIFICACIÓN';
    else if (url.includes('/ranking')) this.pageTitle = 'RANKING';
    else if (url.includes('/profile')) this.pageTitle = 'PERFIL';
    else if (url.includes('/match')) this.pageTitle = 'DETALLE DEL PARTIDO';
    else if (url.includes('/team')) this.pageTitle = 'DETALLE DEL EQUIPO';
    else this.pageTitle = 'PANEL DE CONTROL';
  }

  async ngOnInit() {
    await this.loadUserData();
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd) // Solo nos quedamos con los eventos de navegación
    ).subscribe((event: NavigationEnd) => {
      this.loadUserData();
      this.updateTitle(event.url);
    });
  }

  async loadUserData() {
    this.currentUser = await this.authService.syncUser();
  }

  getUserAvatar(): string {
    return this.currentUser?.avatar || 'https://img.freepik.com/free-vector/football-soccer-tournament-vector-logo-design_47987-24746.jpg?semt=ais_user_personalization&w=740&q=80';
  }

  getUserName(): string {
    return this.currentUser?.username?.toUpperCase() || 'USUARIO';
  }

  async logout() {
    this.currentUser = null;
    await this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
