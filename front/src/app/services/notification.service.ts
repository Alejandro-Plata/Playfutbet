import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Subject } from 'rxjs';
import { API_URL } from '../utils/consts';
import { Notification } from '../types/types';

@Injectable({
    providedIn: 'root',
})
export class NotificationService {

    private apiUrl = API_URL;
    private alertSubject = new Subject<{ message: string; type: 'success' | 'error' | 'info' }>();
    alert$ = this.alertSubject.asObservable();

    constructor(private http: HttpClient) { }

    async getUserNotifications(userId: number): Promise<Notification[]> {
        return firstValueFrom(this.http.get<Notification[]>(`${this.apiUrl}/notifications/user/${userId}`));
    }

    async getUnreadCount(userId: number): Promise<number> {
        const res = await firstValueFrom(
            this.http.get<{ count: number }>(`${this.apiUrl}/notifications/user/${userId}/unread-count`)
        );
        return res.count;
    }

    async markAsRead(notifId: number): Promise<void> {
        await firstValueFrom(this.http.patch(`${this.apiUrl}/notifications/${notifId}/read`, {}));
    }

    async deleteNotification(id: number): Promise<void> {
        await firstValueFrom(this.http.delete<void>(`${this.apiUrl}/notifications/${id}`));
    }

    showAlert(message: string, type: 'success' | 'error' | 'info' = 'info') {
        this.alertSubject.next({ message, type });
    }
}
