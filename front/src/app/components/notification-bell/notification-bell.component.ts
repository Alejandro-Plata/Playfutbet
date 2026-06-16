import { Component, OnInit, OnDestroy, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { notifications, notificationsOutline, trashOutline, checkmarkDone, closeOutline } from 'ionicons/icons';
import { NotificationService } from '../../services/notification.service';
import { AuthService } from '../../services/auth-service';
import { Notification } from '../../types/types';

/**
 * Campana de notificaciones: badge de no leídas + panel desplegable.
 * Consume los endpoints /api/notifications/* (antes sin UI conectada).
 */
@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule, IonIcon],
  templateUrl: './notification-bell.component.html',
  styleUrls: ['./notification-bell.component.scss'],
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  open = false;
  loading = false;
  items: Notification[] = [];
  unread = 0;
  private userId: number | null = null;
  private pollTimer: any;

  constructor(
    private notifService: NotificationService,
    private authService: AuthService,
    private elRef: ElementRef,
  ) {
    addIcons({ notifications, notificationsOutline, trashOutline, checkmarkDone, closeOutline });
  }

  async ngOnInit() {
    const user = await this.authService.getCurrentUser();
    this.userId = user?.id ?? null;
    if (this.userId) {
      await this.refreshCount();
      this.pollTimer = setInterval(() => this.refreshCount(), 30000);
    }
  }

  ngOnDestroy() {
    clearInterval(this.pollTimer);
  }

  @HostListener('document:click', ['$event'])
  onDocClick(event: MouseEvent) {
    if (this.open && !this.elRef.nativeElement.contains(event.target)) {
      this.open = false;
    }
  }

  async refreshCount() {
    if (!this.userId) return;
    try {
      this.unread = await this.notifService.getUnreadCount(this.userId);
    } catch { /* silencioso: badge no crítico */ }
  }

  async toggle() {
    this.open = !this.open;
    if (this.open) await this.loadList();
  }

  async loadList() {
    if (!this.userId) return;
    this.loading = true;
    try {
      this.items = await this.notifService.getUserNotifications(this.userId);
    } catch { /* el estado vacío cubre el error */ } finally {
      this.loading = false;
    }
  }

  async onItemClick(item: Notification) {
    if (item.read) return;
    item.read = true;
    this.unread = Math.max(0, this.unread - 1);
    try {
      await this.notifService.markAsRead(item.id);
    } catch {
      item.read = false;
      this.refreshCount();
    }
  }

  async markAllRead() {
    const pending = this.items.filter(n => !n.read);
    if (pending.length === 0) return;
    pending.forEach(n => n.read = true);
    this.unread = 0;
    await Promise.all(pending.map(n => this.notifService.markAsRead(n.id).catch(() => null)));
    this.refreshCount();
  }

  async remove(item: Notification, event: Event) {
    event.stopPropagation();
    const wasUnread = !item.read;
    this.items = this.items.filter(n => n.id !== item.id);
    if (wasUnread) this.unread = Math.max(0, this.unread - 1);
    try {
      await this.notifService.deleteNotification(item.id);
    } catch {
      this.loadList();
      this.refreshCount();
    }
  }

  timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'Ahora';
    if (min < 60) return `Hace ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `Hace ${h} h`;
    const d = Math.floor(h / 24);
    return `Hace ${d} d`;
  }
}
