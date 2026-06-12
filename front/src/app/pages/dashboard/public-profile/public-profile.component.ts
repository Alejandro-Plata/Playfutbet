import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { trophy, star, lockClosed, arrowBack } from 'ionicons/icons';
import { UserService } from '../../../services/user.service';
import { User } from '../../../types/types';
import { TEAM_LOGOS } from '../../../utils/team-logos';

@Component({
  selector: 'app-public-profile',
  standalone: true,
  imports: [CommonModule, IonIcon],
  template: `
    <div class="public-profile-container">
      <div class="page-header">
        <button class="back-btn" (click)="router.navigate(['/dashboard/ranking'])">
          <ion-icon name="arrow-back"></ion-icon> VOLVER
        </button>
        <div class="header-title">
          <h1>PERFIL DE JUGADOR</h1>
        </div>
      </div>

      @if (isLoading) {
        <div class="loading-state"><p>Cargando...</p></div>
      }

      @if (!isLoading && isPrivate) {
        <div class="private-card">
          <ion-icon name="lock-closed" class="lock-icon"></ion-icon>
          <h2>PERFIL PRIVADO</h2>
          <p>Este usuario ha configurado su perfil como privado.</p>
        </div>
      }

      @if (!isLoading && !isPrivate && user) {
        <div class="profile-card">
          <div class="avatar-section">
            <img [src]="user.avatar" [alt]="user.username" class="user-avatar">
            @if (user.rank) {
              <div class="rank-badge">
                <ion-icon name="trophy"></ion-icon>#{{ user.rank }}
              </div>
            }
            <h2>{{ user.username }}</h2>
            @if (user.bio) { <p class="bio">{{ user.bio }}</p> }
            @if (user.favoriteTeam) {
              <div class="fav-team">
                <img [src]="getTeamLogo(user.favoriteTeam)" [alt]="user.favoriteTeam">
                <span>{{ user.favoriteTeam }}</span>
              </div>
            }
          </div>

          <div class="points-card">
            <ion-icon name="star"></ion-icon>
            <div>
              <span class="label">PUNTOS TOTALES</span>
              <span class="value">{{ user.points }}</span>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .public-profile-container { max-width: 700px; margin: 0 auto; padding: 0 1.5rem; }
    .page-header { display: flex; align-items: center; gap: 1.5rem; padding: 1.5rem 0; border-bottom: 3px solid #000; margin-bottom: 2rem; }
    .back-btn { background: #000; color: #fff; border: none; padding: 0.6rem 1rem; font-weight: 900; font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; gap: 0.4rem; }
    h1 { font-size: 1.4rem; font-weight: 900; margin: 0; }
    .profile-card { background: #fff; border: 3px solid #000; box-shadow: 6px 6px 0 #000; padding: 3rem 2rem; text-align: center; }
    .avatar-section { margin-bottom: 2rem; }
    .user-avatar { width: 140px; height: 140px; border-radius: 50%; border: 4px solid #000; object-fit: cover; }
    .rank-badge { display: inline-flex; align-items: center; gap: 0.4rem; background: #F7C432; border: 2px solid #000; padding: 0.3rem 0.8rem; border-radius: 50px; font-weight: 900; margin-top: 0.5rem; }
    h2 { font-size: 2rem; font-weight: 900; margin: 0.75rem 0 0.25rem; }
    .bio { color: #555; font-size: 0.9rem; max-width: 380px; margin: 0 auto 0.5rem; }
    .fav-team { display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-top: 0.5rem; img { width: 26px; height: 26px; object-fit: contain; } span { font-weight: 700; font-size: 0.9rem; } }
    .points-card { display: inline-flex; align-items: center; gap: 1.5rem; background: #F7C432; border: 3px solid #000; box-shadow: 5px 5px 0 #000; padding: 1.5rem 2rem; ion-icon { font-size: 3rem; color: #000; } .label { display: block; font-size: 0.7rem; font-weight: 700; letter-spacing: 2px; color: #555; } .value { display: block; font-size: 3rem; font-weight: 900; line-height: 1; color: #000; } }
    .private-card { text-align: center; background: #fff; border: 3px solid #000; box-shadow: 6px 6px 0 #000; padding: 4rem 2rem; .lock-icon { font-size: 4rem; color: #ccc; } h2 { font-weight: 900; } p { color: #666; } }
    .loading-state { padding: 3rem; text-align: center; }
  `]
})
export class PublicProfileComponent implements OnInit {
  user: User | null = null;
  isLoading = true;
  isPrivate = false;

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private userService: UserService,
  ) {
    addIcons({ trophy, star, lockClosed, arrowBack });
  }

  async ngOnInit() {
    const id = parseInt(this.route.snapshot.paramMap.get('id') || '0');
    try {
      this.user = await this.userService.getUser(id);
      this.isPrivate = !!(this.user as any).isPrivate && Object.keys(this.user).length <= 4;
    } catch (e) {
      this.isPrivate = true;
    } finally {
      this.isLoading = false;
    }
  }

  getTeamLogo(name: string): string {
    return TEAM_LOGOS[name] || '';
  }
}
