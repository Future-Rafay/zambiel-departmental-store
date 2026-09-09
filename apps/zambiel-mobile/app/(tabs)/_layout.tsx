import { Tabs } from "expo-router";
import { Home, Search, ShoppingBag, Package, UserRound, type LucideIcon } from "lucide-react-native";
import type { ColorValue } from "react-native";
import { useApp } from "../../src/app-state";
import { colors } from "../../src/theme";
import { t } from "../../src/i18n";
export default function TabsLayout() {
  const { locale, cart } = useApp(); const c = t(locale);
  const icon = (Icon: LucideIcon) => ({ color, size }: { color: ColorValue; size: number }) => <Icon color={color} size={size} strokeWidth={2}/>;
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted, tabBarStyle: { height: 66, paddingTop: 6, paddingBottom: 8, backgroundColor: colors.surface, borderTopColor: colors.border }, tabBarLabelStyle: { fontFamily: "Inter_600SemiBold", fontSize: 11 } }}><Tabs.Screen name="index" options={{ title: c.home, tabBarIcon: icon(Home) }}/><Tabs.Screen name="shop" options={{ title: c.shop, tabBarIcon: icon(Search) }}/><Tabs.Screen name="cart" options={{ title: c.cart, tabBarBadge: cart.length ? cart.reduce((n,x)=>n+x.quantity,0) : undefined, tabBarIcon: icon(ShoppingBag) }}/><Tabs.Screen name="orders" options={{ title: c.orders, tabBarIcon: icon(Package) }}/><Tabs.Screen name="account" options={{ title: c.account, tabBarIcon: icon(UserRound) }}/></Tabs>;
}
