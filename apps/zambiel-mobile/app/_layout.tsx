import { Archivo_700Bold, useFonts as useArchivo } from "@expo-google-fonts/archivo";
import { Inter_400Regular, Inter_600SemiBold, useFonts as useInter } from "@expo-google-fonts/inter";
import { Stack, router } from "expo-router";
import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AppProvider } from "../src/app-state";
import { orderNumberFromLink } from "../src/commerce";
import { colors } from "../src/theme";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }) });
GoogleSignin.configure({ webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID });
export default function RootLayout() {
  const [inter] = useInter({ Inter_400Regular, Inter_600SemiBold }); const [archivo] = useArchivo({ Archivo_700Bold });
  useEffect(() => { const open = (url?: string | null, orderNumber?: unknown) => { const number = url ? orderNumberFromLink(url) : typeof orderNumber === "string" && /^ZAM-\d+$/.test(orderNumber) ? orderNumber : null; if (number) router.push(`/order/${number}`); }; Linking.getInitialURL().then(open); const link = Linking.addEventListener("url", ({ url }) => open(url)); const notification = Notifications.addNotificationResponseReceivedListener((event) => { const data = event.notification.request.content.data; open(typeof data?.url === "string" ? data.url : null, data?.orderNumber); }); return () => { link.remove(); notification.remove(); }; }, []);
  if (!inter || !archivo) return null;
  return <SafeAreaProvider><AppProvider><StatusBar style="dark"/><Stack screenOptions={{ headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.primary, headerTitleStyle: { fontFamily: "Archivo_700Bold" }, contentStyle: { backgroundColor: colors.background } }}><Stack.Screen name="(tabs)" options={{ headerShown: false }}/><Stack.Screen name="product/[slug]" options={{ title: "Product" }}/><Stack.Screen name="checkout" options={{ title: "Checkout" }}/><Stack.Screen name="auth" options={{ title: "Account", presentation: "modal" }}/><Stack.Screen name="addresses" options={{ title: "Addresses" }}/><Stack.Screen name="wishlist" options={{ title: "Wishlist" }}/><Stack.Screen name="order/[orderNumber]" options={{ title: "Order" }}/><Stack.Screen name="support" options={{ title: "Help & legal" }}/></Stack></AppProvider></SafeAreaProvider>;
}
