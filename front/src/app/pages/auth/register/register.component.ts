import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { football, arrowForward, logoGoogle } from 'ionicons/icons';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth-service';
import { NotificationService } from '../../../services/notification.service';

declare const google: any;

function passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
  const value: string = control.value || '';
  if (!value) return null;
  if (value.length < 8) return { minlength: true };
  if (!/[a-zA-Z]/.test(value)) return { noLetter: true };
  if (!/[0-9]/.test(value)) return { noNumber: true };
  return null;
}

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonIcon]
})
export class RegisterComponent implements OnInit, AfterViewInit {
  registerForm: FormGroup;
  animate = false;
  loading = false;
  googleLoading = false;

  private readonly GOOGLE_CLIENT_ID = ''; // Rellenar con el Client ID de Google Cloud Console

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {
    addIcons({ arrowForward, football, logoGoogle });
    this.registerForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, passwordStrengthValidator]],
      confirmPassword: ['', [Validators.required]]
    });
  }

  ngOnInit() {
    setTimeout(() => this.animate = true, 100);
  }

  ngAfterViewInit() {
    if (this.GOOGLE_CLIENT_ID && !this.authService.isNative()) {
      this.loadGoogleGIS();
    }
  }

  private loadGoogleGIS() {
    const existing = document.querySelector('script[src*="accounts.google.com/gsi"]');
    if (!existing) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true; script.defer = true;
      script.onload = () => this.initGoogleButton();
      document.head.appendChild(script);
    } else {
      this.initGoogleButton();
    }
  }

  private initGoogleButton() {
    if (typeof google === 'undefined') return;
    google.accounts.id.initialize({
      client_id: this.GOOGLE_CLIENT_ID,
      callback: (response: any) => this.handleGoogleResponse(response),
    });
    google.accounts.id.renderButton(
      document.getElementById('google-btn-register'),
      { theme: 'outline', size: 'large', text: 'signup_with', width: '100%' }
    );
  }

  async handleGoogleResponse(response: any) {
    if (!response.credential) return;
    this.googleLoading = true;
    try {
      await this.authService.loginWithGoogle(response.credential);
      this.router.navigate(['/dashboard/panel']);
    } catch (error: any) {
      this.notificationService.showAlert(error.message || 'Error con Google', 'error');
    } finally {
      this.googleLoading = false;
    }
  }

  get passwordCtrl() { return this.registerForm.get('password')!; }

  get passwordStrengthLevel(): number {
    const v = this.passwordCtrl.value || '';
    let score = 0;
    if (v.length >= 8) score++;
    if (/[a-zA-Z]/.test(v)) score++;
    if (/[0-9]/.test(v)) score++;
    if (v.length >= 12) score++;
    return score;
  }

  async onSubmit() {
    if (!this.registerForm.valid) {
      this.registerForm.markAllAsTouched();
      return;
    }
    const { username, email, password, confirmPassword } = this.registerForm.value;
    if (password !== confirmPassword) {
      this.notificationService.showAlert('Las contraseñas no coinciden', 'error');
      return;
    }
    this.loading = true;
    try {
      await this.authService.register({ username, email, password });
      this.router.navigate(['/dashboard/panel']);
    } catch (error: any) {
      this.notificationService.showAlert(error.message || 'Error en el registro', 'error');
    } finally {
      this.loading = false;
    }
  }
}
