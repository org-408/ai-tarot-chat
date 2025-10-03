import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aitarotchat.app',
  appName: 'mobile',
  webDir: 'dist',
  plugins: {
    CapacitorHttp: {
      enabled: true
    }
  }
};

export default config;
