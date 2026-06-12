import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { trophy, trendingUp, football, checkmarkCircle, closeCircle, timeOutline } from 'ionicons/icons';
import { ChartConfiguration } from 'chart.js';
import { BetService } from '../../../services/bet.service';
import { AuthService } from '../../../services/auth-service';
import { UserService } from '../../../services/user.service';
import { LeagueService } from '../../../services/league.service';
import { EnrichedBet, UserStats, Prediction, SimulationState } from '../../../types/types';
import { getTeamLogo } from '../../../utils/team-logos';
import { StatChartComponent } from '../../../components/stat-chart/stat-chart.component';

@Component({
  selector: 'app-panel',
  standalone: true,
  imports: [CommonModule, IonIcon, StatChartComponent],
  templateUrl: './panel.component.html',
  styleUrls: ['./panel.component.scss']
})
export class PanelComponent implements OnInit, OnDestroy {

  userStats: { totalPoints: number; winRate: number; totalBets: number } = {
    totalPoints: 0, winRate: 0, totalBets: 0
  };

  getTeamLogo = getTeamLogo;
  predictions: Prediction[] = [];
  isLoading = true;

  // Chart.js
  pointsChartConfig: ChartConfiguration | null = null;
  donutChartConfig: ChartConfiguration | null = null;
  stats: UserStats | null = null;

  // Temporada
  simState: SimulationState | null = null;
  countdown = '';
  offSeasonBanner = false;

  private updateInterval: any;
  private countdownInterval: any;

  constructor(
    private router: Router,
    private betService: BetService,
    private authService: AuthService,
    private userService: UserService,
    private leagueService: LeagueService,
  ) {
    addIcons({ trophy, trendingUp, football, checkmarkCircle, closeCircle, timeOutline });
  }

  async ngOnInit() {
    await this.loadAll();
    this.updateInterval = setInterval(() => this.loadAll(), 10000);
  }

  ngOnDestroy() {
    clearInterval(this.updateInterval);
    clearInterval(this.countdownInterval);
  }

  async loadAll() {
    await Promise.all([this.loadUserData(), this.loadSimState()]);
  }

  async loadUserData() {
    try {
      this.isLoading = true;
      const user = await this.authService.syncUser();
      if (!user) return;

      const [enrichedBets, stats] = await Promise.all([
        this.betService.getUserBets(user.id),
        this.userService.getUserStats(user.id).catch(() => null),
      ]);

      this.calculateStats(enrichedBets, user.points);
      this.mapPredictions(enrichedBets);

      if (stats) {
        this.stats = stats;
        this.buildCharts(stats);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async loadSimState() {
    try {
      const state: SimulationState = await this.leagueService.getSimulationState();
      this.simState = state;
      this.offSeasonBanner = !!state.offSeason;
      if (state.offSeason && state.nextSeasonStart) {
        this.startCountdown(state.nextSeasonStart);
      }
    } catch {}
  }

  private startCountdown(target: number) {
    clearInterval(this.countdownInterval);
    const update = () => {
      const diff = target - Date.now();
      if (diff <= 0) { this.countdown = '¡Comenzando ahora!'; clearInterval(this.countdownInterval); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      this.countdown = `${h}h ${m}m ${s}s`;
    };
    update();
    this.countdownInterval = setInterval(update, 1000);
  }

  private buildCharts(stats: UserStats) {
    // Línea de puntos acumulados
    if (stats.pointsByJornada.length > 0) {
      this.pointsChartConfig = {
        type: 'line',
        data: {
          labels: stats.pointsByJornada.map(p => `J${p.jornada}`),
          datasets: [{
            label: 'Puntos acumulados',
            data: stats.pointsByJornada.map(p => p.cumulative),
            borderColor: '#F7C432',
            backgroundColor: 'rgba(247,196,50,0.15)',
            fill: true,
            tension: 0.4,
            pointRadius: 3,
          }]
        },
        options: {
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, ticks: { stepSize: 5 } } }
        }
      };
    }

    // Doughnut de distribución
    const { exact, winner, miss } = stats.resultDistribution;
    if (exact + winner + miss > 0) {
      this.donutChartConfig = {
        type: 'doughnut',
        data: {
          labels: ['Exacto (+10pts)', 'Ganador (+5pts)', 'Fallado (0pts)'],
          datasets: [{
            data: [exact, winner, miss],
            backgroundColor: ['#F7C432', '#4CAF50', '#e0e0e0'],
            borderWidth: 2,
          }]
        },
        options: {
          plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } },
          cutout: '65%'
        } as any
      };
    }
  }

  private calculateStats(bets: EnrichedBet[], userPoints: number) {
    const totalBets = bets.length;
    const finishedBets = bets.filter(b => b.status === 'win' || b.status === 'loss');
    const wonBets = bets.filter(b => b.status === 'win').length;
    const winRate = finishedBets.length > 0 ? Math.round((wonBets / finishedBets.length) * 1000) / 10 : 0;
    this.userStats = { totalPoints: userPoints, winRate, totalBets };
  }

  private mapPredictions(bets: EnrichedBet[]) {
    this.predictions = bets.map(bet => ({
      id: bet.id.toString(),
      matchId: bet.matchId.toString(),
      homeTeam: bet.match?.home || 'TBD',
      awayTeam: bet.match?.away || 'TBD',
      homeTeamLogo: getTeamLogo(bet.match?.home || ''),
      awayTeamLogo: getTeamLogo(bet.match?.away || ''),
      predictedScore: { home: bet.homeScore, away: bet.awayScore },
      actualScore: bet.match?.status === 'finished' ? { home: bet.match.homeScore, away: bet.match.awayScore } : null,
      status: this.mapBetStatus(bet.status),
      pointsEarned: bet.pointsEarned,
      date: bet.match ? new Date(bet.match.time).toLocaleDateString('es-ES') : 'TBD',
      league: bet.match?.league || 'Liga'
    })).sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return 0;
    });
  }

  private mapBetStatus(status: string): 'pending' | 'correct' | 'incorrect' {
    if (status === 'win') return 'correct';
    if (status === 'loss') return 'incorrect';
    return 'pending';
  }

  navigateToTeam(teamName: string) {
    this.router.navigate(['/dashboard/team', teamName]);
  }
}
