import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.coruscant.horizon',
  appName: 'Корускант · Горизонт',
  webDir: 'dist',
  backgroundColor: '#06090f',
  server: {
    androidScheme: 'https',
  },
  android: {
    backgroundColor: '#06090f',
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
    buildOptions: {
      releaseType: 'APK',
    },
  },
};

export default config;
