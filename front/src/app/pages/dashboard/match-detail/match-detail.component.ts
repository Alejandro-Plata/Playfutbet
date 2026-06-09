import { Component, ElementRef, ViewChild, AfterViewInit, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { send, happyOutline, arrowBack, football, chatbubbles, statsChart, arrowDown, people, close, alertCircle } from 'ionicons/icons';
import { ChatMessage, Match, Standing } from '../../../types/types';
import { BetMatchComponent } from './bet-match/bet-match.component';
import { MatchService } from '../../../services/match.service';
import { getUser } from '../../../utils/getPreferences';
import { getTeamLogo } from '../../../utils/team-logos';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-match-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon, BetMatchComponent],
  templateUrl: './match-detail.component.html',
  styleUrls: ['./match-detail.component.scss'],
})

export class MatchDetailComponent implements OnInit, AfterViewInit {
  @ViewChild('chatStream') chatStreamRef!: ElementRef<HTMLDivElement>;

  matchId: number = 0;
  match: Match | null = null;
  isLoading: boolean = true;

  standings: Standing[] = [];
  chatMessages: ChatMessage[] = [];

  newMessage: string = '';
  showScrollButton: boolean = false;
  currentUser: any = null;
  isChatOpen: boolean = false;

  getTeamLogo = getTeamLogo;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private matchService: MatchService
  ) {
    addIcons({ send, happyOutline, arrowBack, football, chatbubbles, statsChart, arrowDown, people, close, alertCircle });
  }

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.matchId = parseInt(id, 10);
      this.currentUser = await getUser();
      await this.loadAllData();
    }
  }

  async loadAllData() {
    this.isLoading = true;
    try {
      await Promise.all([
        this.loadMatch(),
        this.loadStandings(),
        this.loadChat()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      this.isLoading = false;
      this.isLoading = false;
      setTimeout(() => {
        this.scrollToBottom();
        this.checkScrollForBetting();
      }, 100);
    }
  }

  checkScrollForBetting() {
    const action = this.route.snapshot.queryParamMap.get('action');
    if (action === 'bet') {
      const element = document.getElementById('betting-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }

  async loadMatch() {
    try {
      this.match = await this.matchService.getMatchById(this.matchId);
    } catch (error) {
      console.error('Error loading match:', error);
    }
  }

  async loadStandings() {
    try {
      const data = await this.matchService.getStandings();
      this.standings = data.map((team: any, index: number) => ({
        pos: index + 1,
        team: team.name,
        played: team.pj,
        won: team.pg,
        drawn: team.pe,
        lost: team.pp,
        gf: team.gf,
        gc: team.gc,
        pts: team.pts
      }));
    } catch (error) {
      console.error('Error loading standings', error);
    }
  }

  async loadChat() {
    try {
      const msgs = await this.matchService.getChatMessages(this.matchId);
      this.chatMessages = msgs.map((m: any) => ({
        id: m.id,
        matchId: m.matchId,
        username: m.username,
        user: m.username, // mapeo
        avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${m.username}`, // generar avatar si falta
        text: m.text,
        time: m.time, // formateado o cadena
        isMe: this.currentUser && m.username === this.currentUser.username
      }));
    } catch (error) {
      console.error('Error loading chat', error);
    }
  }

  async sendMessage() {
    if (!this.newMessage.trim() || !this.currentUser) return;

    try {
      const text = this.newMessage;
      this.newMessage = ''; // limpieza optimista

      const res = await this.matchService.sendMessage(this.matchId, text, this.currentUser.username);

      // ¿Añadir localmente o recargar? Añadir localmente por velocidad
      const newMsg: ChatMessage = {
        id: res.id,
        matchId: this.matchId,
        username: res.username,
        user: res.username,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${res.username}`,
        text: res.text,
        time: res.time,
        isMe: true
      };
      this.chatMessages.push(newMsg);

      setTimeout(() => {
        this.scrollToBottom();
        this.checkScrollPosition();
      }, 50);

    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error al enviar mensaje');
    }
  }

  goBack() {
    this.router.navigate(['/dashboard/historial']);
  }

  getMatchStatus(): string {
    if (!this.match) return '';

    switch (this.match.status) {
      case 'pending': return 'Próximo';
      case 'live': return 'En vivo';
      case 'finished': return 'Finalizado';
      default: return '';
    }
  }

  get matchTime(): string {
    if (!this.match || this.match.status !== 'live') return '';
    return this.calculateMatchTime(this.match.time);
  }

  private calculateMatchTime(timeString: string): string {
    const matchDate = new Date(timeString);
    const now = new Date();
    const diffMs = now.getTime() - matchDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 0) return "0'";
    if (diffMins > 90) return "90+'";
    return `${diffMins}'`;
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.scrollToBottom();
      this.checkScrollPosition();
    }, 100);

    if (this.chatStreamRef) {
      const element = this.chatStreamRef.nativeElement;
      element.addEventListener('scroll', () => {
        this.checkScrollPosition();
      });
    }
  }

  // Lógica del scroll del chat
  @HostListener('window:resize')
  onResize() {
    this.checkScrollPosition();
  }

  checkScrollPosition() {
    if (!this.chatStreamRef) return;

    const element = this.chatStreamRef.nativeElement;
    const hasScroll = element.scrollHeight > element.clientHeight;
    const isAtBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 50;

    this.showScrollButton = hasScroll && !isAtBottom;
  }

  scrollToBottom() {
    if (!this.chatStreamRef) return;

    const chatStream = this.chatStreamRef.nativeElement;
    chatStream.scrollTo({
      top: chatStream.scrollHeight,
      behavior: 'smooth'
    });
  }

  toggleChat() {
    this.isChatOpen = !this.isChatOpen;
    if (this.isChatOpen) {
      setTimeout(() => this.scrollToBottom(), 100);
    }
  }

  navigateToTeam(teamName: string) {
    this.router.navigate(['/dashboard/team', teamName]);
  }
}