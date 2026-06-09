import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_URL } from '../utils/consts';
import { TeamStanding, Player } from '../types/types';

@Injectable({
    providedIn: 'root',
})
export class LeagueService {

    private apiUrl = API_URL;

    constructor(private http: HttpClient) { }

    async getStandings(): Promise<TeamStanding[]> {
        try {
            return await firstValueFrom(this.http.get<TeamStanding[]>(`${this.apiUrl}/league/standings`));
        } catch (error) {
            console.error('Error en getStandings:', error);
            throw error;
        }
    }

    async getTopScorers(): Promise<Player[]> {
        try {
            return await firstValueFrom(this.http.get<Player[]>(`${this.apiUrl}/players/top-scorers`));
        } catch (error) {
            console.error('Error en getTopScorers:', error);
            throw error;
        }
    }

    async getTeamPlayers(teamName: string): Promise<Player[]> {
        try {
            return await firstValueFrom(this.http.get<Player[]>(`${this.apiUrl}/teams/${encodeURIComponent(teamName)}/players`));
        } catch (error) {
            console.error('Error en getTeamPlayers:', error);
            throw error;
        }
    }
}
