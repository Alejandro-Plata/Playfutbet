import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { trophy, trendingUp, football, checkmarkCircle, closeCircle, timeOutline } from 'ionicons/icons';
import { BetService } from '../../../services/bet.service';
import { AuthService } from '../../../services/auth-service';
import { EnrichedBet, UserStats, Prediction } from '../../../types/types';
import { getTeamLogo } from '../../../utils/team-logos';


@Component({
  selector: 'app-panel',
  standalone: true,
  imports: [CommonModule, IonIcon],
  templateUrl: './panel.component.html',
  styleUrls: ['./panel.component.scss']
})
export class PanelComponent implements OnInit, OnDestroy {

  userStats: UserStats = {
    totalPoints: 0,
    winRate: 0,
    totalBets: 0
  };

  getTeamLogo = getTeamLogo;

  predictions: Prediction[] = [];
  isLoading: boolean = true;
  private updateInterval: any;

  constructor(
    private router: Router,
    private betService: BetService,
    private authService: AuthService
  ) {
    addIcons({ trophy, trendingUp, football, checkmarkCircle, closeCircle, timeOutline });
  }

  async ngOnInit() {
    await this.loadUserData();

    // Poling para que cada 10 segundos se actualice el marcador
    this.updateInterval = setInterval(async () => {
      await this.loadUserData();
    }, 10000);
  }

  ngOnDestroy() {
    // Limpiamos el intervalo al destruir el componente
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }

  async loadUserData() {
    try {
      this.isLoading = true;
      const user = await this.authService.syncUser();

      if (!user) {
        console.error('No se encontró usuario');
        return;
      }

      const enrichedBets = await this.betService.getUserBets(user.id);

      this.calculateStats(enrichedBets, user.points);
      this.mapPredictions(enrichedBets);

    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private calculateStats(bets: EnrichedBet[], userPoints: number) {
    const totalBets = bets.length;
    const finishedBets = bets.filter(b => b.status === 'win' || b.status === 'loss');
    const wonBets = bets.filter(b => b.status === 'win').length;
    const winRate = finishedBets.length > 0 ? (wonBets / finishedBets.length) * 100 : 0;

    this.userStats = {
      totalPoints: userPoints,
      winRate: Math.round(winRate * 10) / 10,
      totalBets
    };
  }

  private mapPredictions(bets: EnrichedBet[]) {
    const predictions: Prediction[] = bets.map(bet => ({
      id: bet.id.toString(),
      matchId: bet.matchId.toString(),
      homeTeam: bet.match?.home || 'TBD',
      awayTeam: bet.match?.away || 'TBD',
      homeTeamLogo: getTeamLogo(bet.match?.home || ''),
      awayTeamLogo: getTeamLogo(bet.match?.away || ''),
      predictedScore: {
        home: bet.homeScore,
        away: bet.awayScore
      },
      actualScore: bet.match && bet.match.status === 'finished' ? {
        home: bet.match.homeScore,
        away: bet.match.awayScore
      } : null,
      status: this.mapBetStatus(bet.status),
      pointsEarned: bet.pointsEarned,
      date: bet.match ? new Date(bet.match.time).toLocaleDateString('es-ES') : 'TBD',
      league: bet.match?.league || 'Liga'
    }));

    this.predictions = predictions.sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return 0;
    });
  }

  private mapBetStatus(status: string): 'pending' | 'correct' | 'incorrect' {
    switch (status) {
      case 'win': return 'correct';
      case 'loss': return 'incorrect';
      default: return 'pending';
    }
  }

  navigateToTeam(teamName: string) {
    this.router.navigate(['/dashboard/team', teamName]);
  }
}
