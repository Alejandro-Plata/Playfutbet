import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../services/notification.service';
import { IonicModule } from "@ionic/angular";
import { addIcons } from 'ionicons';
import { alertCircle, informationCircle, checkmarkCircle } from 'ionicons/icons';
import { Subscription } from 'rxjs';
import { Alert } from '../../types/types';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss']
})
export class NotificationsComponent implements OnInit, OnDestroy {

  alerts: Alert[] = [];
  private alertSubscription?: Subscription;

  constructor(private notificationService: NotificationService) {
    addIcons({ alertCircle, informationCircle, checkmarkCircle });
  }

  ngOnInit() {
    this.alertSubscription = this.notificationService.alert$.subscribe((alert) => {
      const icon = alert.type === 'success' ? 'checkmark-circle' : alert.type === 'error' ? 'alert-circle' : 'information-circle';
      const newAlert: Alert = { ...alert, icon };

      this.alerts.push(newAlert);

      setTimeout(() => {
        this.alerts = this.alerts.filter(a => a !== newAlert);
      }, 3000);
    });
  }

  ngOnDestroy() {
    if (this.alertSubscription) {
      this.alertSubscription.unsubscribe();
    }
  }
}

