import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { trophy, football, ribbon, statsChart, arrowBack } from 'ionicons/icons';
import { ChartConfiguration } from 'chart.js';
import { LeagueService } from '../../services/league.service';
import { Player, TeamStanding, TeamDetailStats } from '../../types/types';
import { getTeamLogo } from '../../utils/team-logos';
import { Router } from '@angular/router';
import { StatChartComponent } from '../stat-chart/stat-chart.component';

@Component({
  selector: 'app-team-detail',
  standalone: true,
  imports: [CommonModule, IonIcon, StatChartComponent],
  templateUrl: './team-detail.component.html',
  styleUrls: ['./team-detail.component.scss']
})
export class TeamDetailComponent implements OnInit {
  teamName: string = '';
  teamLogo: string = '';
  players: Player[] = [];
  teamStats: TeamDetailStats | null = null;
  isLoading = true;
  error: string | null = null;
  goalsChartConfig: ChartConfiguration | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private leagueService: LeagueService
  ) {
    addIcons({ trophy, football, ribbon, statsChart, arrowBack });
  }

  async ngOnInit() {
    const teamNameParam = this.route.snapshot.paramMap.get('teamName');
    if (teamNameParam) {
      const decodedTeamName = decodeURIComponent(teamNameParam); // El nombre del equipo, si tiene espacios o caracteres especiales, se codifica en la url
      this.teamName = decodedTeamName;
      this.teamLogo = getTeamLogo(decodedTeamName);
      await this.loadTeamData(decodedTeamName);
    }
  }

  async loadTeamData(teamName: string) {
    try {
      this.isLoading = true;
      this.error = null;

      const [players, standings] = await Promise.all([
        this.leagueService.getTeamPlayers(teamName),
        this.leagueService.getStandings(),
      ]);

      this.players = players;

      const teamStanding = standings.find(s => s.name === teamName);
      if (teamStanding) {
        this.teamStats = this.calculateTeamStats(teamStanding, standings);
      }

      await this.loadGoalsChart(teamName);
    } catch (err) {
      console.error('Error loading team data:', err);
      this.error = 'Error al cargar los datos del equipo';
    } finally {
      this.isLoading = false;
    }
  }

  private async loadGoalsChart(teamName: string) {
    try {
      const history = await this.leagueService.getStandingsHistory(teamName);
      if (!history.length) return;

      const sorted = [...history].sort((a, b) => a.jornada - b.jornada);
      const labels = sorted.map(r => `J${r.jornada}`);

      this.goalsChartConfig = {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Goles a Favor',
              data: sorted.map(r => r.gf),
              backgroundColor: 'rgba(52,199,89,0.7)',
              borderColor: '#34c759',
              borderWidth: 1,
            },
            {
              label: 'Goles en Contra',
              data: sorted.map(r => r.gc),
              backgroundColor: 'rgba(255,59,48,0.7)',
              borderColor: '#ff3b30',
              borderWidth: 1,
            }
          ]
        },
        options: {
          scales: {
            y: {
              beginAtZero: true,
              ticks: { stepSize: 1 },
              title: { display: true, text: 'Goles' }
            }
          },
          plugins: {
            legend: { position: 'top' }
          }
        }
      };
    } catch {
      // No history yet — chart stays null, shown as "Sin datos"
    }
  }

  calculateTeamStats(standing: TeamStanding, allStandings: TeamStanding[]): TeamDetailStats {
    const position = allStandings
      .sort((a, b) => b.pts - a.pts)
      .findIndex(s => s.name === standing.name) + 1;

    const winPercentage = standing.pj > 0 ? Math.round((standing.pg / standing.pj) * 100) : 0;

    return {
      position,
      played: standing.pj,
      won: standing.pg,
      drawn: standing.pe,
      lost: standing.pp,
      goalsFor: standing.gf,
      goalsAgainst: standing.gc,
      goalDifference: standing.gf - standing.gc,
      points: standing.pts,
      winPercentage
    };
  }

  goBack() {
    this.router.navigate(['/dashboard/classification']);
  }

  getPositionClass(position: number): string | null {
    if (position <= 4) return 'champions';
    if (position >= 5 && position <= 6) return 'europa';
    if (position >= 18) return 'relegation';
    return null;
  }
}
