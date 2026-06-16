import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  appId: 'com.playfutbet.app',
  appName: 'PlayFutBet',
  webDir: 'www',
  plugins: {
    Keyboard: {
      // Reduce el viewport nativo al abrir el teclado (mejor para el chat)
      resize: KeyboardResize.Native,
    },
  },
};

export default config;
