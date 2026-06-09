import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_URL } from '../utils/consts';
import { Match, SimulationState } from '../types/types';

@Injectable({
    providedIn: 'root',
})
export class MatchService {

    private apiUrl = API_URL;

    constructor(private http: HttpClient) { }

    async getMatches(): Promise<Match[]> {
        try {
            return await firstValueFrom(this.http.get<Match[]>(`${this.apiUrl}/matches`));
        } catch (error) {
            console.error('Error de conexión al obtener partidos:', error);
            throw error;
        }
    }

    async getMatchById(id: number): Promise<Match> {
        try {
            return await firstValueFrom(this.http.get<Match>(`${this.apiUrl}/matches/${id}`));
        } catch (error) {
            console.error('Error de conexión al obtener partido:', error);
            throw error;
        }
    }

    async getResultsByJornada(jornada: number): Promise<Match[]> {
        try {
            return await firstValueFrom(this.http.get<Match[]>(`${this.apiUrl}/league/results/${jornada}`));
        } catch (error) {
            console.error('Error de conexión al obtener resultados de la jornada:', error);
            throw error;
        }
    }

    async getSimulationState(): Promise<SimulationState> {
        try {
            return await firstValueFrom(this.http.get<SimulationState>(`${this.apiUrl}/simulation/state`));
        } catch (error) {
            console.error('Error de conexión al obtener la simulación:', error);
            throw error;
        }
    }
    async getStandings(): Promise<any[]> {
        try {
            return await firstValueFrom(this.http.get<any[]>(`${this.apiUrl}/league/standings`));
        } catch (error) {
            console.error('Error de conexión al obtener clasificación:', error);
            throw error;
        }
    }

    async getChatMessages(matchId: number): Promise<any[]> {
        try {
            return await firstValueFrom(this.http.get<any[]>(`${this.apiUrl}/messages/${matchId}`));
        } catch (error) {
            console.error(error);
            return [];
        }
    }

    async sendMessage(matchId: number, text: string, username: string): Promise<any> {
        try {
            return await firstValueFrom(this.http.post<any>(`${this.apiUrl}/messages`, { matchId, text, username }));
        } catch (error) {
            console.error(error);
            throw error;
        }
    }
}
