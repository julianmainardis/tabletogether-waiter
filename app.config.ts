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
    buildNumber: "1"
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
    apiUrl: process.env.EXPO_PUBLIC_API_URL || "https://gastron-flow-backend.vercel.app/api",
    frontendUrl: process.env.EXPO_PUBLIC_FRONTEND_URL || "https://grupo-gastron-flow.vercel.app",
    eas: {
      projectId: "1edfa3ff-5b7e-410f-be06-b590e00b50fa"
    }
  },
  owner: "julianmainardis",
  eas: {
    projectId: "1edfa3ff-5b7e-410f-be06-b590e00b50fa"
  },
  plugins: [
    "expo-router"
  ]
});
