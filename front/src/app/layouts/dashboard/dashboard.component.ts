import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { grid, trophy, barChart, person, time, logOut, search, notifications, football, chatbubbles, arrowUp } from 'ionicons/icons';
import { NotificationsComponent } from '../../components/notifications/notifications.component';
import { NotificationBellComponent } from '../../components/notification-bell/notification-bell.component';
import { User } from '../../types/types';
import { AuthService } from '../../services/auth-service';
import { ConversationService } from '../../services/conversation.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, IonIcon, NotificationsComponent, NotificationBellComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  pageTitle: string = 'PANEL DE CONTROL';
  showScrollTop = false;
  /** Vista de chat a pantalla completa: oculta la bottom-nav en móvil */
  fullBleed = false;
  private pollTimer: any;

  constructor(
    private router: Router,
    private authService: AuthService,
    public convService: ConversationService,
  ) {
    addIcons({ grid, trophy, barChart, person, time, logOut, search, notifications, football, chatbubbles, arrowUp });
  }

  onContentScroll(el: HTMLElement) {
    this.showScrollTop = el.scrollTop > 300;
  }

  scrollToTop(el: HTMLElement) {
    el.scrollTo({ top: 0, behavior: 'smooth' });
  }

  updateTitle(url: string) {
    if (url.includes('/panel')) this.pageTitle = 'PANEL DE CONTROL';
    else if (url.includes('/historial')) this.pageTitle = 'PARTIDOS';
    else if (url.includes('/classification')) this.pageTitle = 'CLASIFICACIÓN';
    else if (url.includes('/ranking')) this.pageTitle = 'RANKING';
    else if (url.includes('/profile')) this.pageTitle = 'PERFIL';
    else if (url.includes('/match')) this.pageTitle = 'DETALLE DEL PARTIDO';
    else if (url.includes('/team')) this.pageTitle = 'DETALLE DEL EQUIPO';
    else if (url.includes('/messages')) this.pageTitle = 'MENSAJES';
    else if (url.includes('/user')) this.pageTitle = 'PERFIL DE JUGADOR';
    else this.pageTitle = 'PANEL DE CONTROL';

    // Vista de conversación individual (/messages/:id): chat a pantalla completa
    this.fullBleed = /\/messages\/\d+/.test(url);
  }

  async ngOnInit() {
    await this.loadUserData();
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.loadUserData();
      this.updateTitle(event.url);
    });
    this.convService.refreshUnread();
    this.pollTimer = setInterval(() => this.convService.refreshUnread(), 30000);
  }

  ngOnDestroy() { clearInterval(this.pollTimer); }

  async loadUserData() {
    this.currentUser = await this.authService.syncUser();
  }

  getUserAvatar(): string {
    return this.currentUser?.avatar || 'https://img.freepik.com/free-vector/football-soccer-tournament-vector-logo-design_47987-24746.jpg?semt=ais_user_personalization&w=740&q=80';
  }

  getUserName(): string {
    return this.currentUser?.username?.toUpperCase() || 'USUARIO';
  }

  get unreadCount(): number {
    return this.convService.unreadCount();
  }

  async logout() {
    this.currentUser = null;
    await this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
