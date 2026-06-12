import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonIcon, IonToggle } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { trophy, star, camera, pencil, lockClosed, eye, checkmark, close } from 'ionicons/icons';
import { AuthService } from '../../../services/auth-service';
import { UserService } from '../../../services/user.service';
import { NotificationService } from '../../../services/notification.service';
import { User, UserProfile } from '../../../types/types';
import { BetService } from '../../../services/bet.service';
import { TEAM_LOGOS } from '../../../utils/team-logos';
import { saveAuthData } from '../../../utils/setPreferences';
import { getToken } from '../../../utils/getPreferences';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon, IonToggle],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit {
  userProfile: UserProfile | null = null;
  isLoading = true;
  isEditing = false;
  isSaving = false;
  isUploadingAvatar = false;
  avatarPreview: string | null = null;

  editForm = {
    username: '',
    bio: '',
    favoriteTeam: '',
    isPrivate: false,
    showBets: true,
    showStats: true,
  };

  readonly teamNames = Object.keys(TEAM_LOGOS);
  readonly TEAM_LOGOS = TEAM_LOGOS;

  private currentUser: User | null = null;

  constructor(
    private betService: BetService,
    private authService: AuthService,
    private userService: UserService,
    private notificationService: NotificationService,
  ) {
    addIcons({ trophy, star, camera, pencil, lockClosed, eye, checkmark, close });
  }

  async ngOnInit() {
    await this.loadUserProfile();
  }

  async loadUserProfile() {
    try {
      const user: User | null = await this.authService.syncUser();
      if (!user) return;
      this.currentUser = user;

      const bets = await this.betService.getUserBets(user.id);
      const totalBets = bets.length;
      const finishedBets = bets.filter(b => b.status === 'win' || b.status === 'loss');
      const wonBets = bets.filter(b => b.status === 'win').length;
      const winRate = finishedBets.length > 0 ? (wonBets / finishedBets.length) : 0;

      this.userProfile = {
        name: user.username || 'Usuario',
        avatar: user.avatar || 'https://api.dicebear.com/7.x/notionists/svg?seed=default',
        points: user.points ?? 0,
        rank: user.rank ?? 0,
        totalBets,
        winRate,
        bio: user.bio || '',
        favoriteTeam: user.favoriteTeam || null,
        isPrivate: user.isPrivate ?? false,
        showBets: user.showBets !== false,
        showStats: user.showStats !== false,
        seasonPoints: user.seasonPoints ?? 0,
      };

      this.editForm = {
        username: user.username,
        bio: user.bio || '',
        favoriteTeam: user.favoriteTeam || '',
        isPrivate: user.isPrivate ?? false,
        showBets: user.showBets !== false,
        showStats: user.showStats !== false,
      };
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      this.isLoading = false;
    }
  }

  startEditing() {
    this.isEditing = true;
  }

  cancelEditing() {
    this.isEditing = false;
    if (this.currentUser) {
      this.editForm = {
        username: this.currentUser.username,
        bio: this.currentUser.bio || '',
        favoriteTeam: this.currentUser.favoriteTeam || '',
        isPrivate: this.currentUser.isPrivate ?? false,
        showBets: this.currentUser.showBets !== false,
        showStats: this.currentUser.showStats !== false,
      };
    }
  }

  async saveProfile() {
    if (!this.currentUser) return;
    this.isSaving = true;
    try {
      const updated = await this.userService.updateProfile(this.currentUser.id, {
        username: this.editForm.username || undefined,
        bio: this.editForm.bio,
        favoriteTeam: this.editForm.favoriteTeam || undefined,
        isPrivate: this.editForm.isPrivate,
        showBets: this.editForm.showBets,
        showStats: this.editForm.showStats,
      });

      const token = await getToken() || '';
      await saveAuthData({ token, user: { ...this.currentUser, ...updated } });

      await this.loadUserProfile();
      this.isEditing = false;
      this.notificationService.showAlert('Perfil actualizado', 'success');
    } catch (error: any) {
      this.notificationService.showAlert(error.error?.error || 'Error al guardar', 'error');
    } finally {
      this.isSaving = false;
    }
  }

  onAvatarClick() {
    document.getElementById('avatar-input')?.click();
  }

  async onAvatarSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.currentUser) return;

    // Preview local inmediato
    this.avatarPreview = URL.createObjectURL(file);
    this.isUploadingAvatar = true;
    try {
      const result = await this.userService.uploadAvatar(this.currentUser.id, file);
      const token = await getToken() || '';
      await saveAuthData({ token, user: { ...this.currentUser, avatar: result.avatar } });
      this.currentUser.avatar = result.avatar;
      if (this.userProfile) this.userProfile.avatar = result.avatar;
      this.avatarPreview = result.avatar;
      this.notificationService.showAlert('Foto de perfil actualizada', 'success');
    } catch (error: any) {
      this.avatarPreview = null;
      this.notificationService.showAlert(error.error?.error || 'Error al subir imagen', 'error');
    } finally {
      this.isUploadingAvatar = false;
      input.value = '';
    }
  }

  get currentAvatar(): string {
    return this.avatarPreview || this.userProfile?.avatar || '';
  }

  getTeamLogo(name: string): string {
    return this.TEAM_LOGOS[name] || '';
  }
}
