import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'tn.rfr.tunis',
  appName: 'قطار RFR تونس',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
