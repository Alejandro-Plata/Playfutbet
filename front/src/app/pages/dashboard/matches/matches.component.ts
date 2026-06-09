import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { football, timeOutline, statsChart, chevronForward, chevronBack, calendarOutline } from 'ionicons/icons';
import { MatchService } from '../../../services/match.service';
import { DisplayMatch } from '../../../types/types';

import { getTeamLogo } from '../../../utils/team-logos';

@Component({
    selector: 'app-matches',
    standalone: true,
    imports: [CommonModule, FormsModule, IonIcon, DatePipe, RouterLink],
    templateUrl: './matches.component.html',
    styleUrls: ['./matches.component.scss']
})
export class MatchesComponent implements OnInit {
    currentJornada = 1;
    maxJornada = 38;
    searchTerm: string = '';
    filterStatus: 'ALL' | 'LIVE' | 'UPCOMING' | 'FINISHED' = 'ALL';
    matchdayMatches: DisplayMatch[] = [];
    isLoading: boolean = true;

    constructor(
        private router: Router,
        private matchService: MatchService
    ) {
        addIcons({ football, timeOutline, statsChart, chevronForward, calendarOutline, chevronBack });
    }

    async ngOnInit() {
        const state = await this.matchService.getSimulationState();
        this.currentJornada = state.currentJornada || 1;
        await this.loadJornadaMatches(this.currentJornada);
    }

    async loadJornadaMatches(jornada: number) {
        try {
            this.isLoading = true;
            this.matchdayMatches = [];

            const apiMatches = await this.matchService.getResultsByJornada(jornada);

            this.matchdayMatches = apiMatches.map(match => ({
                id: match.id.toString(),
                homeTeam: match.home,
                awayTeam: match.away,
                homeLogo: getTeamLogo(match.home),
                awayLogo: getTeamLogo(match.away),
                status: this.mapStatus(match.status),
                score: match.status !== 'pending' ? {
                    home: match.homeScore,
                    away: match.awayScore
                } : undefined,
                matchTime: match.status === 'live' ? this.calculateMatchTime(match.time) : undefined,
                league: match.league,
                dateTime: new Date(match.time)
            }));
        } catch (error) {
            console.error('Error loading matches:', error);
        } finally {
            this.isLoading = false;
        }
    }

    prevJornada() {
        if (this.currentJornada > 1) {
            this.currentJornada--;
            this.loadJornadaMatches(this.currentJornada);
        }
    }

    nextJornada() {
        if (this.currentJornada < this.maxJornada) {
            this.currentJornada++;
            this.loadJornadaMatches(this.currentJornada);
        }
    }

    setFilterStatus(status: 'ALL' | 'LIVE' | 'UPCOMING' | 'FINISHED') {
        this.filterStatus = status;
    }

    filteredMatches(): DisplayMatch[] {
        const search = this.searchTerm.toLowerCase();

        return this.matchdayMatches.filter(match => {
            const matchesSearch = !search ||
                match.homeTeam.toLowerCase().includes(search) ||
                match.awayTeam.toLowerCase().includes(search);

            const matchesStatus = this.filterStatus === 'ALL' || match.status === this.filterStatus;

            return matchesSearch && matchesStatus;
        });
    }

    private mapStatus(status: string): 'UPCOMING' | 'LIVE' | 'FINISHED' {
        switch (status) {
            case 'pending': return 'UPCOMING';
            case 'live': return 'LIVE';
            case 'finished': return 'FINISHED';
            default: return 'UPCOMING';
        }
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

    navigateToTeam(teamName: string) {
        this.router.navigate(['/dashboard/team', teamName]);
    }
}
