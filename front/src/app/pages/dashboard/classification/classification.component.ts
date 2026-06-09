import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronBack, chevronForward, trophy, football } from 'ionicons/icons';
import { LeagueService } from '../../../services/league.service';
import { MatchService } from '../../../services/match.service';
import { Match, MatchStatus, ClassificationTeamStats, MatchdayMatch } from '../../../types/types';
import { getTeamLogo } from '../../../utils/team-logos';

@Component({
  selector: 'app-classification',
  standalone: true,
  imports: [CommonModule, IonIcon],
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

  constructor(
    private router: Router,
    private leagueService: LeagueService,
    private matchService: MatchService
  ) {
    addIcons({ chevronBack, chevronForward, trophy, football });
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
