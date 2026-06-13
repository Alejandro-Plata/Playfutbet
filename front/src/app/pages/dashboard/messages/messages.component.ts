import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chatbubbles, pencil } from 'ionicons/icons';
import { ConversationService } from '../../../services/conversation.service';
import { Conversation } from '../../../types/types';

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, IonIcon],
  template: `
    <div class="messages-container">
      <div class="messages-header">
        <div class="header-left">
          <ion-icon name="chatbubbles"></ion-icon>
          <h2>MENSAJES</h2>
        </div>
      </div>

      @if (isLoading && conversations.length === 0) {
        <div class="loading">Cargando conversaciones...</div>
      }

      @if (!isLoading && conversations.length === 0) {
        <div class="empty-state">
          <ion-icon name="chatbubbles"></ion-icon>
          <p>No tienes conversaciones todavía.</p>
          <small>Entra en el perfil de un jugador desde el ranking para enviarle un mensaje.</small>
        </div>
      }

      <div class="conversations-list">
        @for (conv of conversations; track conv.id) {
        <div class="conv-row" (click)="open(conv.id)">
          <div class="conv-avatar-wrap">
            <img [src]="conv.otherUser.avatar || fallback" class="conv-avatar" [alt]="conv.otherUser.username">
            @if (conv.unreadCount > 0) {
              <span class="unread-dot">{{ conv.unreadCount }}</span>
            }
          </div>
          <div class="conv-info">
            <div class="conv-top">
              <span class="conv-name">{{ conv.otherUser.username | uppercase }}</span>
              @if (conv.lastMessage) {
                <span class="conv-time">{{ formatTime(conv.lastMessage.createdAt) }}</span>
              }
            </div>
            @if (conv.lastMessage) {
              <p class="conv-preview" [class.unread]="conv.unreadCount > 0">
                @if (conv.lastMessage.isMe) { <span class="me-label">Tú: </span> }
                {{ conv.lastMessage.text | slice:0:60 }}{{ conv.lastMessage.text.length > 60 ? '…' : '' }}
              </p>
            } @else {
              <p class="conv-preview empty">Sin mensajes aún</p>
            }
          </div>
        </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .messages-container { max-width: 700px; margin: 0 auto; }

    .messages-header {
      display: flex; align-items: center; justify-content: space-between;
      padding-bottom: 1.5rem; margin-bottom: 1.5rem;
      border-bottom: 3px solid #000;
      .header-left { display: flex; align-items: center; gap: 0.75rem;
        ion-icon { font-size: 1.8rem; }
        h2 { margin: 0; font-size: 1.5rem; font-weight: 900; letter-spacing: 1px; }
      }
    }

    .loading, .empty-state { text-align: center; padding: 3rem 1rem; color: #666;
      ion-icon { font-size: 4rem; color: #ddd; display: block; margin-bottom: 1rem; }
      p { font-weight: 600; margin: 0 0 0.5rem; }
      small { font-size: 0.82rem; }
    }

    .conversations-list { display: flex; flex-direction: column; gap: 0.5rem; }

    .conv-row {
      display: flex; align-items: center; gap: 1rem;
      padding: 1rem 1.25rem;
      background: #fafafa; border: 2px solid transparent;
      cursor: pointer; transition: all 0.15s;
      &:hover { background: #fff; border-color: #000; transform: translateX(4px); box-shadow: 4px 4px 0 rgba(0,0,0,.08); }
    }

    .conv-avatar-wrap { position: relative; flex-shrink: 0; }
    .conv-avatar { width: 52px; height: 52px; border-radius: 50%; border: 3px solid #000; object-fit: cover; }
    .unread-dot {
      position: absolute; top: -4px; right: -4px;
      background: #dc2626; color: #fff;
      font-size: 0.65rem; font-weight: 900;
      border-radius: 50%; width: 20px; height: 20px;
      display: flex; align-items: center; justify-content: center;
      border: 2px solid #fff;
    }

    .conv-info { flex: 1; min-width: 0; }
    .conv-top { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 0.25rem; }
    .conv-name { font-weight: 900; font-size: 0.95rem; }
    .conv-time { font-size: 0.72rem; color: #999; flex-shrink: 0; }
    .conv-preview {
      margin: 0; font-size: 0.85rem; color: #666;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      &.unread { color: #000; font-weight: 700; }
      &.empty { color: #aaa; font-style: italic; }
      .me-label { color: #999; }
    }
  `]
})
export class MessagesComponent implements OnInit, OnDestroy {
  conversations: Conversation[] = [];
  isLoading = true;
  readonly fallback = 'https://api.dicebear.com/7.x/notionists/svg?seed=default';
  private pollTimer: any;

  constructor(
    private convService: ConversationService,
    private router: Router,
  ) {
    addIcons({ chatbubbles, pencil });
  }

  async ngOnInit() {
    await this.load();
    this.pollTimer = setInterval(() => this.load(), 10000);
  }

  ngOnDestroy() { clearInterval(this.pollTimer); }

  async load() {
    try {
      this.conversations = await this.convService.getConversations();
    } catch { } finally {
      this.isLoading = false;
    }
  }

  open(id: number) {
    this.router.navigate(['/dashboard/messages', id]);
  }

  formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
  }
}
