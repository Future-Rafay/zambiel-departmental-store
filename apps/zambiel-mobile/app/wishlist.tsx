import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Heart, RotateCcw } from "lucide-react-native";
import {
  ActivityIndicator,
  FlatList,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { api } from "../src/api";
import { useApp } from "../src/app-state";
import { t } from "../src/i18n";
import { colors, space } from "../src/theme";
import { Button, ProductCard } from "../src/ui";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Wishlist() {
  const { locale, user } = useApp();
  const { width } = useWindowDimensions();
  const { bottom } = useSafeAreaInsets();
  const gap = space.sm;
  const gutter = width >= 600 ? space.lg : space.md;
  const cardWidth = Math.floor((Math.min(width, 840) - gutter * 2 - gap) / 2);
  const query = useQuery({
    queryKey: ["wishlist", user?.id, locale],
    queryFn: () => api.wishlist(locale),
    enabled: !!user,
  });
  const empty = query.isLoading ? (
    <View style={{ padding: 48, alignItems: "center", gap: 12 }}>
      <ActivityIndicator color={colors.primary} />
      <Text style={{ color: colors.muted }}>{t(locale).loading}</Text>
    </View>
  ) : query.isError ? (
    <View style={{ padding: 40, alignItems: "center", gap: 12 }}>
      <RotateCcw size={32} color={colors.primary} />
      <Text
        accessibilityRole="alert"
        style={{ color: colors.muted, textAlign: "center" }}
      >
        {locale === "de"
          ? "Wunschliste konnte nicht geladen werden."
          : "Could not load your wishlist."}
      </Text>
      <Button
        onPress={() => {
          void query.refetch();
        }}
      >
        {t(locale).retry}
      </Button>
    </View>
  ) : (
    <View style={{ padding: 40, alignItems: "center", gap: 12 }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: colors.primarySoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Heart size={34} color={colors.primary} />
      </View>
      <Text
        accessibilityRole="header"
        style={{
          fontFamily: "Archivo_700Bold",
          fontSize: 22,
          color: colors.text,
        }}
      >
        {locale === "de" ? "Noch keine Favoriten" : "No saved products yet"}
      </Text>
      <Text style={{ color: colors.muted, textAlign: "center" }}>
        {locale === "de"
          ? "Speichere Produkte, um sie hier schnell wiederzufinden."
          : "Save products to find them quickly later."}
      </Text>
      <Button onPress={() => router.push("/(tabs)/shop")}>
        {locale === "de" ? "Produkte entdecken" : "Discover products"}
      </Button>
    </View>
  );
  return (
    <FlatList
      data={query.data ?? []}
      numColumns={2}
      keyExtractor={(item) => item.id}
      columnWrapperStyle={{ gap }}
      contentContainerStyle={{
        paddingHorizontal: gutter,
        paddingTop: space.md,
        paddingBottom: bottom + space.lg,
        gap,
        flexGrow: 1,
        alignSelf: "center",
        width: "100%",
        maxWidth: 840,
      }}
      ListEmptyComponent={empty}
      renderItem={({ item }) => (
        <ProductCard
          product={item}
          style={{ width: cardWidth }}
          onPress={() => router.push(`/product/${item.slug}`)}
        />
      )}
    />
  );
}
