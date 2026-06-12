import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronBack, chevronForward, trophy, football } from 'ionicons/icons';
import { ChartConfiguration } from 'chart.js';
import { LeagueService } from '../../../services/league.service';
import { MatchService } from '../../../services/match.service';
import { Match, MatchStatus, ClassificationTeamStats, MatchdayMatch } from '../../../types/types';
import { getTeamLogo } from '../../../utils/team-logos';
import { StatChartComponent } from '../../../components/stat-chart/stat-chart.component';

@Component({
  selector: 'app-classification',
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon, StatChartComponent],
  templateUrl: './classification.component.html',
  styleUrls: ['./classification.component.scss']
})
export class ClassificationComponent implements OnInit {
  currentSeason = '2025/2026';
  currentMatchday = 1;
  maxMatchday = 38;
  sortBy: 'position' | 'won' | 'drawn' | 'lost' = 'position';

  standings: ClassificationTeamStats[] = [];
  matchdayMatches: MatchdayMatch[] = [];
  isLoading = true;

  selectedTeam = '';
  positionChartConfig: ChartConfiguration | null = null;
  isChartLoading = false;

  constructor(
    private router: Router,
    private leagueService: LeagueService,
    private matchService: MatchService
  ) {
    addIcons({ chevronBack, chevronForward, trophy, football });
  }

  get teamNames(): string[] {
    return [...this.standings].sort((a, b) => a.team.localeCompare(b.team)).map(s => s.team);
  }

  async ngOnInit() {
    await this.loadStandings();
    const state = await this.matchService.getSimulationState();
    this.currentMatchday = state.currentJornada || 1;
    this.loadMatchdayMatches(this.currentMatchday);
  }

  async loadStandings() {
    try {
      this.isLoading = true;
      const apiStandings = await this.leagueService.getStandings();

      this.standings = apiStandings
        .map((standing, index) => ({
          position: index + 1,
          team: standing.name,
          logo: getTeamLogo(standing.name),
          played: standing.pj,
          won: standing.pg,
          drawn: standing.pe,
          lost: standing.pp,
          goalsFor: standing.gf,
          goalsAgainst: standing.gc,
          goalDifference: standing.gf - standing.gc,
          points: standing.pts
        }))
        .sort((a, b) => b.points - a.points);

      if (this.sortBy !== 'position') {
        this.setSortBy(this.sortBy);
      }

    } catch (error) {
      console.error('Error loading standings:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async loadMatchdayMatches(jornada: number) {
    try {
      const matches = await this.matchService.getResultsByJornada(jornada);

      this.matchdayMatches = matches.map(match => ({
        id: match.id,
        homeTeam: match.home,
        awayTeam: match.away,
        homeLogo: getTeamLogo(match.home),
        awayLogo: getTeamLogo(match.away),
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        status: this.mapMatchStatus(match.status),
        date: new Date(match.time)
      }));

    } catch (error) {
      console.error('Error loading matchday matches:', error);
    }
  }

  mapMatchStatus(status: MatchStatus): 'UPCOMING' | 'LIVE' | 'FINISHED' {
    switch (status) {
      case 'pending':
        return 'UPCOMING';
      case 'live':
        return 'LIVE';
      case 'finished':
        return 'FINISHED';
      default:
        return 'UPCOMING';
    }
  }

  setSortBy(sort: 'position' | 'won' | 'drawn' | 'lost') {
    this.sortBy = sort;

    switch (sort) {
      case 'position':
        this.standings.sort((a, b) => a.position - b.position);
        break;
      case 'won':
        this.standings.sort((a, b) => b.won - a.won);
        break;
      case 'drawn':
        this.standings.sort((a, b) => b.drawn - a.drawn);
        break;
      case 'lost':
        this.standings.sort((a, b) => b.lost - a.lost);
        break;
    }
  }

  prevMatchday() {
    if (this.currentMatchday > 1) {
      this.currentMatchday--;
      this.loadMatchdayMatches(this.currentMatchday);
    }
  }

  nextMatchday() {
    if (this.currentMatchday < this.maxMatchday) {
      this.currentMatchday++;
      this.loadMatchdayMatches(this.currentMatchday);
    }
  }

  async onTeamSelect(team: string) {
    if (!team) { this.positionChartConfig = null; return; }
    this.isChartLoading = true;
    try {
      const history = await this.leagueService.getStandingsHistory(team);
      const sorted = [...history].sort((a, b) => a.jornada - b.jornada);
      const labels = sorted.map(r => `J${r.jornada}`);
      const positions = sorted.map(r => r.position);

      this.positionChartConfig = {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: team,
            data: positions,
            borderColor: '#f5c518',
            backgroundColor: 'rgba(245,197,24,0.15)',
            borderWidth: 2,
            pointBackgroundColor: '#f5c518',
            pointRadius: 4,
            tension: 0.3,
            fill: true,
          }]
        },
        options: {
          scales: {
            y: {
              reverse: true,
              min: 1,
              max: 20,
              ticks: { stepSize: 1 },
              title: { display: true, text: 'Posición' }
            }
          },
          plugins: { legend: { display: false } }
        }
      };
    } catch {
      this.positionChartConfig = null;
    } finally {
      this.isChartLoading = false;
    }
  }

  navigateToTeam(teamName: string) {
    this.router.navigate(['/dashboard/team', teamName]);
  }

  getPositionClass(position: number): string {
    if (position <= 4) return 'champions';
    if (position <= 6) return 'europa';
    if (position >= 18) return 'relegation';
    return '';
  }
}
