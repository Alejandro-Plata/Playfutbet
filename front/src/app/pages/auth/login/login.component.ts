import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowForward } from 'ionicons/icons';
import { AuthService } from '../../../services/auth-service';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonIcon]
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  animate = false;

  constructor(private fb: FormBuilder, private router: Router, private authService: AuthService, private notificationService: NotificationService
  ) {
    addIcons({ arrowForward });
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit() {
    // Retraso mínimo para asegurar que la animación se vea al entrar a la ruta
    setTimeout(() => this.animate = true, 100);
  }

  async onSubmit() {
    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;

      try {
        await this.authService.login({ email, password });
        this.router.navigate(['/dashboard/panel']);
      } catch (error: any) {
        const errorMessage = error.message || 'Ha ocurrido un error en el inicio de sesión';
        this.notificationService.showAlert(errorMessage, 'error');
      }
    }

  }
}