import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { trophy, star, lockClosed, arrowBack, chatbubble, statsChart, time } from 'ionicons/icons';
import { ChartConfiguration } from 'chart.js';
import { UserService } from '../../../services/user.service';
import { ConversationService } from '../../../services/conversation.service';
import { User, UserStats } from '../../../types/types';
import { TEAM_LOGOS } from '../../../utils/team-logos';
import { StatChartComponent } from '../../../components/stat-chart/stat-chart.component';

@Component({
  selector: 'app-public-profile',
  standalone: true,
  imports: [CommonModule, IonIcon, StatChartComponent],
  template: `
    <div class="public-profile-container">
      <div class="page-header">
        <button class="back-btn" (click)="goBack()">
          <ion-icon name="arrow-back"></ion-icon> VOLVER
        </button>
        <div class="header-title">
          <h1>PERFIL DE JUGADOR</h1>
        </div>
      </div>

      @if (isLoading) {
        <div class="loading-state"><p>Cargando...</p></div>
      }

      @if (!isLoading && isPrivate) {
        <div class="private-card">
          <ion-icon name="lock-closed" class="lock-icon"></ion-icon>
          <h2>PERFIL PRIVADO</h2>
          <p>Este usuario ha configurado su perfil como privado.</p>
          @if (privateUser) {
            <button class="msg-btn" (click)="sendMessage()">
              <ion-icon name="chatbubble"></ion-icon> ENVIAR MENSAJE
            </button>
          }
        </div>
      }

      @if (!isLoading && !isPrivate && user) {
        <div class="profile-card">
          <div class="avatar-section">
            <img [src]="user.avatar" [alt]="user.username" class="user-avatar">
            @if (user.rank) {
              <div class="rank-badge">
                <ion-icon name="trophy"></ion-icon>#{{ user.rank }}
              </div>
            }
            <h2>{{ user.username }}</h2>
            @if (user.bio) { <p class="bio">{{ user.bio }}</p> }
            @if (user.favoriteTeam) {
              <div class="fav-team">
                <img [src]="getTeamLogo(user.favoriteTeam)" [alt]="user.favoriteTeam">
                <span>{{ user.favoriteTeam }}</span>
              </div>
            }
          </div>

          <div class="points-card">
            <ion-icon name="star"></ion-icon>
            <div>
              <span class="label">PUNTOS TOTALES</span>
              <span class="value">{{ user.points }}</span>
            </div>
          </div>

          <button class="msg-btn" (click)="sendMessage()">
            <ion-icon name="chatbubble"></ion-icon> ENVIAR MENSAJE
          </button>
        </div>

        <!-- Stats públicas -->
        @if (user.showStats && stats) {
        <div class="stats-section">
          <div class="section-title">
            <ion-icon name="stats-chart"></ion-icon>
            ESTADÍSTICAS
          </div>
          <div class="stats-grid">
            <div class="stat-card">
              <span class="stat-val">{{ stats.totalBets }}</span>
              <span class="stat-lbl">APUESTAS</span>
            </div>
            <div class="stat-card">
              <span class="stat-val">{{ (stats.winRate * 100).toFixed(0) }}%</span>
              <span class="stat-lbl">ACIERTO</span>
            </div>
            <div class="stat-card">
              <span class="stat-val">{{ stats.exactHits }}</span>
              <span class="stat-lbl">EXACTOS</span>
            </div>
            <div class="stat-card">
              <span class="stat-val">{{ stats.bestStreak }}</span>
              <span class="stat-lbl">MEJOR RACHA</span>
            </div>
          </div>
          @if (pointsChartConfig) {
            <div class="chart-container">
              <p class="chart-title">EVOLUCIÓN DE PUNTOS</p>
              <app-stat-chart [config]="pointsChartConfig" height="180px"></app-stat-chart>
            </div>
          }
        </div>
        }

        <!-- Apuestas públicas -->
        @if (user.showBets && publicBets.length > 0) {
        <div class="bets-section">
          <div class="section-title">
            <ion-icon name="time"></ion-icon>
            ÚLTIMAS APUESTAS
          </div>
          <div class="bets-table">
            @for (bet of publicBets; track bet.id) {
            <div class="bet-row">
              <div class="bet-match">
                <span class="jornada">J{{ bet.jornada }}</span>
                <span class="teams">{{ bet.home_team }} vs {{ bet.away_team }}</span>
              </div>
              <div class="bet-scores">
                <span class="bet-pred">{{ bet.home_score }}-{{ bet.away_score }}</span>
                <span class="bet-real">{{ bet.real_home }}-{{ bet.real_away }}</span>
              </div>
              <div class="bet-pts" [class.pts-pos]="bet.points_earned > 0">
                +{{ bet.points_earned }}
              </div>
            </div>
            }
          </div>
        </div>
        }

      }
    </div>
  `,
  styles: [`
    .public-profile-container { max-width: 700px; margin: 0 auto; padding: 0 1.5rem 3rem; }

    .page-header { display: flex; align-items: center; gap: 1.5rem; padding: 1.5rem 0; border-bottom: 3px solid #000; margin-bottom: 2rem; }
    .back-btn { background: #000; color: #fff; border: none; padding: 0.6rem 1rem; font-weight: 900; font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; gap: 0.4rem; }
    h1 { font-size: 1.4rem; font-weight: 900; margin: 0; }

    .profile-card { background: #fff; border: 3px solid #000; box-shadow: 6px 6px 0 #000; padding: 3rem 2rem; text-align: center; margin-bottom: 2rem; }
    .avatar-section { margin-bottom: 2rem; }
    .user-avatar { width: 140px; height: 140px; border-radius: 50%; border: 4px solid #000; object-fit: cover; }
    .rank-badge { display: inline-flex; align-items: center; gap: 0.4rem; background: #F7C432; border: 2px solid #000; padding: 0.3rem 0.8rem; border-radius: 50px; font-weight: 900; margin-top: 0.5rem; }
    h2 { font-size: 2rem; font-weight: 900; margin: 0.75rem 0 0.25rem; }
    .bio { color: #555; font-size: 0.9rem; max-width: 380px; margin: 0 auto 0.5rem; }
    .fav-team { display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-top: 0.5rem;
      img { width: 26px; height: 26px; object-fit: contain; }
      span { font-weight: 700; font-size: 0.9rem; }
    }

    .points-card { display: inline-flex; align-items: center; gap: 1.5rem; background: #F7C432; border: 3px solid #000; box-shadow: 5px 5px 0 #000; padding: 1.5rem 2rem; margin-bottom: 1.5rem;
      ion-icon { font-size: 3rem; color: #000; }
      .label { display: block; font-size: 0.7rem; font-weight: 700; letter-spacing: 2px; color: #555; }
      .value { display: block; font-size: 3rem; font-weight: 900; line-height: 1; color: #000; }
    }

    .msg-btn { display: inline-flex; align-items: center; gap: 0.5rem; background: #000; color: #F7C432; border: 3px solid #000; padding: 0.75rem 1.5rem; font-weight: 900; font-size: 0.9rem; cursor: pointer; box-shadow: 4px 4px 0 #F7C432; letter-spacing: 1px; margin-top: 0.5rem;
      &:active { transform: translate(2px,2px); box-shadow: 2px 2px 0 #F7C432; }
    }

    .private-card { text-align: center; background: #fff; border: 3px solid #000; box-shadow: 6px 6px 0 #000; padding: 4rem 2rem;
      .lock-icon { font-size: 4rem; color: #ccc; }
      h2 { font-weight: 900; }
      p { color: #666; }
    }

    .loading-state { padding: 3rem; text-align: center; }

    .section-title { display: flex; align-items: center; gap: 0.6rem; font-weight: 900; font-size: 1rem; letter-spacing: 1.5px; padding: 1rem 0 0.75rem; border-bottom: 3px solid #000; margin-bottom: 1.25rem;
      ion-icon { font-size: 1.3rem; }
    }

    /* Stats */
    .stats-section { background: #fff; border: 3px solid #000; box-shadow: 6px 6px 0 #000; padding: 1.5rem; margin-bottom: 2rem; }
    .stats-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 0.75rem; margin-bottom: 1.5rem; }
    .stat-card { background: #fafafa; border: 2px solid #000; box-shadow: 3px 3px 0 #000; padding: 1rem 0.5rem; text-align: center;
      .stat-val { display: block; font-size: 1.6rem; font-weight: 900; }
      .stat-lbl { display: block; font-size: 0.6rem; font-weight: 700; letter-spacing: 1px; color: #666; margin-top: 0.2rem; }
    }
    .chart-container { border: 2px solid #eee; padding: 0.75rem; }
    .chart-title { font-size: 0.7rem; font-weight: 700; letter-spacing: 1.5px; color: #666; margin: 0 0 0.5rem; }

    /* Bets */
    .bets-section { background: #fff; border: 3px solid #000; box-shadow: 6px 6px 0 #000; padding: 1.5rem; }
    .bet-row { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; padding: 0.75rem; background: #fafafa; border: 2px solid transparent; margin-bottom: 0.5rem; flex-wrap: wrap;
      &:hover { border-color: #000; }
    }
    .bet-match { flex: 1; .jornada { font-weight: 900; font-size: 0.75rem; color: #666; margin-right: 0.5rem; } .teams { font-weight: 700; font-size: 0.85rem; } }
    .bet-scores { display: flex; gap: 0.75rem; align-items: center;
      .bet-pred { font-weight: 900; background: #000; color: #F7C432; padding: 0.2rem 0.5rem; font-size: 0.85rem; }
      .bet-real  { font-weight: 700; color: #555; font-size: 0.85rem; }
    }
    .bet-pts { font-weight: 900; font-size: 0.9rem; color: #aaa; min-width: 40px; text-align: right;
      &.pts-pos { color: #16a34a; }
    }

    @media (max-width: 480px) {
      .stats-grid { grid-template-columns: repeat(2,1fr); }
    }
  `]
})
export class PublicProfileComponent implements OnInit {
  user: User | null = null;
  stats: UserStats | null = null;
  publicBets: any[] = [];
  isLoading = true;
  isPrivate = false;
  privateUser: { id: number; username: string; avatar: string } | null = null;
  pointsChartConfig: ChartConfiguration | null = null;

