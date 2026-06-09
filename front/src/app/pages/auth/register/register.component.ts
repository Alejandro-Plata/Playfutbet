import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonIcon, IonCol, IonRow, IonGrid, IonContent } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { football, arrowForward } from 'ionicons/icons';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../services/auth-service';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonIcon]
})
export class RegisterComponent {
  registerForm: FormGroup;
  animate = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {
    addIcons({ arrowForward, football });
    this.registerForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(4)]],
      confirmPassword: ['', [Validators.required, Validators.minLength(4)]]
    });
  }

  ngOnInit() {
    setTimeout(() => this.animate = true, 100);
  }

  async onSubmit() {
    if (this.registerForm.valid) {
      const { username, email, password, confirmPassword } = this.registerForm.value;

      if (password !== confirmPassword) {
        this.notificationService.showAlert('Las contraseñas no coinciden', 'error');
        return;
      }

      try {
        await this.authService.register({ username, email, password });
        this.router.navigate(['/dashboard/panel']);
      } catch (error: any) {
        const errorMessage = error.message || 'Ha ocurrido un error en el registro';
        this.notificationService.showAlert(errorMessage, 'error');
      }
    } else {
      this.registerForm.markAllAsTouched();
    }
  }
}