import { Archivo_700Bold } from "@expo-google-fonts/archivo/700Bold";
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { useFonts } from "expo-font";
import { Stack, router } from "expo-router";
import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AppProvider, useCart, useLocale } from "../src/app-state";
import { orderNumberFromLink } from "../src/commerce";
import { colors } from "../src/theme";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ShoppingBag } from "lucide-react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 1,
      refetchOnReconnect: true,
    },
  },
});
export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Archivo_700Bold,
  });
  useEffect(() => {
    const open = (url?: string | null, orderNumber?: unknown) => {
      const number = url
        ? orderNumberFromLink(url)
        : typeof orderNumber === "string" && /^ZAM-\d+$/.test(orderNumber)
          ? orderNumber
          : null;
      if (number) router.push(`/order/${number}`);
    };
    Linking.getInitialURL().then(open);
    const link = Linking.addEventListener("url", ({ url }) => open(url));
    const notification = Notifications.addNotificationResponseReceivedListener(
      (event) => {
        const data = event.notification.request.content.data;
        open(
          typeof data?.url === "string" ? data.url : null,
          data?.orderNumber,
        );
      },
    );
    return () => {
      link.remove();
      notification.remove();
    };
  }, []);
  if (!fontsLoaded)
    return (
      <View style={rootStyles.loading}>
        <StatusBar style="dark" />
        <Text style={rootStyles.loadingMark}>Zambiel</Text>
      </View>
    );
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AppProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </AppProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
function RootNavigator() {
  const { locale } = useLocale();
  const de = locale === "de";
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.primary,
        headerTitleStyle: { fontFamily: "Archivo_700Bold" },
        contentStyle: { backgroundColor: colors.background },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="product/[slug]"
        options={{
          title: de ? "Produkt" : "Product",
          headerRight: () => <CartHeaderButton />,
        }}
      />
      <Stack.Screen
        name="checkout"
        options={{ title: de ? "Kasse" : "Checkout" }}
      />
      <Stack.Screen
        name="auth"
        options={{ title: de ? "Konto" : "Account", presentation: "modal" }}
      />
      <Stack.Screen
        name="addresses"
        options={{ title: de ? "Adressen" : "Addresses" }}
      />
      <Stack.Screen
        name="wishlist"
        options={{ title: de ? "Wunschliste" : "Wishlist" }}
      />
      <Stack.Screen
        name="order/[orderNumber]"
        options={{ title: de ? "Bestellung" : "Order" }}
      />
      <Stack.Screen
        name="support"
        options={{ title: de ? "Hilfe & Rechtliches" : "Help & legal" }}
      />
    </Stack>
  );
}
function CartHeaderButton() {
  const { cart } = useCart();
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Cart"
      onPress={() => router.push("/(tabs)/cart")}
      style={{
        width: 48,
        height: 48,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ShoppingBag size={22} color={colors.primary} />
      {count ? (
        <View style={rootStyles.badge}>
          <Text style={rootStyles.badgeText}>{Math.min(count, 99)}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
const rootStyles = StyleSheet.create({
  badge: {
    position: "absolute",
    right: 2,
    top: 3,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.danger,
  },
  badgeText: { color: colors.surface, fontSize: 10, fontWeight: "700" },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  loadingMark: { fontSize: 28, fontWeight: "700", color: colors.primary },
});