  private userId = 0;

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private userService: UserService,
    private convService: ConversationService,
  ) {
    addIcons({ trophy, star, lockClosed, arrowBack, chatbubble, statsChart, time });
  }

  async ngOnInit() {
    this.userId = parseInt(this.route.snapshot.paramMap.get('id') || '0');
    try {
      this.user = await this.userService.getUser(this.userId);
      this.isPrivate = !!(this.user as any).isPrivate && Object.keys(this.user).length <= 4;

      if (!this.isPrivate && this.user) {
        await Promise.all([
          this.loadStats(),
          this.loadBets(),
        ]);
      } else if (this.isPrivate) {
        this.privateUser = { id: (this.user as any).id, username: (this.user as any).username, avatar: (this.user as any).avatar };
        this.user = null;
      }
    } catch {
      this.isPrivate = true;
    } finally {
      this.isLoading = false;
    }
  }

  private async loadStats() {
    if (!this.user?.showStats) return;
    try {
      this.stats = await this.userService.getUserStats(this.userId);
      if (this.stats?.pointsByJornada?.length > 1) {
        this.pointsChartConfig = {
          type: 'line',
          data: {
            labels: this.stats.pointsByJornada.map(p => `J${p.jornada}`),
            datasets: [{
              data: this.stats.pointsByJornada.map(p => p.cumulative),
              borderColor: '#000',
              backgroundColor: 'rgba(247,196,50,0.25)',
              borderWidth: 2,
              tension: 0.3,
              fill: true,
              pointBackgroundColor: '#000',
              pointRadius: 3,
            }]
          },
          options: {
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { font: { weight: 700 } } } }
          }
        };
      }
    } catch { /* stats privadas */ }
  }

  private async loadBets() {
    if (!this.user?.showBets) return;
    try {
      this.publicBets = await this.userService.getPublicBets(this.userId);
    } catch { /* apuestas privadas */ }
  }

  async sendMessage() {
    const otherId = this.user?.id ?? this.privateUser?.id;
    if (!otherId) return;
    try {
      const conv = await this.convService.getOrCreate(otherId);
      this.router.navigate(['/dashboard/messages', conv.id]);
    } catch (e) {
      console.error(e);
    }
  }

  goBack() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.router.navigate(['/dashboard/ranking']);
    }
  }

  getTeamLogo(name: string): string {
    return TEAM_LOGOS[name] || '';
  }
}
