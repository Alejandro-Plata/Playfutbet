import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { NotificationsComponent } from '../../../components/notifications/notifications.component';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss'],
  standalone: true,
  imports: [IonicModule, RouterOutlet, RouterLink, RouterLinkActive, NotificationsComponent]
})
export class AuthComponent implements OnInit {

  animate = false;

  constructor() { }

  ngOnInit() {
    // Añade un poco de delay a la animación del balón
    setTimeout(() => {
      this.animate = true;
    }, 100);
  }

}
