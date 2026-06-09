import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_URL } from '../utils/consts';
import { User, UserRanking, UpdateProfileDto } from '../types/types';

@Injectable({
    providedIn: 'root',
})
export class UserService {

    private apiUrl = API_URL;

    constructor(private http: HttpClient) { }

    async getLeaderboard(): Promise<UserRanking[]> {
        try {
            return await firstValueFrom(this.http.get<UserRanking[]>(`${this.apiUrl}/leaderboard`));
        } catch (error) {
            console.error('Error en getLeaderboard:', error);
            throw error;
        }
    }

    async updateProfile(userId: number, data: UpdateProfileDto): Promise<User> {
        try {
            return await firstValueFrom(this.http.put<User>(`${this.apiUrl}/users/${userId}`, data));
        } catch (error) {
            console.error('Error en updateProfile:', error);
            throw error;
        }
    }
}
