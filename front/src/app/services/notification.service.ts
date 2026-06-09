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


    private alertSubject = new Subject<{ message: string, type: 'success' | 'error' | 'info' }>();
    alert$ = this.alertSubject.asObservable();

    constructor(private http: HttpClient) { }

    async getUserNotifications(userId: number): Promise<Notification[]> {
        try {
            return await firstValueFrom(this.http.get<Notification[]>(`${this.apiUrl}/notifications/user/${userId}`));
        } catch (error) {
            console.error('Error en getUserNotifications:', error);
            throw error;
        }
    }

    async deleteNotification(id: number): Promise<void> {
        try {
            await firstValueFrom(this.http.delete<void>(`${this.apiUrl}/notifications/${id}`));
        } catch (error) {
            console.error('Error en deleteNotification:', error);
            throw error;
        }
    }

    showAlert(message: string, type: 'success' | 'error' | 'info' = 'info') {
        this.alertSubject.next({ message, type });
    }
}
