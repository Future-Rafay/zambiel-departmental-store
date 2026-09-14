import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Zambiel", slug: "zambiel-mobile", version: "1.0.0", scheme: "zambiel", orientation: "default", userInterfaceStyle: "light",
  androidStatusBar: { backgroundColor: "#FFFFFF", barStyle: "dark-content", translucent: false },  android: { package: "ch.zambiel.customer", versionCode: 1, ...(process.env.GOOGLE_SERVICES_JSON ? { googleServicesFile: process.env.GOOGLE_SERVICES_JSON } : {}) },
  plugins: ["expo-router", "expo-secure-store", "expo-font", "expo-web-browser", ["expo-notifications", { color: "#153B35" }], "@react-native-google-signin/google-signin"],
  extra: { ...(process.env.EXPO_PUBLIC_EAS_PROJECT_ID ? { eas: { projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID } } : {}) },
};
export default config;
