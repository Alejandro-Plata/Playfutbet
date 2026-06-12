import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { RegisterData, LoginData, User, AuthResponse } from '../types/types';
import { saveAuthData } from '../utils/setPreferences';
import { getToken, getUser } from '../utils/getPreferences';
import { removePreferences } from '../utils/removePreferences';
import { API_URL } from '../utils/consts';

@Injectable({
  providedIn: 'root',
})
export class AuthService {

  static token: string | null = null;
  private apiUrl = API_URL;

  constructor(private http: HttpClient) {
    this.loadToken();
  }

  private async loadToken() {
    AuthService.token = await getToken();
  }

  async register(data: RegisterData): Promise<User> {
    try {
      const authResponse = await firstValueFrom(this.http.post<AuthResponse>(`${this.apiUrl}/register`, data));
      await saveAuthData(authResponse);
      AuthService.token = authResponse.token;
      return authResponse.user;
    } catch (error: any) {
      throw new Error(error.error?.error || 'Error en el registro');
    }
  }

  async login(data: LoginData): Promise<User> {
    try {
      const authResponse = await firstValueFrom(this.http.post<AuthResponse>(`${this.apiUrl}/login`, data));
      await saveAuthData(authResponse);
      AuthService.token = authResponse.token;
      return authResponse.user;
    } catch (error: any) {
      throw new Error(error.error?.error || 'Error en el login');
    }
  }

  async loginWithGoogle(idToken: string): Promise<User> {
    try {
      const authResponse = await firstValueFrom(
        this.http.post<AuthResponse>(`${this.apiUrl}/auth/google`, { idToken })
      );
      await saveAuthData(authResponse);
      AuthService.token = authResponse.token;
      return authResponse.user;
    } catch (error: any) {
      throw new Error(error.error?.error || 'Error al iniciar sesión con Google');
    }
  }

  isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  async logout(): Promise<void> {
    await removePreferences();
    AuthService.token = null;
  }

  async getCurrentUser(): Promise<User | null> {
    return await getUser();
  }

  async syncUser(): Promise<User | null> {
    try {
      const user = await getUser();
      if (!user) return null;
      const updatedUser = await firstValueFrom(this.http.get<User>(`${this.apiUrl}/users/${user.id}`));
      await saveAuthData({ token: AuthService.token || '', user: updatedUser });
      return updatedUser;
    } catch (error) {
      return await getUser();
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await getToken();
    AuthService.token = token;
    return token !== null;
  }
}
