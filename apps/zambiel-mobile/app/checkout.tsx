import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../src/api";
import { useApp } from "../src/app-state";
import { money, paymentForFulfillment } from "../src/commerce";
import { subscribeToOrders } from "../src/notifications";
import { colors, radius, space, typography } from "../src/theme";
import type { Address, CheckoutInput, Country, Quote } from "../src/types";
import { Button, Field } from "../src/ui";

export default function CheckoutScreen() {
  const { bottom } = useSafeAreaInsets();
  const { cart, clear, user, locale } = useApp();
  const [checkoutKey] = useState(() => Crypto.randomUUID());
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [street, setStreet] = useState("");
  const [streetExtra, setStreetExtra] = useState("");
  const [city, setCity] = useState("");
  const [countryCode, setCountry] = useState("CH");
  const [countries, setCountries] = useState<Country[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [fulfillment, setFulfillment] = useState<"DELIVERY" | "PICKUP">(
    "DELIVERY",
  );
  const [payment, setPayment] =
    useState<CheckoutInput["paymentMethod"]>("STRIPE");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quotedSignature, setQuotedSignature] = useState("");
  const [quoteError, setQuoteError] = useState("");
  const [quoting, setQuoting] = useState(false);
  const [busy, setBusy] = useState(false);
  const signatureRef = useRef("");

  useEffect(() => {
    api
      .config()
      .then((value) => setCountries(value.countries))
      .catch(() =>
        setQuoteError(
          locale === "de"
            ? "Lieferoptionen konnten nicht geladen werden."
            : "Delivery options could not be loaded.",
        ),
      );
  }, [locale]);
  useEffect(() => {
    if (user)
      api
        .addresses()
        .then((values) => {
          setAddresses(values);
          const value = values.find((item) => item.isDefault) || values[0];
          if (value) chooseAddress(value);
        })
        .catch(() => undefined);
  }, [user]);
  const chooseAddress = (value: Address) => {
    setSelectedAddress(value.id);
    setName(value.recipientName);
    setPhone(value.phone);
    setStreet(value.street);
    setStreetExtra(value.streetExtra || "");
    setCity(value.city);
    setCountry(value.countryCode);
  };
  const chooseFulfillment = (value: "DELIVERY" | "PICKUP") => {
    setFulfillment(value);
    setPayment((current) => paymentForFulfillment(current, value));
  };
  const address = useMemo(
    () =>
      fulfillment === "DELIVERY"
        ? {
            recipientName: name,
            phone,
            street,
            streetExtra: streetExtra || null,
            city,
            countryCode,
          }
        : undefined,
    [fulfillment, name, phone, street, streetExtra, city, countryCode],
  );
  const checkoutInput = useMemo<CheckoutInput>(
    () => ({
      checkoutKey,
      channel: "mobile",
      locale,
      fulfillmentType: fulfillment,
      countryCode: fulfillment === "DELIVERY" ? countryCode : undefined,
      items: cart.map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity,
      })),
      customerName: name,
      customerEmail: email,
      customerPhone: phone,
      paymentMethod: payment,
      address,
    }),
    [
      checkoutKey,
      locale,
      fulfillment,
      countryCode,
      cart,
      name,
      email,
      phone,
      payment,
      address,
    ],
  );
  const quoteSignature = useMemo(
    () =>
      JSON.stringify({
        locale,
        fulfillment,
        countryCode: fulfillment === "DELIVERY" ? countryCode : null,
        payment,
        items: checkoutInput.items,
        address,
      }),
    [locale, fulfillment, countryCode, payment, checkoutInput.items, address],
  );
  signatureRef.current = quoteSignature;
  const quoteCurrent = !!quote && quotedSignature === quoteSignature;
  const valid =
    !!name &&
    email.includes("@") &&
    !!phone &&
    !!cart.length &&
    (fulfillment !== "DELIVERY" || (!!street && !!city));

  const calculate = async () => {
    const requestedSignature = quoteSignature;
    setQuoting(true);
    setQuoteError("");
    try {
      const value = await api.quote(checkoutInput);
      if (signatureRef.current === requestedSignature) {
        setQuote(value);
        setQuotedSignature(requestedSignature);
      }
    } catch (cause) {
      if (signatureRef.current === requestedSignature) {
        setQuote(null);
        setQuotedSignature("");
        setQuoteError(String((cause as Error).message));
      }
    } finally {
      if (signatureRef.current === requestedSignature) setQuoting(false);
    }
  };
  const submit = async () => {
    if (!valid)
      return Alert.alert(
        locale === "de"
          ? "Bitte alle Pflichtfelder ausfüllen."
          : "Complete all required fields.",
      );
    if (!quoteCurrent)
      return setQuoteError(
        locale === "de"
          ? "Bitte den aktuellen Gesamtbetrag zuerst prüfen."
          : "Review the current total before placing the order.",
      );
    setBusy(true);
    try {
      const receipt = await api.checkout(checkoutInput);
      if (receipt.trackingToken)
        await AsyncStorage.setItem(
          "order:" + receipt.orderNumber,
          receipt.trackingToken,
        );
      if (!user) {
        const old = JSON.parse(
          (await AsyncStorage.getItem("guestOrders")) || "[]",
        );
        await AsyncStorage.setItem(
          "guestOrders",
          JSON.stringify([
            {
              orderNumber: receipt.orderNumber,
              status: "PAYMENT_PENDING",
              paymentMethod: payment,
              fulfillmentType: fulfillment,
              createdAt: new Date().toISOString(),
              customerName: name,
              totalRappen: quote!.totalRappen,
              subtotalRappen: quote!.subtotalRappen,
              discountRappen: quote!.discountRappen,
              deliveryFeeRappen: quote!.deliveryFeeRappen,
              items: [],
              timeline: [],
            },
            ...old,
          ]),
        );
      }
      if (!user && receipt.trackingToken)
        void subscribeToOrders(
          locale,
          receipt.orderNumber,
          receipt.trackingToken,
        ).catch(() => undefined);
      clear();
      if (receipt.checkoutUrl)
        await WebBrowser.openBrowserAsync(receipt.checkoutUrl);
      router.replace("/order/" + receipt.orderNumber);
    } catch (cause) {
      Alert.alert(
        locale === "de" ? "Bestellung fehlgeschlagen" : "Order failed",
        String((cause as Error).message),
      );
    } finally {
      setBusy(false);
    }
  };
  const Choice = ({
    value,
    current,
    set,
    label,
  }: {
    value: string;
    current: string;
    set: (value: string) => void;
    label: string;
  }) => (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: value === current }}
      onPress={() => set(value)}
      style={({ pressed }) => ({
        minHeight: 48,
        justifyContent: "center",
        paddingHorizontal: 14,
        borderRadius: radius.control,
        borderWidth: value === current ? 2 : 1,
        borderColor: value === current ? colors.primary : colors.border,
        backgroundColor:
          value === current ? colors.primarySoft : colors.surface,
        opacity: pressed ? 0.78 : 1,
      })}
    >
      <Text style={typography.label}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: space.md,
          gap: space.md,
          paddingBottom: 164 + bottom,
        }}
      >
        <Text accessibilityRole="header" style={typography.heading}>
          {locale === "de" ? "Kasse" : "Checkout"}
        </Text>
        <Text style={typography.bodyMuted}>
          {locale === "de"
            ? "Lieferung, Zahlung und Gesamtbetrag sicher prüfen."
            : "Review delivery, payment, and your current total."}
        </Text>
        <View
          accessibilityRole="radiogroup"
          style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
        >
          <Choice
            value="DELIVERY"
            current={fulfillment}
            set={(value) => chooseFulfillment(value as typeof fulfillment)}
            label={locale === "de" ? "Lieferung" : "Delivery"}
          />
          <Choice
            value="PICKUP"
            current={fulfillment}
            set={(value) => chooseFulfillment(value as typeof fulfillment)}
            label={locale === "de" ? "Abholung" : "Pickup"}
          />
        </View>
        {fulfillment === "DELIVERY" && addresses.length ? (
          <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
            <Text style={typography.label}>
              {locale === "de" ? "Gespeicherte Adresse" : "Saved address"}
            </Text>
            {addresses.map((item) => (
              <Choice
                key={item.id}
                value={item.id}
                current={selectedAddress}
                set={() => chooseAddress(item)}
                label={item.label + " · " + item.street + ", " + item.city}
              />
            ))}
          </View>
        ) : null}
        <Field label="Name" value={name} onChangeText={setName} />
        <Field
          label="E-Mail"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Field
          label={locale === "de" ? "Telefon" : "Phone"}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        {fulfillment === "DELIVERY" ? (
          <>
            <Field
              label={locale === "de" ? "Strasse" : "Street"}
              value={street}
              onChangeText={setStreet}
            />
            <Field
              label={locale === "de" ? "Adresszusatz" : "Address line 2"}
              value={streetExtra}
              onChangeText={setStreetExtra}
            />
            <Field
              label={locale === "de" ? "Ort" : "City"}
              value={city}
              onChangeText={setCity}
            />
            <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
              {countries.map((item) => (
                <Choice
                  key={item.countryCode}
                  value={item.countryCode}
                  current={countryCode}
                  set={setCountry}
                  label={locale === "de" ? item.nameDe : item.nameEn}
                />
              ))}
            </View>
          </>
        ) : null}
        <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
          <Choice
            value="STRIPE"
            current={payment}
            set={(value) => setPayment(value as CheckoutInput["paymentMethod"])}
            label={locale === "de" ? "Karte / Stripe" : "Card / Stripe"}
          />
          <Choice
            value={
              fulfillment === "DELIVERY" ? "CASH_ON_DELIVERY" : "PAY_AT_PICKUP"
            }
            current={payment}
            set={(value) => setPayment(value as CheckoutInput["paymentMethod"])}
            label={locale === "de" ? "Bar bezahlen" : "Pay in cash"}
          />
        </View>
      </ScrollView>
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: space.md,
          paddingTop: space.sm,
          paddingBottom: Math.max(bottom, space.md),
          gap: space.sm,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        {quoteCurrent ? (
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={typography.label}>
              {locale === "de" ? "Gesamt" : "Total"}
            </Text>
            <Text style={typography.priceLarge}>
              {money(quote.totalRappen, locale)}
            </Text>
          </View>
        ) : (
          <Button
            kind="secondary"
            disabled={quoting || !valid}
            onPress={calculate}
          >
            {quoting
              ? locale === "de"
                ? "Wird berechnet…"
                : "Calculating…"
              : locale === "de"
                ? "Gesamtbetrag prüfen"
                : "Review total"}
          </Button>
        )}
        {quoteError ? (
          <Text
            accessibilityRole="alert"
            style={{ color: colors.danger, fontSize: 13 }}
          >
            {quoteError}
          </Text>
        ) : null}
        <Button disabled={busy || !valid || !quoteCurrent} onPress={submit}>
          {busy
            ? locale === "de"
              ? "Wird bestellt…"
              : "Placing order…"
            : locale === "de"
              ? "Zahlungspflichtig bestellen"
              : "Place order"}
        </Button>
      </View>
    </View>
  );
}
