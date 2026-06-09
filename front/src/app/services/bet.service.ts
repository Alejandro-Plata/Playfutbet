import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_URL } from '../utils/consts';
import { Bet, EnrichedBet, BetDto } from '../types/types';

@Injectable({
    providedIn: 'root',
})
export class BetService {

    private apiUrl = API_URL;

    constructor(private http: HttpClient) { }

    async placeBet(bet: BetDto): Promise<Bet> {
        try {
            return await firstValueFrom(this.http.post<Bet>(`${this.apiUrl}/bets`, bet));
        } catch (error) {
            console.error('Error en placeBet:', error);
            throw error;
        }
    }

    async getUserBets(userId: number): Promise<EnrichedBet[]> {
        try {
            return await firstValueFrom(this.http.get<EnrichedBet[]>(`${this.apiUrl}/bets/user/${userId}`));
        } catch (error) {
            console.error('Error de conexión:', error);
            throw error;
        }
    }
}
