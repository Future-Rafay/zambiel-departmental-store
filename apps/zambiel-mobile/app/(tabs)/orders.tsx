import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import { router, useFocusEffect } from "expo-router";
import { PackageOpen, RotateCcw, ShoppingBag } from "lucide-react-native";
import { useCallback, useEffect } from "react";
import { ActivityIndicator, AppState, Image, FlatList, Pressable, Text, View } from "react-native";
import { api } from "../../src/api";
import { useApp } from "../../src/app-state";
import { money, statusLabel } from "../../src/commerce";
import { t } from "../../src/i18n";
import { colors, space } from "../../src/theme";
import type { Order } from "../../src/types";
import { Button, Header, Screen } from "../../src/ui";

const terminal = new Set(["DELIVERED", "PICKED_UP", "CANCELLED"]);
async function guestOrders() {
  const stored = JSON.parse(await AsyncStorage.getItem("guestOrders") || "[]") as Order[];
  const refreshed = [...stored];
  for (let start = 0; start < stored.length; start += 3) {
    const batch = await Promise.all(stored.slice(start, start + 3).map(async (order) => {
      if (terminal.has(order.status)) return order;
      const token = await AsyncStorage.getItem("order:" + order.orderNumber);
      return api.order(order.orderNumber, token || undefined).catch(() => order);
    }));
    batch.forEach((order, index) => { refreshed[start + index] = order; });
  }
  await AsyncStorage.setItem("guestOrders", JSON.stringify(refreshed));
  return refreshed;
}

export default function OrdersScreen() {
  const { user, locale } = useApp(); const copy = t(locale);
  const query = useQuery({ queryKey: ["orders", user?.id ?? "guest"], queryFn: () => user ? api.orders() : guestOrders(), staleTime: 30_000 });
  useFocusEffect(useCallback(() => { void query.refetch(); }, [query.refetch]));
  useEffect(() => { const sub = AppState.addEventListener("change", (state) => { if (state === "active") void query.refetch(); }); return () => sub.remove(); }, [query.refetch]);
  const orders = query.data ?? [];
  return <Screen><Header title={copy.orders}/><FlatList
    data={orders}
    keyExtractor={(item) => item.orderNumber}
    refreshing={query.isRefetching && !query.isLoading}
    onRefresh={() => { void query.refetch(); }}
    contentContainerStyle={{ padding: space.md, gap: space.sm, flexGrow: 1 }}
    ListEmptyComponent={query.isLoading ? <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}><ActivityIndicator color={colors.primary}/><Text style={{ color: colors.muted }}>{copy.loading}</Text></View> : query.isError ? <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 }}><RotateCcw size={36} color={colors.primary}/><Text accessibilityRole="header" style={{ fontFamily: "Archivo_700Bold", fontSize: 21, color: colors.text }}>{locale === "de" ? "Bestellungen konnten nicht geladen werden" : "Could not load orders"}</Text><Text accessibilityRole="alert" style={{ color: colors.muted, textAlign: "center" }}>{locale === "de" ? "Prüfe deine Verbindung und versuche es erneut." : "Check your connection and try again."}</Text><Button onPress={() => { void query.refetch(); }}>{copy.retry}</Button></View> : <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 }}><View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}><PackageOpen size={36} color={colors.primary}/></View><Text accessibilityRole="header" style={{ fontFamily: "Archivo_700Bold", fontSize: 23, color: colors.text }}>{locale === "de" ? "Noch keine Bestellungen" : "No orders yet"}</Text><Text style={{ color: colors.muted, textAlign: "center", lineHeight: 22 }}>{locale === "de" ? "Entdecke praktische Produkte und verfolge deine Bestellung später hier." : "Find something useful and track every order here."}</Text><Button onPress={() => router.push("/(tabs)/shop")}><View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><ShoppingBag size={18} color={colors.surface}/><Text style={{ color: colors.surface, fontFamily: "Inter_600SemiBold" }}>{locale === "de" ? "Produkte entdecken" : "Start shopping"}</Text></View></Button></View>}
    renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`${item.orderNumber}, ${statusLabel(item.status, locale)}, ${money(item.totalRappen, locale)}`} onPress={() => router.push(`/order/${item.orderNumber}`)} style={({ pressed }) => ({ minHeight: 108, padding: 16, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, opacity: pressed ? .74 : 1 })}><View style={{ flexDirection: "row", gap: 12 }}>{item.items[0]?.imageUrl ? <Image source={{ uri: item.items[0].imageUrl }} resizeMode="contain" style={{ width: 64, height: 64, borderRadius: 10, backgroundColor: colors.imageBackground }}/>:<View style={{ width: 64, height: 64, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}><ShoppingBag size={24} color={colors.primary}/></View>}<View style={{ flex: 1, gap: 6 }}><View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}><Text style={{ flex: 1, fontFamily: "Archivo_700Bold", fontSize: 17, color: colors.text }}>{item.orderNumber}</Text><Text style={{ fontFamily: "Inter_600SemiBold", color: colors.primary }}>{money(item.totalRappen, locale)}</Text></View><Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>{statusLabel(item.status, locale)}</Text><Text style={{ color: colors.muted }}>{new Date(item.createdAt).toLocaleDateString(locale === "de" ? "de-CH" : "en-CH")} · {item.items.length} {locale === "de" ? "Artikel" : item.items.length === 1 ? "item" : "items"}</Text></View></View></Pressable>}
  /></Screen>;
}
