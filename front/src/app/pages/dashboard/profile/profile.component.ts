import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { trophy, star, arrowBack } from 'ionicons/icons';
import { AuthService } from '../../../services/auth-service';
import { User, UserProfile } from '../../../types/types';
import { BetService } from '../../../services/bet.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, IonIcon],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit {
  userProfile: UserProfile | null = null;
  isLoading = true;

  constructor(
    private betService: BetService,
    private authService: AuthService
  ) {
    addIcons({ trophy, star, arrowBack });
  }

  async ngOnInit() {
    await this.loadUserProfile();
  }

  async loadUserProfile() {
    try {
      const user: User | null = await this.authService.syncUser();

      if (user) {
        const bets = await this.betService.getUserBets(user.id);

        const totalBets = bets.length;
        const finishedBets = bets.filter(b => b.status === 'win' || b.status === 'loss');
        const wonBets = bets.filter(b => b.status === 'win').length;
        const winRate = finishedBets.length > 0 ? (wonBets / finishedBets.length) : 0;

        this.userProfile = {
          name: user.username || 'Usuario',
          avatar: user.avatar || 'https://i.pravatar.cc/300?u=default',
          points: user.points ?? 0,
          rank: user.rank ?? 0,
          totalBets,
          winRate
        };
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      this.isLoading = false;
    }
  }
}
