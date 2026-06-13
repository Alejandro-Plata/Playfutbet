import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBack, send, chatbubble } from 'ionicons/icons';
import { ConversationService } from '../../../services/conversation.service';
import { PrivateMessage } from '../../../types/types';

@Component({
  selector: 'app-conversation',
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon],
  template: `
    <div class="conv-container">

      <div class="conv-header">
        <button class="back-btn" (click)="goBack()">
          <ion-icon name="arrow-back"></ion-icon>
        </button>
        @if (otherUser) {
          <img [src]="otherUser.avatar || fallback" class="header-avatar">
          <span class="header-name">{{ otherUser.username | uppercase }}</span>
        } @else {
          <span class="header-name">CONVERSACIÓN</span>
        }
      </div>

      <div class="messages-scroll" #scrollArea>
        @if (isLoading) {
          <div class="loading">Cargando mensajes...</div>
        }

        @if (!isLoading && messages.length === 0) {
          <div class="empty-msgs">
            <ion-icon name="chatbubble"></ion-icon>
            <p>Sé el primero en escribir</p>
          </div>
        }

        @for (msg of messages; track msg.id) {
        <div class="msg-wrap" [class.mine]="msg.isMe">
          <div class="bubble" [class.bubble-mine]="msg.isMe">
            {{ msg.text }}
            <span class="msg-time">{{ formatTime(msg.createdAt) }}</span>
          </div>
        </div>
        }
      </div>

      <div class="input-bar">
        <input
          type="text"
          class="msg-input"
          placeholder="Escribe un mensaje..."
          [(ngModel)]="newText"
          (keydown.enter)="send()"
          [disabled]="isSending"
          maxlength="500"
        />
        <button class="send-btn" (click)="send()" [disabled]="!newText.trim() || isSending">
          <ion-icon name="send"></ion-icon>
        </button>
      </div>

    </div>
  `,
  styles: [`
    .conv-container {
      display: flex; flex-direction: column;
      height: calc(100vh - 80px);
      max-width: 700px; margin: 0 auto;
    }

    .conv-header {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 1rem 0; border-bottom: 3px solid #000;
      margin-bottom: 0; flex-shrink: 0;
      .back-btn { background: #000; color: #fff; border: none; padding: 0.5rem; cursor: pointer; display: flex;
        ion-icon { font-size: 1.3rem; }
      }
      .header-avatar { width: 40px; height: 40px; border-radius: 50%; border: 2px solid #000; object-fit: cover; }
      .header-name { font-weight: 900; font-size: 1.1rem; letter-spacing: 0.5px; }
    }

    .messages-scroll {
      flex: 1; overflow-y: auto;
      padding: 1rem 0.5rem;
      display: flex; flex-direction: column; gap: 0.5rem;
    }

    .loading, .empty-msgs { text-align: center; padding: 2rem; color: #aaa;
      ion-icon { font-size: 3rem; display: block; margin-bottom: 0.5rem; }
      p { margin: 0; font-weight: 600; }
    }

    .msg-wrap {
      display: flex;
      &.mine { justify-content: flex-end; }
    }

    .bubble {
      max-width: 70%; padding: 0.65rem 0.9rem;
      background: #f0f0f0; border: 2px solid #ddd;
      font-size: 0.9rem; word-break: break-word;
      position: relative;

      &.bubble-mine {
        background: #000; color: #F7C432;
        border-color: #000;
        .msg-time { color: rgba(247,196,50,.6); }
      }
    }

    .msg-time {
      display: block; font-size: 0.65rem; color: #aaa;
      margin-top: 0.25rem; text-align: right;
    }

    .input-bar {
      display: flex; gap: 0; flex-shrink: 0;
      border-top: 3px solid #000; padding-top: 0;
      .msg-input {
        flex: 1; padding: 0.9rem 1rem;
        border: none; border-right: 3px solid #000;
        font-size: 0.95rem; outline: none;
        background: #fff;
        &:disabled { background: #f9f9f9; }
      }
      .send-btn {
        background: #000; color: #F7C432;
        border: none; padding: 0.9rem 1.1rem;
        cursor: pointer; display: flex; align-items: center;
        ion-icon { font-size: 1.3rem; }
        &:disabled { opacity: 0.4; cursor: not-allowed; }
        &:hover:not(:disabled) { background: #222; }
      }
    }
  `]
})
export class ConversationComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('scrollArea') scrollArea!: ElementRef<HTMLDivElement>;

  messages: PrivateMessage[] = [];
  newText = '';
  isLoading = true;
  isSending = false;
  otherUser: { id: number; username: string; avatar: string } | null = null;
  readonly fallback = 'https://api.dicebear.com/7.x/notionists/svg?seed=default';

  private convId = 0;
  private lastId = 0;
  private pollTimer: any;
  private shouldScroll = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private convService: ConversationService,
  ) {
    addIcons({ arrowBack, send, chatbubble });
  }

  async ngOnInit() {
    this.convId = parseInt(this.route.snapshot.paramMap.get('id') || '0');
    await this.loadConvInfo();
    await this.loadMessages(true);
    this.pollTimer = setInterval(() => this.poll(), 5000);
  }

  ngOnDestroy() { clearInterval(this.pollTimer); }

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  private async loadConvInfo() {
    try {
      const conv = await this.convService.getConversation(this.convId);
      this.otherUser = conv.otherUser;
    } catch { }
  }

  private async loadMessages(initial: boolean) {
    try {
      const msgs = await this.convService.getMessages(this.convId, initial ? 0 : this.lastId);
      if (initial) {
        this.messages = msgs;
      } else {
        this.messages.push(...msgs);
      }
      if (msgs.length > 0) {
        this.lastId = msgs[msgs.length - 1].id;
        this.shouldScroll = true;
      }
    } catch { } finally {
      if (initial) { this.isLoading = false; this.shouldScroll = true; }
    }
  }

  private async poll() {
    await this.loadMessages(false);
    await this.convService.refreshUnread();
  }

  async send() {
    const text = this.newText.trim();
    if (!text || this.isSending) return;
    this.isSending = true;
    try {
      const msg = await this.convService.sendMessage(this.convId, text);
      this.messages.push(msg);
      if (msg.id > this.lastId) this.lastId = msg.id;
      this.newText = '';
      this.shouldScroll = true;
    } catch { } finally {
      this.isSending = false;
    }
  }

  goBack() {
    this.router.navigate(['/dashboard/messages']);
  }

  private scrollToBottom() {
    try {
      const el = this.scrollArea?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch { }
  }

  formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
