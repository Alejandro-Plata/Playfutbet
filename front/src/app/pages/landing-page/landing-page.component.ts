import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { trophy, barChart, chatbubbles, notifications, football, arrowForward } from 'ionicons/icons';
import { AuthService } from '../../services/auth-service';
import { TEAM_LOGOS, getTeamLogo } from '../../utils/team-logos';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [RouterLink, IonContent, IonIcon],
  templateUrl: './landing-page.component.html',
  styleUrls: ['./landing-page.component.scss'],
})
export class LandingPageComponent implements OnInit, AfterViewInit, OnDestroy {

  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private authService = inject(AuthService);

  isLoggedIn = false;

  // Escudos de los 20 equipos para la cinta que se desplaza
  teams = Object.keys(TEAM_LOGOS);
  getTeamLogo = getTeamLogo;

  // --- Demo de predicción: mismas reglas que la app (10 pts exacto, 5 pts ganador/empate) ---
  home = 'Real Madrid';
  away = 'FC Barcelona';
  guess = { home: 2, away: 1 };
  real: { home: number; away: number } | null = null;
  points: number | null = null;
  simulating = false;

  private observer?: IntersectionObserver;
  private simTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    addIcons({ trophy, barChart, chatbubbles, notifications, football, arrowForward });
  }

  async ngOnInit() {
    this.isLoggedIn = await this.authService.isAuthenticated();
  }

  ngAfterViewInit() {
    const root = this.host.nativeElement;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const items = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal], [data-count]'));

    if (reduced || !('IntersectionObserver' in window)) {
      items.forEach(el => this.show(el, false));
      return;
    }

    // Lo que entra en pantalla aparece con animación; los números cuentan hasta su valor
    this.observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        this.show(entry.target as HTMLElement, true);
        this.observer?.unobserve(entry.target);
      }
    }, { threshold: 0.2 });
    items.forEach(el => this.observer!.observe(el));
  }

  ngOnDestroy() {
    this.observer?.disconnect();
    clearTimeout(this.simTimer);
  }

  private show(el: HTMLElement, animate: boolean) {
    el.classList.add('in');
    const target = Number(el.dataset['count']);
    if (!el.dataset['count'] || Number.isNaN(target)) return;
    if (!animate) { el.textContent = String(target); return; }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / 1100, 1);
      el.textContent = String(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  step(side: 'home' | 'away', delta: number) {
    this.guess[side] = Math.min(9, Math.max(0, this.guess[side] + delta));
    this.real = null;
    this.points = null;
  }

  // Genera un marcador al azar y aplica las reglas de puntuación
  simulate() {
    if (this.simulating) return;
    this.simulating = true;
    this.points = null;
    let ticks = 0;
    const spin = () => {
      this.real = { home: this.randomGoals(), away: this.randomGoals() };
      if (++ticks < 10) {
        this.simTimer = setTimeout(spin, 70);
      } else {
        this.points = this.score(this.guess, this.real);
        this.simulating = false;
      }
    };
    spin();
  }

  private randomGoals(): number {
    const r = Math.random();
    return r < 0.3 ? 0 : r < 0.62 ? 1 : r < 0.84 ? 2 : r < 0.95 ? 3 : 4;
  }

  private score(g: { home: number; away: number }, r: { home: number; away: number }): number {
    if (g.home === r.home && g.away === r.away) return 10;
    return Math.sign(g.home - g.away) === Math.sign(r.home - r.away) ? 5 : 0;
  }

  get verdict(): string {
    if (this.points === 10) return 'Resultado exacto';
    if (this.points === 5) return 'Has acertado el ganador';
    if (this.points === 0) return 'Esta vez no';
    return '';
  }
}
