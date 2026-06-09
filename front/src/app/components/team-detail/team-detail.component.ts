import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { trophy, football, ribbon, statsChart, arrowBack } from 'ionicons/icons';
import { LeagueService } from '../../services/league.service';
import { Player, TeamStanding, TeamDetailStats } from '../../types/types';
import { getTeamLogo } from '../../utils/team-logos';
import { Router } from '@angular/router';

@Component({
  selector: 'app-team-detail',
  standalone: true,
  imports: [CommonModule, IonIcon],
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

      const players = await this.leagueService.getTeamPlayers(teamName);
      const standings = await this.leagueService.getStandings();

      this.players = players;

      const teamStanding = standings.find(s => s.name === teamName);
      if (teamStanding) {
        const stats = this.calculateTeamStats(teamStanding, standings);
        this.teamStats = stats;
      }
    } catch (err) {
      console.error('Error loading team data:', err);
      this.error = 'Error al cargar los datos del equipo';
    } finally {
      this.isLoading = false;
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
