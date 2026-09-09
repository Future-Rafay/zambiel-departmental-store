import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { api } from "../../src/api";
import { useApp } from "../../src/app-state";
import { money, statusLabel } from "../../src/commerce";
import { t } from "../../src/i18n";
import type { Order } from "../../src/types";
import { Empty, Header, Screen } from "../../src/ui";
import { colors, space } from "../../src/theme";

export default function OrdersScreen() {
  const { user, locale } = useApp(); const copy = t(locale); const [orders, setOrders] = useState<Order[]>([]); const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      if (user) setOrders(await api.orders());
      else {
        const stored = JSON.parse(await AsyncStorage.getItem("guestOrders") || "[]") as Order[];
        const refreshed = await Promise.all(stored.map(async (order) => { const token = await AsyncStorage.getItem("order:" + order.orderNumber); return api.order(order.orderNumber, token || undefined).catch(() => order); }));
        setOrders(refreshed); await AsyncStorage.setItem("guestOrders", JSON.stringify(refreshed));
      }
    } finally { setRefreshing(false); }
  }, [user]);
  useFocusEffect(useCallback(() => { load().catch(() => undefined); }, [load]));
  return <Screen><Header title={copy.orders}/><FlatList data={orders} keyExtractor={(item) => item.orderNumber} refreshing={refreshing} onRefresh={() => load().catch(() => undefined)} contentContainerStyle={{ padding: space.md, gap: space.sm }} ListEmptyComponent={<Empty>{locale === "de" ? "Noch keine Bestellungen." : "No orders yet."}</Empty>} renderItem={({ item }) => <Pressable accessibilityRole="button" onPress={() => router.push(`/order/${item.orderNumber}`)} style={({ pressed }) => ({ minHeight: 88, padding: 16, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, opacity: pressed ? .7 : 1 })}><View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={{ fontFamily: "Archivo_700Bold", fontSize: 17, color: colors.text }}>{item.orderNumber}</Text><Text style={{ fontFamily: "Inter_600SemiBold", color: colors.primary }}>{money(item.totalRappen, locale)}</Text></View><Text style={{ marginTop: 8, color: colors.muted }}>{statusLabel(item.status, locale)} · {new Date(item.createdAt).toLocaleDateString(locale === "de" ? "de-CH" : "en-CH")}</Text></Pressable>}/></Screen>;
}
