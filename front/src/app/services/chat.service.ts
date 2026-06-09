import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_URL } from '../utils/consts';
import { ChatMessage, ChatMessageDto } from '../types/types';

@Injectable({
    providedIn: 'root',
})
export class ChatService {

    private apiUrl = API_URL;

    constructor(private http: HttpClient) { }

    async getMessages(matchId: number): Promise<ChatMessage[]> {
        try {
            return await firstValueFrom(this.http.get<ChatMessage[]>(`${this.apiUrl}/messages/${matchId}`));
        } catch (error) {
            console.error('Error de conexión en getMessages:', error);
            throw error;
        }
    }

    async sendMessage(msg: ChatMessageDto): Promise<ChatMessage> {
        try {
            return await firstValueFrom(this.http.post<ChatMessage>(`${this.apiUrl}/messages`, msg));
        } catch (error) {
            console.error('Error de conexión en sendMessage:', error);
            throw error;
        }
    }
}
