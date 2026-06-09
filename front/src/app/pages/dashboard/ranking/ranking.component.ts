import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { trophy, medal, star } from 'ionicons/icons';
import { UserService } from '../../../services/user.service';
import { UserRanking } from '../../../types/types';

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

  constructor(private userService: UserService) {
    addIcons({ trophy, medal, star });
  }

  ngOnInit() {
    this.loadRanking();
  }

  async loadRanking() {
    try {
      this.isLoading = true;
      const ranking = await this.userService.getLeaderboard();

      this.players = ranking.map((user, index) => ({
        ...user,
        avatar: user.avatar || 'https://img.freepik.com/free-vector/football-soccer-tournament-vector-logo-design_47987-24746.jpg?semt=ais_user_personalization&w=740&q=80',
        position: index + 1
      }));
    } catch (error) {
      console.error('Error loading ranking:', error);
    } finally {
      this.isLoading = false;
    }
  }

  getTopThree() {
    return this.players.slice(0, 3);
  }

  getAllPlayers() {
    return this.players;
  }

  getPodiumOrder() {
    const top = this.getTopThree();
    if (top.length < 3) return top;
    // Orden para el podio: 2º, 1º, 3º (para que el 1º esté en el centro más alto)
    return [top[1], top[0], top[2]];
  }
}
