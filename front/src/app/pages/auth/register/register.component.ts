import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { football, arrowForward, logoGoogle } from 'ionicons/icons';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth-service';
import { NotificationService } from '../../../services/notification.service';
import { GOOGLE_CLIENT_ID } from '../../../utils/consts';

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
  /** 'popup': esperando a que el usuario elija cuenta; 'servidor': verificando con el backend. */
  googleFase: 'popup' | 'servidor' = 'popup';
  private googleTimer?: ReturnType<typeof setTimeout>;

  private readonly GOOGLE_CLIENT_ID = GOOGLE_CLIENT_ID;

  get showGoogle(): boolean {
    return !!this.GOOGLE_CLIENT_ID && !this.authService.isNative();
  }

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
      client_id: this.GOOGLE_CLIENT_ID.trim(),
      callback: (response: any) => this.handleGoogleResponse(response),
      use_fedcm_for_prompt: true,
    });
    const hidden = document.getElementById('google-btn-hidden');
    if (hidden) {
      google.accounts.id.renderButton(hidden, { type: 'icon', size: 'large' });
    }
  }

  registerWithGoogle() {
    this.googleFase = 'popup';
    this.googleLoading = true;
    // Si el usuario cierra la ventana de Google sin elegir cuenta, no hay callback: lo recuperamos al volver el foco.
    clearTimeout(this.googleTimer);
    this.googleTimer = setTimeout(() => this.cancelarGoogle(), 90_000);
    window.addEventListener('focus', this.alVolverElFoco);

    if (typeof google === 'undefined') {
      // El script de Google aún se está descargando: reintentamos en cuanto esté
      this.esperarGoogle();
      return;
    }
    const hidden = document.getElementById('google-btn-hidden');
    const btn = hidden?.querySelector('div[role=button]') as HTMLElement;
    if (btn) {
      btn.click();
    } else {
      google.accounts.id.prompt();
    }
  }

  private esperarGoogle(intentos = 0) {
    if (!this.googleLoading) return;
    if (typeof google !== 'undefined') {
      this.initGoogleButton();
      this.registerWithGoogle();
      return;
    }
    if (intentos > 40) {
      this.cancelarGoogle();
      this.notificationService.showAlert('No se pudo cargar Google. Revisa tu conexión o el bloqueador de anuncios.', 'error');
      return;
    }
    setTimeout(() => this.esperarGoogle(intentos + 1), 250);
  }

  private alVolverElFoco = () => {
    // Margen para que, si el usuario sí eligió cuenta, llegue el callback antes de cancelar
    setTimeout(() => { if (this.googleFase === 'popup') this.cancelarGoogle(); }, 1500);
  };

  private cancelarGoogle() {
    clearTimeout(this.googleTimer);
    window.removeEventListener('focus', this.alVolverElFoco);
    if (this.googleFase === 'popup') this.googleLoading = false;
  }

  async handleGoogleResponse(response: any) {
    if (!response.credential) return;
    clearTimeout(this.googleTimer);
    window.removeEventListener('focus', this.alVolverElFoco);
    this.googleFase = 'servidor';
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
