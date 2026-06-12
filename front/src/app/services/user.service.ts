import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_URL } from '../utils/consts';
import { User, UserRanking, UpdateProfileDto, UserStats } from '../types/types';

@Injectable({
    providedIn: 'root',
})
export class UserService {

    private apiUrl = API_URL;

    constructor(private http: HttpClient) { }

    async getLeaderboard(): Promise<UserRanking[]> {
        return firstValueFrom(this.http.get<UserRanking[]>(`${this.apiUrl}/leaderboard`));
    }

    async getSeasonLeaderboard(): Promise<UserRanking[]> {
        return firstValueFrom(this.http.get<UserRanking[]>(`${this.apiUrl}/users/leaderboard/season`));
    }

    async getUser(userId: number): Promise<User> {
        return firstValueFrom(this.http.get<User>(`${this.apiUrl}/users/${userId}`));
    }

    async updateProfile(userId: number, data: UpdateProfileDto): Promise<User> {
        return firstValueFrom(this.http.put<User>(`${this.apiUrl}/users/${userId}`, data));
    }

    async getUserStats(userId: number): Promise<UserStats> {
        return firstValueFrom(this.http.get<UserStats>(`${this.apiUrl}/users/${userId}/stats`));
    }

    async uploadAvatar(userId: number, file: File): Promise<{ avatar: string }> {
        const formData = new FormData();
        formData.append('avatar', file);
        return firstValueFrom(
            this.http.post<{ avatar: string }>(`${this.apiUrl}/users/${userId}/avatar`, formData)
        );
    }
}
