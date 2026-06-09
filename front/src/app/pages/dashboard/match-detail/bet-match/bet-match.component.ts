import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { wallet, trophy, add, remove } from 'ionicons/icons';
import { BetService } from '../../../../services/bet.service';
import { NotificationService } from '../../../../services/notification.service';
import { BetDto, BetData } from '../../../../types/types';
import { getUser } from '../../../../utils/getPreferences';

@Component({
    selector: 'app-bet-match',
    standalone: true,
    imports: [CommonModule, FormsModule, IonIcon],
    templateUrl: './bet-match.component.html',
    styleUrls: ['./bet-match.component.scss'],
})
export class BetMatchComponent implements OnInit {
    @Input() homeTeam!: { name: string; logoUrl: string };
    @Input() awayTeam!: { name: string; logoUrl: string };
    @Input() matchId!: number;

    userPoints: number = 0;

    betData: BetData = {
        homeScore: 0,
        awayScore: 0
    };

    constructor(
        private router: Router,
        private betService: BetService,
        private notificationService: NotificationService
    ) {
        addIcons({ wallet, trophy, add, remove });
    }

    async ngOnInit() {
        const user = await getUser();
        if (user) {
            this.userPoints = user.points;
        }
    }

    incrementScore(team: 'home' | 'away') {
        if (team === 'home') {
            if (this.betData.homeScore < 20) this.betData.homeScore++;
        } else {
            if (this.betData.awayScore < 20) this.betData.awayScore++;
        }
    }

    decrementScore(team: 'home' | 'away') {
        if (team === 'home') {
            if (this.betData.homeScore > 0) this.betData.homeScore--;
        } else {
            if (this.betData.awayScore > 0) this.betData.awayScore--;
        }
    }

    async placeBet() {
        try {
            const user = await getUser();
            if (!user) {
                this.notificationService.showAlert('Debes iniciar sesión para apostar', 'error');
                return;
            }

            const bet: BetDto = {
                userId: user.id,
                matchId: this.matchId,
                homeScore: this.betData.homeScore,
                awayScore: this.betData.awayScore
            };

            await this.betService.placeBet(bet);
            this.notificationService.showAlert('Apuesta realizada con éxito', 'success');

        } catch (error: any) {
            console.error(error);
            this.notificationService.showAlert(error.message || 'Error al realizar la apuesta', 'error');
        }
    }

    navigateToTeam(teamName: string) {
        this.router.navigate(['/dashboard/team', teamName]);
    }
}
