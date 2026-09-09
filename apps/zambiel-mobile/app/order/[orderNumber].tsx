import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useState } from "react";
import { Alert, AppState, Image, ScrollView, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { api } from "../../src/api";
import { useApp } from "../../src/app-state";
import { money, statusLabel } from "../../src/commerce";
import type { Order } from "../../src/types";
import { Button, Empty } from "../../src/ui";
import { colors, space } from "../../src/theme";

export default function OrderScreen() {
  const { orderNumber } = useLocalSearchParams<{ orderNumber: string }>();
  const { add, locale, user } = useApp();
  const [order, setOrder] = useState<Order | null>(null); const [error, setError] = useState("");
  const load = useCallback(async () => { const token = await AsyncStorage.getItem("order:" + orderNumber); api.order(orderNumber, token || undefined).then(setOrder).catch((cause) => setError(String(cause.message))); }, [orderNumber]);
  useFocusEffect(useCallback(() => { load(); const timer = setInterval(load, 10_000); return () => clearInterval(timer); }, [load]));
  useEffect(() => { const subscription = AppState.addEventListener("change", (state) => state === "active" && load()); return () => subscription.remove(); }, [load]);
  if (!order) return <Empty>{error || "Loading…"}</Empty>;
  const reorder = async () => {
    if (!user) return router.push("/auth");
    try {
      const result = await api.reorder(orderNumber);
      const lines = result.items.flatMap((item) => item.available && item.variantId && item.productId && item.slug && item.currentPriceRappen !== null ? [{ variantId: item.variantId, productId: item.productId, slug: item.slug, name: (locale === "de" ? item.nameDe : item.nameEn) || "", variant: (locale === "de" ? item.variantDe : item.variantEn) || "", imageUrl: item.imageUrl, priceRappen: item.currentPriceRappen, quantity: item.quantity }] : []);
      if (!lines.length) return Alert.alert(locale === "de" ? "Keine Artikel mehr verfügbar." : "No items are still available.");
      add(lines); router.push("/(tabs)/cart");
    } catch (cause) { Alert.alert(locale === "de" ? "Erneut bestellen fehlgeschlagen" : "Could not reorder", String((cause as Error).message)); }
  };
  const resumePayment = async () => {
    try { const token = await AsyncStorage.getItem("order:" + orderNumber); const result = await api.resumePayment(orderNumber, token || undefined); if (result.checkoutUrl) await WebBrowser.openBrowserAsync(result.checkoutUrl); await load(); }
    catch (cause) { Alert.alert(locale === "de" ? "Zahlung konnte nicht geöffnet werden" : "Could not open payment", String((cause as Error).message)); }
  };
  return <ScrollView contentContainerStyle={{ padding: space.md, gap: space.lg }}>
    <View style={{ padding: 20, borderRadius: 16, backgroundColor: colors.primary, borderBottomWidth: 4, borderBottomColor: colors.accent }}><Text style={{ color: colors.surface, opacity: .8 }}>{order.orderNumber}</Text><Text accessibilityRole="header" style={{ fontFamily: "Archivo_700Bold", fontSize: 28, color: colors.surface, marginTop: 6 }}>{statusLabel(order.status, locale)}</Text><Text style={{ fontFamily: "Archivo_700Bold", fontSize: 20, color: colors.surface, marginTop: 10 }}>{money(order.totalRappen, locale)}</Text></View>
    <View>{order.timeline.map((item, index) => <View key={item.status + "-" + item.at} style={{ flexDirection: "row", gap: 12, minHeight: 56 }}><View style={{ alignItems: "center" }}><View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: colors.success }}/>{index < order.timeline.length - 1 ? <View style={{ width: 2, flex: 1, backgroundColor: colors.border }}/> : null}</View><View><Text style={{ fontFamily: "Inter_600SemiBold", color: colors.text }}>{statusLabel(item.status, locale)}</Text><Text style={{ color: colors.muted, marginTop: 2 }}>{new Date(item.at).toLocaleString(locale === "de" ? "de-CH" : "en-CH")}</Text></View></View>)}</View>
    {order.items.map((item) => <View key={item.id} style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>{item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={{ width: 56, height: 56, borderRadius: 8 }}/> : null}<View style={{ flex: 1 }}><Text style={{ fontFamily: "Inter_600SemiBold" }}>{item.quantity} × {item.name}</Text><Text style={{ color: colors.muted }}>{item.variant}</Text></View><Text>{money(item.lineSubtotalRappen, locale)}</Text></View>)}
    {order.status === "PAYMENT_PENDING" && order.paymentMethod === "STRIPE" ? <Button onPress={resumePayment}>{locale === "de" ? "Zahlung fortsetzen" : "Resume payment"}</Button> : null}
    <Button kind="secondary" onPress={reorder}>{locale === "de" ? "Erneut bestellen" : "Order again"}</Button>
  </ScrollView>;
}
