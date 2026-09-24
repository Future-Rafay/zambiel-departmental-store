import { router } from "expo-router";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react-native";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useApp } from "../../src/app-state";
import { money } from "../../src/commerce";
import { t } from "../../src/i18n";
import { colors, space } from "../../src/theme";
import { Button, Header, Screen } from "../../src/ui";

function QuantityButton({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: pressed ? colors.primarySoft : colors.surface,
        alignItems: "center",
        justifyContent: "center",
      })}
    >
      {children}
    </Pressable>
  );
}

export default function CartScreen() {
  const { cart, update, locale } = useApp();
  const copy = t(locale);
  const total = cart.reduce(
    (sum, item) => sum + item.priceRappen * item.quantity,
    0,
  );
  return (
    <Screen>
      <Header title={copy.cart} />
      {!cart.length ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
            gap: 12,
          }}
        >
          <View
            style={{
              width: 76,
              height: 76,
              borderRadius: 38,
              backgroundColor: colors.primarySoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ShoppingBag size={36} color={colors.primary} />
          </View>
          <Text
            accessibilityRole="header"
            style={{
              fontFamily: "Archivo_700Bold",
              fontSize: 23,
              color: colors.text,
            }}
          >
            {locale === "de" ? "Dein Warenkorb ist leer" : "Your cart is empty"}
          </Text>
          <Text
            style={{ color: colors.muted, textAlign: "center", lineHeight: 22 }}
          >
            {locale === "de"
              ? "Füge Produkte hinzu, um deine Bestellung zu starten."
              : "Add a few products to start your order."}
          </Text>
          <Button onPress={() => router.push("/(tabs)/shop")}>
            {locale === "de" ? "Produkte entdecken" : "Discover products"}
          </Button>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            padding: space.md,
            gap: space.md,
            paddingBottom: space.xl,
          }}
        >
          {cart.map((item) => (
            <View
              key={item.variantId}
              style={{
                backgroundColor: colors.surface,
                padding: 12,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.border,
                gap: 12,
              }}
            >
              <View style={{ flexDirection: "row", gap: 12 }}>
                {item.imageUrl ? (
                  <Image
                    source={{ uri: item.imageUrl }}
                    resizeMode="contain"
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 10,
                      backgroundColor: colors.imageBackground,
                    }}
                  />
                ) : (
                  <View
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 10,
                      backgroundColor: colors.imageBackground,
                    }}
                  />
                )}
                <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                  <Text
                    numberOfLines={2}
                    style={{
                      fontFamily: "Inter_600SemiBold",
                      color: colors.text,
                      lineHeight: 20,
                    }}
                  >
                    {item.name}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{ color: colors.muted, fontSize: 13 }}
                  >
                    {item.variant}
                  </Text>
                  <Text
                    style={{
                      fontFamily: "Archivo_700Bold",
                      color: colors.primary,
                      fontSize: 17,
                    }}
                  >
                    {money(item.priceRappen * item.quantity, locale)}
                  </Text>
                </View>
              </View>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <QuantityButton
                  label={
                    locale === "de" ? "Menge verringern" : "Decrease quantity"
                  }
                  onPress={() => update(item.variantId, item.quantity - 1)}
                >
                  <Minus size={18} color={colors.primary} />
                </QuantityButton>
                <Text
                  accessibilityLabel={`${locale === "de" ? "Menge" : "Quantity"} ${item.quantity}`}
                  style={{
                    minWidth: 28,
                    textAlign: "center",
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 16,
                    color: colors.text,
                  }}
                >
                  {item.quantity}
                </Text>
                <QuantityButton
                  label={
                    locale === "de" ? "Menge erhöhen" : "Increase quantity"
                  }
                  onPress={() => update(item.variantId, item.quantity + 1)}
                >
                  <Plus size={18} color={colors.primary} />
                </QuantityButton>
                <View style={{ flex: 1 }} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={copy.remove}
                  onPress={() => update(item.variantId, 0)}
                  style={({ pressed }) => ({
                    minWidth: 48,
                    minHeight: 48,
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: pressed
                      ? colors.dangerSoft
                      : "transparent",
                  })}
                >
                  <Trash2 size={20} color={colors.danger} />
                </Pressable>
              </View>
            </View>
          ))}
          <View
            style={{
              padding: 16,
              borderRadius: 16,
              backgroundColor: colors.primarySoft,
              gap: 14,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: "Archivo_700Bold",
                  fontSize: 20,
                  color: colors.text,
                }}
              >
                {copy.total}
              </Text>
              <Text
                style={{
                  fontFamily: "Archivo_700Bold",
                  fontSize: 22,
                  color: colors.primary,
                }}
              >
                {money(total, locale)}
              </Text>
            </View>
            <Button onPress={() => router.push("/checkout")}>
              {copy.checkout}
            </Button>
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}
