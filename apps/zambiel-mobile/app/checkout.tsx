import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { api } from "../src/api";
import { useApp } from "../src/app-state";
import { money, paymentForFulfillment } from "../src/commerce";
import type { Address, CheckoutInput, Country, Quote } from "../src/types";
import { Button, Field } from "../src/ui";
import { colors, space } from "../src/theme";
import { subscribeToOrders } from "../src/notifications";

export default function CheckoutScreen() {
  const { cart, clear, user, locale } = useApp();
  const [name, setName] = useState(user?.name || ""); const [email, setEmail] = useState(user?.email || ""); const [phone, setPhone] = useState(user?.phone || "");
  const [street, setStreet] = useState(""); const [streetExtra, setStreetExtra] = useState(""); const [city, setCity] = useState(""); const [countryCode, setCountry] = useState("CH");
  const [countries, setCountries] = useState<Country[]>([]); const [addresses, setAddresses] = useState<Address[]>([]); const [selectedAddress, setSelectedAddress] = useState("");
  const [fulfillment, setFulfillment] = useState<"DELIVERY" | "PICKUP">("DELIVERY"); const [payment, setPayment] = useState<CheckoutInput["paymentMethod"]>("STRIPE"); const [quote, setQuote] = useState<Quote | null>(null); const [busy, setBusy] = useState(false);
  useEffect(() => { api.config().then((value) => setCountries(value.countries)).catch(() => undefined); }, []);
  useEffect(() => { if (user) api.addresses().then((values) => { setAddresses(values); const value = values.find((item) => item.isDefault) || values[0]; if (value) chooseAddress(value); }).catch(() => undefined); }, [user]);
  const chooseAddress = (value: Address) => { setSelectedAddress(value.id); setName(value.recipientName); setPhone(value.phone); setStreet(value.street); setStreetExtra(value.streetExtra || ""); setCity(value.city); setCountry(value.countryCode); };
  const chooseFulfillment = (value: "DELIVERY" | "PICKUP") => { setFulfillment(value); setPayment((current) => paymentForFulfillment(current, value)); };
  const address = useMemo(() => fulfillment === "DELIVERY" ? { recipientName: name, phone, street, streetExtra: streetExtra || null, city, countryCode } : undefined, [fulfillment, name, phone, street, streetExtra, city, countryCode]);
  const input = (): CheckoutInput => ({ checkoutKey: Crypto.randomUUID(), channel: "mobile", locale, fulfillmentType: fulfillment, countryCode: fulfillment === "DELIVERY" ? countryCode : undefined, items: cart.map((item) => ({ variantId: item.variantId, quantity: item.quantity })), customerName: name, customerEmail: email, customerPhone: phone, paymentMethod: payment, address });
  const submit = async () => {
    if (!name || !email.includes("@") || !phone || !cart.length || (fulfillment === "DELIVERY" && (!street || !city))) return Alert.alert(locale === "de" ? "Bitte alle Pflichtfelder ausfüllen." : "Complete all required fields.");
    setBusy(true);
    try {
      const receipt = await api.checkout(input());
      if (receipt.trackingToken) await AsyncStorage.setItem("order:" + receipt.orderNumber, receipt.trackingToken);
      if (!user) { const old = JSON.parse(await AsyncStorage.getItem("guestOrders") || "[]"); await AsyncStorage.setItem("guestOrders", JSON.stringify([{ orderNumber: receipt.orderNumber, status: "PAYMENT_PENDING", paymentMethod: payment, fulfillmentType: fulfillment, createdAt: new Date().toISOString(), customerName: name, totalRappen: quote?.totalRappen ?? 0, subtotalRappen: quote?.subtotalRappen ?? 0, discountRappen: quote?.discountRappen ?? 0, deliveryFeeRappen: quote?.deliveryFeeRappen ?? 0, items: [], timeline: [] }, ...old])); }
      if (!user && receipt.trackingToken) void subscribeToOrders(locale, receipt.orderNumber, receipt.trackingToken).catch(() => undefined);
      clear(); if (receipt.checkoutUrl) await WebBrowser.openBrowserAsync(receipt.checkoutUrl); router.replace("/order/" + receipt.orderNumber);
    } catch (cause) { Alert.alert(locale === "de" ? "Bestellung fehlgeschlagen" : "Order failed", String((cause as Error).message)); }
    finally { setBusy(false); }
  };
  const Choice = ({ value, current, set, label }: { value: string; current: string; set: (value: any) => void; label: string }) => <Pressable accessibilityRole="radio" accessibilityState={{ selected: value === current }} onPress={() => set(value)} style={{ minHeight: 48, justifyContent: "center", paddingHorizontal: 14, borderRadius: 12, borderWidth: 2, borderColor: value === current ? colors.primary : colors.border, backgroundColor: colors.surface }}><Text>{label}</Text></Pressable>;
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.md, gap: space.md }}>
    <Text accessibilityRole="header" style={{ fontFamily: "Archivo_700Bold", fontSize: 22 }}>Checkout</Text>
    <View accessibilityRole="radiogroup" style={{ flexDirection: "row", gap: 8 }}><Choice value="DELIVERY" current={fulfillment} set={chooseFulfillment} label={locale === "de" ? "Lieferung" : "Delivery"}/><Choice value="PICKUP" current={fulfillment} set={chooseFulfillment} label={locale === "de" ? "Abholung" : "Pickup"}/></View>
    {fulfillment === "DELIVERY" && addresses.length ? <View accessibilityRole="radiogroup" style={{ gap: 8 }}><Text style={{ fontFamily: "Inter_600SemiBold" }}>{locale === "de" ? "Gespeicherte Adresse" : "Saved address"}</Text>{addresses.map((item) => <Choice key={item.id} value={item.id} current={selectedAddress} set={() => chooseAddress(item)} label={item.label + " · " + item.street + ", " + item.city}/>)}</View> : null}
    <Field label="Name" value={name} onChangeText={setName}/><Field label="E-Mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none"/><Field label={locale === "de" ? "Telefon" : "Phone"} value={phone} onChangeText={setPhone} keyboardType="phone-pad"/>
    {fulfillment === "DELIVERY" ? <><Field label={locale === "de" ? "Strasse" : "Street"} value={street} onChangeText={setStreet}/><Field label={locale === "de" ? "Adresszusatz" : "Address line 2"} value={streetExtra} onChangeText={setStreetExtra}/><Field label={locale === "de" ? "Ort" : "City"} value={city} onChangeText={setCity}/><View accessibilityRole="radiogroup" style={{ gap: 8 }}>{countries.map((item) => <Choice key={item.countryCode} value={item.countryCode} current={countryCode} set={setCountry} label={locale === "de" ? item.nameDe : item.nameEn}/>)}</View></> : null}
    <View accessibilityRole="radiogroup" style={{ gap: 8 }}><Choice value="STRIPE" current={payment} set={setPayment} label={locale === "de" ? "Karte / Stripe" : "Card / Stripe"}/><Choice value={fulfillment === "DELIVERY" ? "CASH_ON_DELIVERY" : "PAY_AT_PICKUP"} current={payment} set={setPayment} label={locale === "de" ? "Bar bezahlen" : "Pay in cash"}/></View>
    <Button kind="secondary" onPress={() => api.quote(input()).then(setQuote).catch((cause) => Alert.alert(String(cause.message)))}>{locale === "de" ? "Gesamt berechnen" : "Calculate total"}</Button>
    {quote ? <Text style={{ fontFamily: "Archivo_700Bold", fontSize: 21, color: colors.primary }}>{money(quote.totalRappen, locale)}</Text> : null}
    <Button disabled={busy} onPress={submit}>{locale === "de" ? "Zahlungspflichtig bestellen" : "Place order"}</Button>
  </ScrollView>;
}
