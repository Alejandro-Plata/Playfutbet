import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { trophy, medal, star } from 'ionicons/icons';
import { UserService } from '../../../services/user.service';
import { UserRanking } from '../../../types/types';

type RankingTab = 'total' | 'season';

@Component({
  selector: 'app-ranking',
  standalone: true,
  imports: [CommonModule, IonIcon],
  templateUrl: './ranking.component.html',
  styleUrls: ['./ranking.component.scss']
})
export class RankingComponent implements OnInit {
  players: (UserRanking & { position: number })[] = [];
  isLoading = true;
  activeTab: RankingTab = 'total';

  constructor(
    private userService: UserService,
    private router: Router,
  ) {
    addIcons({ trophy, medal, star });
  }

  ngOnInit() {
    this.loadRanking('total');
  }

  async loadRanking(tab: RankingTab) {
    this.activeTab = tab;
    this.isLoading = true;
    try {
      const ranking = tab === 'season'
        ? await this.userService.getSeasonLeaderboard()
        : await this.userService.getLeaderboard();

      this.players = ranking.map((user, index) => ({
        ...user,
        avatar: user.avatar || 'https://api.dicebear.com/7.x/notionists/svg?seed=default',
        position: index + 1
      }));
    } catch (error) {
      console.error('Error loading ranking:', error);
    } finally {
      this.isLoading = false;
    }
  }

  openProfile(userId: number) {
    this.router.navigate(['/dashboard/user', userId]);
  }

  getTopThree() { return this.players.slice(0, 3); }
  getAllPlayers() { return this.players; }

  getPodiumOrder() {
    const top = this.getTopThree();
    if (top.length < 3) return top;
    return [top[1], top[0], top[2]];
  }
}
