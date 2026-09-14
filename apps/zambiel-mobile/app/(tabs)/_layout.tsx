import { Tabs } from "expo-router";
import { Home, Search, ShoppingBag, Package, UserRound, type LucideIcon } from "lucide-react-native";
import type { ColorValue } from "react-native";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/app-state";
import { colors, radius, space } from "../../src/theme";
import { t } from "../../src/i18n";
export default function TabsLayout() {
  const { locale, cart } = useApp(); const c = t(locale);
  const insets = useSafeAreaInsets();
  const icon = (Icon: LucideIcon) => ({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) => <View style={{ width: 40, height: 30, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: focused ? colors.surfaceMuted : "transparent" }}><Icon color={color} size={size} strokeWidth={focused ? 2.4 : 1.9}/></View>;
  return <Tabs screenOptions={{ headerShown: false, tabBarHideOnKeyboard: true, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted, tabBarStyle: { height: 62 + insets.bottom, paddingTop: space.xs, paddingBottom: Math.max(insets.bottom, 6), backgroundColor: colors.surface, borderTopColor: colors.border }, tabBarItemStyle: { minHeight: 52 }, tabBarLabelStyle: { fontFamily: "Inter_600SemiBold", fontSize: 11, lineHeight: 14 }, tabBarBadgeStyle: { minWidth: 18, height: 18, lineHeight: 17, borderRadius: 9, backgroundColor: colors.danger, color: colors.surface, fontFamily: "Inter_600SemiBold", fontSize: 10 } }}><Tabs.Screen name="index" options={{ title: c.home, tabBarIcon: icon(Home) }}/><Tabs.Screen name="shop" options={{ title: locale === "de" ? "Entdecken" : "Discover", tabBarIcon: icon(Search) }}/><Tabs.Screen name="cart" options={{ title: c.cart, tabBarBadge: cart.length ? cart.reduce((n,x)=>n+x.quantity,0) : undefined, tabBarIcon: icon(ShoppingBag) }}/><Tabs.Screen name="orders" options={{ title: c.orders, tabBarIcon: icon(Package) }}/><Tabs.Screen name="account" options={{ title: c.account, tabBarIcon: icon(UserRound) }}/></Tabs>;
}
