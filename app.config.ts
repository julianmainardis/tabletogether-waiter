import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Mobile Waiter",
  slug: "mobile-waiter",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  scheme: "mobile-waiter",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff"
  },
  assetBundlePatterns: [
    "**/*"
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.gastronflow.mobilewaiter",
    buildNumber: "1",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false
    }
  },
  android: {
    package: "com.gastronflow.mobilewaiter",
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff"
    }
  },
  web: {
    favicon: "./assets/favicon.png",
    bundler: "metro"
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL || "https://table-together-backend-production.up.railway.app",
    frontendUrl: process.env.EXPO_PUBLIC_FRONTEND_URL || "https://table-together-client-production.up.railway.app",
    eas: {
      projectId: "ba34d3f9-b337-4215-9230-b453aba0b3b0"
    }
  },
  owner: "jmainardis",
  eas: {
    projectId: "ba34d3f9-b337-4215-9230-b453aba0b3b0"
  },
  plugins: [
    "expo-router"
  ]
} as any);
