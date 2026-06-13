import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  trophy, medal, star, search, close, chatbubble,
  trendingUp, trendingDown, remove, flash, statsChart, arrowUp
} from 'ionicons/icons';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../services/auth-service';
import { ConversationService } from '../../../services/conversation.service';
import { UserRanking, UserStats, User } from '../../../types/types';

type RankingTab = 'total' | 'season';

export interface RankingPlayer extends UserRanking {
  position: number;
}

@Component({
  selector: 'app-ranking',
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon],
  templateUrl: './ranking.component.html',
  styleUrls: ['./ranking.component.scss']
})
export class RankingComponent implements OnInit, OnDestroy {
  players: RankingPlayer[] = [];
  isLoading = true;
  activeTab: RankingTab = 'total';

  // F1 – Tu posición
  currentUser: User | null = null;
  myPlayer: RankingPlayer | null = null;
  highlightedId: number | null = null;
  private highlightTimer: any;

  // F2 – Buscador
  searchQuery = '';
  filterMyTeam = false;
  private debounceTimer: any;

  // F4 – Bottom sheet
  selectedPlayer: RankingPlayer | null = null;
  showSheet = false;
  sheetStats: UserStats | null = null;
  loadingStats = false;

  // F5 – Head-to-head
  showVs = false;
  myStats: UserStats | null = null;
  loadingVs = false;

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private convService: ConversationService,
    private router: Router,
  ) {
    addIcons({ trophy, medal, star, search, close, chatbubble, trendingUp, trendingDown, remove, flash, statsChart, arrowUp });
  }

  async ngOnInit() {
    this.currentUser = await this.authService.getCurrentUser();
    await this.loadRanking('total');
  }

  ngOnDestroy() {
    clearTimeout(this.debounceTimer);
    clearTimeout(this.highlightTimer);
  }

  async loadRanking(tab: RankingTab) {
    this.activeTab = tab;
    this.isLoading = true;
    this.searchQuery = '';
    this.filterMyTeam = false;
    try {
      const ranking = tab === 'season'
        ? await this.userService.getSeasonLeaderboard()
        : await this.userService.getLeaderboard();

      this.players = ranking.map((user, index) => ({
        ...user,
        avatar: user.avatar || 'https://api.dicebear.com/7.x/notionists/svg?seed=default',
        position: index + 1
      }));
      this.myPlayer = this.players.find(p => p.id === this.currentUser?.id) ?? null;
    } catch (error) {
      console.error('Error loading ranking:', error);
    } finally {
      this.isLoading = false;
    }
  }

  // F2 – filtrado
  get filteredPlayers(): RankingPlayer[] {
    let result = this.players;
    if (this.filterMyTeam && this.currentUser?.favoriteTeam) {
      result = result.filter(p => p.favoriteTeam === this.currentUser!.favoriteTeam);
    }
    if (this.searchQuery.trim()) {
      const q = this.normalize(this.searchQuery);
      result = result.filter(p => this.normalize(p.username).includes(q));
    }
    return result;
  }

  get showPodium(): boolean {
    return !this.searchQuery.trim() && !this.filterMyTeam;
  }

  private normalize(s: string): string {
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  onSearch() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => { /* reactivo via getter */ }, 200);
  }

  toggleMyTeam() {
    this.filterMyTeam = !this.filterMyTeam;
  }

  clearSearch() {
    this.searchQuery = '';
    this.filterMyTeam = false;
  }

  // F1 – milestone
  get myMilestone(): string | null {
    if (!this.myPlayer) return null;
    const pos = this.myPlayer.position;
    const pts = this.myPlayer.points;
    if (pos === 1) return '¡Líder del ranking!';
    const above = this.players[pos - 2];
    if (!above) return null;
    const diff = above.points - pts;
    if (pos <= 3) return `${diff} pts para el #${pos - 1}`;
    if (pos <= 10) return `${diff} pts para el TOP 10`;
    return `${diff} pts para superar a ${above.username}`;
  }

  // F1 – scroll
  scrollToMyRow() {
    if (!this.myPlayer) return;
    const el = document.getElementById(`player-row-${this.myPlayer.id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      this.highlightedId = this.myPlayer.id;
      clearTimeout(this.highlightTimer);
      this.highlightTimer = setTimeout(() => this.highlightedId = null, 2500);
    }
  }

  // F3 – trend
  trendLabel(trend: number | null | undefined): string {
    if (trend == null) return '=';
    if (trend > 0) return `▲${trend}`;
    if (trend < 0) return `▼${Math.abs(trend)}`;
    return '=';
  }

  trendClass(trend: number | null | undefined): string {
    if (trend == null || trend === 0) return 'trend-neutral';
    return trend > 0 ? 'trend-up' : 'trend-down';
  }

  // F4 – bottom sheet
  async openSheet(player: RankingPlayer) {
    if (this.showVs) return;
    this.selectedPlayer = player;
    this.showSheet = true;
    this.sheetStats = null;
    this.loadingStats = true;
    try {
      this.sheetStats = await this.userService.getUserStats(player.id);
    } catch { /* perfil sin stats */ } finally {
      this.loadingStats = false;
    }
  }

  closeSheet() {
    this.showSheet = false;
    this.selectedPlayer = null;
    this.sheetStats = null;
  }

  openProfile() {
    if (!this.selectedPlayer) return;
    const id = this.selectedPlayer.id;
    this.closeSheet();
    this.router.navigate(['/dashboard/user', id]);
  }

  async startMessage() {
    if (!this.selectedPlayer) return;
    const otherId = this.selectedPlayer.id;
    this.closeSheet();
    try {
      const conv = await this.convService.getOrCreate(otherId);
      this.router.navigate(['/dashboard/messages', conv.id]);
    } catch (e) {
      console.error(e);
    }
  }

  // F5 – VS
  async openVs() {
    if (!this.selectedPlayer || !this.currentUser) return;
    this.showVs = true;
    this.loadingVs = true;
    this.myStats = null;
    try {
      this.myStats = await this.userService.getUserStats(this.currentUser.id);
    } catch { } finally {
      this.loadingVs = false;
    }
  }

  closeVs() {
    this.showVs = false;
  }

  vsBarWidth(mine: number, theirs: number): { my: number; their: number } {
    const total = mine + theirs;
    if (total === 0) return { my: 50, their: 50 };
    return { my: Math.round((mine / total) * 100), their: 100 - Math.round((mine / total) * 100) };
  }

  vsMetrics(): { label: string; mine: number; theirs: number; unit: string }[] {
    if (!this.myStats || !this.sheetStats) return [];
    return [
      { label: 'Puntos', mine: this.currentUser?.points ?? 0, theirs: this.selectedPlayer?.points ?? 0, unit: '' },
      { label: '% Acierto', mine: Math.round((this.myStats.winRate ?? 0) * 100), theirs: Math.round((this.sheetStats.winRate ?? 0) * 100), unit: '%' },
      { label: 'Exactos', mine: this.myStats.exactHits ?? 0, theirs: this.sheetStats.exactHits ?? 0, unit: '' },
      { label: 'Mejor racha', mine: this.myStats.bestStreak ?? 0, theirs: this.sheetStats.bestStreak ?? 0, unit: '' },
    ];
  }

  getTopThree() { return this.players.slice(0, 3); }

  getPodiumOrder() {
    const top = this.getTopThree();
    if (top.length < 3) return top;
    return [top[1], top[0], top[2]];
  }
}
