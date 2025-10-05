import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aitarotchat.app',
  appName: 'mobile',
  webDir: 'dist',
  plugins: {
    CapacitorHttp: {
      enabled: true
    },
    Keyboard: {
      resize: 'scroll',
      resizeOnFullScreen: true
    }
  }
};

export default config;
