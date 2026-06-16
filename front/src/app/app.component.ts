import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { Capacitor } from '@capacitor/core';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {
  ngOnInit() {
    if (Capacitor.isNativePlatform()) {
      this.initNative();
    }
  }

  /** Ajustes específicos de la app nativa (Android/iOS). */
  private async initNative() {
    try {
      // Status bar: fondo blanco con iconos oscuros (el header de la app es claro)
      const { StatusBar, Style } = await import('@capacitor/status-bar');
      await StatusBar.setStyle({ style: Style.Light }); // Style.Light = contenido oscuro
      if (Capacitor.getPlatform() === 'android') {
        await StatusBar.setBackgroundColor({ color: '#ffffff' });
        await StatusBar.setOverlaysWebView({ overlay: false });
      }
    } catch { /* plugin no disponible en este entorno */ }

    try {
      // Botón físico "atrás" de Android: navegar atrás o salir si no hay historial
      const { App } = await import('@capacitor/app');
      App.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back();
        } else {
          App.exitApp();
        }
      });
    } catch { /* plugin no disponible */ }
  }
}
