import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowForward, logoGoogle } from 'ionicons/icons';
import { AuthService } from '../../../services/auth-service';
import { NotificationService } from '../../../services/notification.service';
import { GOOGLE_CLIENT_ID } from '../../../utils/consts';

declare const google: any;

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonIcon]
})
export class LoginComponent implements OnInit, AfterViewInit {
  loginForm: FormGroup;
  animate = false;
  loading = false;
  googleLoading = false;

  private readonly GOOGLE_CLIENT_ID = GOOGLE_CLIENT_ID;

  private returnUrl = '/dashboard/panel';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private notificationService: NotificationService,
  ) {
    addIcons({ arrowForward, logoGoogle });
    this.loginForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit() {
    setTimeout(() => this.animate = true, 100);
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/dashboard/panel';
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
      script.async = true;
      script.defer = true;
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
    const hidden = document.getElementById('google-btn-hidden');
    if (hidden) {
      google.accounts.id.renderButton(hidden, { type: 'icon', size: 'large' });
    }
  }

  loginWithGoogle() {
    const hidden = document.getElementById('google-btn-hidden');
    const btn = hidden?.querySelector('div[role=button]') as HTMLElement;
    if (btn) {
      btn.click();
    } else {
      google.accounts.id.prompt();
    }
  }

  async handleGoogleResponse(response: any) {
    if (!response.credential) return;
    this.googleLoading = true;
    try {
      await this.authService.loginWithGoogle(response.credential);
      this.router.navigateByUrl(this.returnUrl);
    } catch (error: any) {
      this.notificationService.showAlert(error.message || 'Error con Google', 'error');
    } finally {
      this.googleLoading = false;
    }
  }

  async onSubmit() {
    if (!this.loginForm.valid) return;
    const { username, password } = this.loginForm.value;
    this.loading = true;
    try {
      await this.authService.login({ username, password });
      this.router.navigateByUrl(this.returnUrl);
    } catch (error: any) {
      this.notificationService.showAlert(error.message || 'Error al iniciar sesion', 'error');
    } finally {
      this.loading = false;
    }
  }
}
