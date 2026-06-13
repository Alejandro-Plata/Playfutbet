import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_URL } from '../utils/consts';
import { Conversation, PrivateMessage } from '../types/types';

@Injectable({ providedIn: 'root' })
export class ConversationService {
    private apiUrl = API_URL;
    unreadCount = signal(0);

    constructor(private http: HttpClient) {}

    async getOrCreate(otherUserId: number): Promise<{ id: number }> {
        return firstValueFrom(
            this.http.post<{ id: number }>(`${this.apiUrl}/conversations`, { otherUserId })
        );
    }

    async getConversations(): Promise<Conversation[]> {
        const convs = await firstValueFrom(
            this.http.get<Conversation[]>(`${this.apiUrl}/conversations`)
        );
        this.unreadCount.set(convs.reduce((acc, c) => acc + c.unreadCount, 0));
        return convs;
    }

    async getConversation(id: number): Promise<{ id: number; otherUser: { id: number; username: string; avatar: string } }> {
        return firstValueFrom(
            this.http.get<any>(`${this.apiUrl}/conversations/${id}`)
        );
    }

    async getMessages(convId: number, after = 0): Promise<PrivateMessage[]> {
        return firstValueFrom(
            this.http.get<PrivateMessage[]>(`${this.apiUrl}/conversations/${convId}/messages?after=${after}`)
        );
    }

    async sendMessage(convId: number, text: string): Promise<PrivateMessage> {
        return firstValueFrom(
            this.http.post<PrivateMessage>(`${this.apiUrl}/conversations/${convId}/messages`, { text })
        );
    }

    async refreshUnread() {
        try {
            const convs = await this.getConversations();
            this.unreadCount.set(convs.reduce((acc, c) => acc + c.unreadCount, 0));
        } catch { /* silencioso */ }
    }
}
