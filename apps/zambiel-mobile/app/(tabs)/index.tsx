import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import { router, useFocusEffect } from "expo-router";
import { ArrowRight, Languages, WifiOff } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { api } from "../../src/api";
import { useLocale } from "../../src/app-state";
import { readRecentlyViewed } from "../../src/commerce";
import type { Product, ProductPreview } from "../../src/types";
import {
  Button,
  Header,
  ProductCard,
  Screen,
  SectionHeader,
  Skeleton,
  StateView,
  useContentGutter,
} from "../../src/ui";
import { colors, radius, space, type } from "../../src/theme";

function ProductRail({
  products,
  onPress,
}: {
  products: ProductPreview[];
  onPress: (slug: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={homeStyles.rail}
    >
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          style={homeStyles.railCard}
          onPress={() => onPress(product.slug)}
        />
      ))}
    </ScrollView>
  );
}

function LoadingHome() {
  return (
    <View style={homeStyles.loading}>
      <Skeleton style={homeStyles.heroSkeleton} />
      <Skeleton style={homeStyles.headingSkeleton} />
      <View style={homeStyles.skeletonRow}>
        <Skeleton style={homeStyles.cardSkeleton} />
        <Skeleton style={homeStyles.cardSkeleton} />
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const { locale, setLocale } = useLocale();
  const gutter = useContentGutter();
  const [recent, setRecent] = useState<ProductPreview[]>([]);
  const [reduceMotion, setReduceMotion] = useState(true);
  const entrance = useRef(new Animated.Value(0)).current;
  const home = useQuery({
    queryKey: ["catalog", "home", locale],
    queryFn: ({ signal }) => api.home(locale, signal),
  });

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (!home.data) return;
    if (reduceMotion) entrance.setValue(1);
    else
      Animated.timing(entrance, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }).start();
  }, [entrance, home.data, reduceMotion]);
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem("recentProducts")
        .then((raw) =>
          setRecent(readRecentlyViewed(raw ? JSON.parse(raw) : [])),
        )
        .catch(() => setRecent([]));
    }, []),
  );

  const sections = useMemo(() => {
    if (!home.data)
      return {
        featured: [] as Product[],
        best: [] as Product[],
        newest: [] as Product[],
      };
    const used = new Set<string>();
    const takeUnique = (products: Product[]) =>
      products
        .filter((product) => !used.has(product.id) && used.add(product.id))
        .slice(0, 8);
    const featured = takeUnique(
      home.data.featured.length ? home.data.featured : home.data.showcase,
    );
    return {
      featured,
      best: takeUnique(home.data.bestSellers),
      newest: takeUnique(home.data.newest),
    };
  }, [home.data]);
  const openProduct = (slug: string) => router.push(`/product/${slug}`);
  const openDiscover = () => router.push("/(tabs)/shop");
  const viewAll = (sort: "featured" | "newest") =>
    router.push({ pathname: "/(tabs)/shop", params: { sort } });
  const copy =
    locale === "de"
      ? {
          heroTitle: "Gutes für jeden Tag.",
          heroBody:
            "Praktische Produkte, sorgfältig für die Schweiz ausgewählt.",
          shop: "Jetzt entdecken",
          categories: "Kategorien",
          recent: "Zuletzt angesehen",
          featured: "Für dich ausgewählt",
          best: "Beliebt bei Kundinnen und Kunden",
          newest: "Neu bei Zambiel",
          all: "Alle ansehen",
          loadError: "Inhalte konnten nicht geladen werden",
          loadMessage: "Prüfe deine Verbindung und versuche es erneut.",
          retry: "Erneut versuchen",
          language: "Sprache wechseln",
        }
      : {
          heroTitle: "Good things for every day.",
          heroBody: "Practical products, carefully selected for Switzerland.",
          shop: "Shop now",
          categories: "Categories",
          recent: "Recently viewed",
          featured: "Selected for you",
          best: "Customer favourites",
          newest: "New at Zambiel",
          all: "View all",
          loadError: "We couldn't load the shop",
          loadMessage: "Check your connection and try again.",
          retry: "Try again",
          language: "Change language",
        };

  return (
    <Screen>
      <Header
        title={
          <Image
            accessibilityRole="image"
            accessibilityLabel="Zambiel"
            source={require("../../assets/zambiel-logo.png")}
            resizeMode="contain"
            style={homeStyles.headerLogo}
          />
        }
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.language}
            onPress={() => setLocale(locale === "de" ? "en" : "de")}
            style={({ pressed }) => [
              homeStyles.language,
              pressed && homeStyles.pressed,
            ]}
          >
            <Languages size={18} color={colors.primary} />
            <Text style={homeStyles.languageText}>{locale.toUpperCase()}</Text>
          </Pressable>
        }
      />
      {home.isPending ? (
        <LoadingHome />
      ) : home.isError || !home.data ? (
        <StateView
          icon={WifiOff}
          title={copy.loadError}
          message={copy.loadMessage}
          action={<Button onPress={() => home.refetch()}>{copy.retry}</Button>}
        />
      ) : (
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={home.isRefetching}
              onRefresh={home.refetch}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          contentContainerStyle={[
            homeStyles.content,
            { paddingHorizontal: gutter },
          ]}
          style={{
            opacity: entrance,
            transform: [
              {
                translateY: entrance.interpolate({
                  inputRange: [0, 1],
                  outputRange: [reduceMotion ? 0 : 8, 0],
                }),
              },
            ],
          }}
        >
          <View style={homeStyles.hero}>
            <View style={homeStyles.heroCopy}>
              <Image
                accessible={false}
                source={require("../../assets/zambiel-logo-white.png")}
                resizeMode="contain"
                style={homeStyles.heroLogo}
              />
              <Text style={homeStyles.heroTitle}>{copy.heroTitle}</Text>
              <Text style={homeStyles.heroBody}>{copy.heroBody}</Text>
              <Button onPress={openDiscover} style={homeStyles.heroButton}>
                <View style={homeStyles.heroButtonInner}>
                  <Text style={homeStyles.heroButtonText}>{copy.shop}</Text>
                  <ArrowRight size={18} color={colors.primary} />
                </View>
              </Button>
            </View>
            {home.data.showcase[0]?.imageUrl ? (
              <View style={homeStyles.heroImageWrap}>
                <Image
                  source={{ uri: home.data.showcase[0].imageUrl }}
                  resizeMode="contain"
                  style={homeStyles.heroImage}
                  accessibilityLabel={home.data.showcase[0].name}
                />
              </View>
            ) : null}
          </View>

          {home.data.categories.length ? (
            <View>
              <SectionHeader title={copy.categories} />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={homeStyles.categoryRail}
              >
                {home.data.categories.map((category) => (
                  <Pressable
                    key={category.id}
                    accessibilityRole="button"
                    onPress={() =>
                      router.push({
                        pathname: "/(tabs)/shop",
                        params: { category: category.slug },
                      })
                    }
                    style={({ pressed }) => [
                      homeStyles.category,
                      pressed && homeStyles.pressed,
                    ]}
                  >
                    {category.imageUrl ? (
                      <Image
                        source={{ uri: category.imageUrl }}
                        resizeMode="contain"
                        style={homeStyles.categoryImage}
                      />
                    ) : (
                      <View style={homeStyles.categoryMark}>
                        <Text style={homeStyles.categoryInitial}>
                          {category.name.slice(0, 1).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <Text numberOfLines={2} style={homeStyles.categoryName}>
                      {category.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {recent.length ? (
            <View>
              <SectionHeader title={copy.recent} />
              <ProductRail
                products={recent.slice(0, 8)}
                onPress={openProduct}
              />
            </View>
          ) : null}
          {sections.featured.length ? (
            <View>
              <SectionHeader
                title={copy.featured}
                action={
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => viewAll("featured")}
                    hitSlop={8}
                  >
                    <Text style={homeStyles.link}>{copy.all}</Text>
                  </Pressable>
                }
              />
              <ProductRail products={sections.featured} onPress={openProduct} />
            </View>
          ) : null}
          {sections.best.length ? (
            <View>
              <SectionHeader title={copy.best} />
              <ProductRail products={sections.best} onPress={openProduct} />
            </View>
          ) : null}
          {sections.newest.length ? (
            <View>
              <SectionHeader
                title={copy.newest}
                action={
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => viewAll("newest")}
                    hitSlop={8}
                  >
                    <Text style={homeStyles.link}>{copy.all}</Text>
                  </Pressable>
                }
              />
              <ProductRail products={sections.newest} onPress={openProduct} />
            </View>
          ) : null}
        </Animated.ScrollView>
      )}
    </Screen>
  );
}

const homeStyles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: 920,
    alignSelf: "center",
    paddingTop: space.md,
    paddingBottom: space.xl,
    gap: space.lg,
  },
  headerLogo: { width: 118, height: 54 },
  language: {
    minWidth: 62,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  languageText: {
    fontFamily: type.strong,
    fontSize: 13,
    color: colors.primary,
  },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  hero: {
    minHeight: 248,
    overflow: "hidden",
    flexDirection: "row",
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    borderBottomWidth: 4,
    borderBottomColor: colors.accent,
  },
  heroCopy: {
    zIndex: 1,
    width: "66%",
    padding: space.lg,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  heroLogo: { width: 132, height: 56, marginBottom: space.xs },
  heroTitle: {
    fontFamily: type.display,
    fontSize: 30,
    lineHeight: 35,
    color: colors.surface,
  },
  heroBody: {
    maxWidth: 290,
    marginTop: space.xs,
    fontFamily: type.body,
    fontSize: 14,
    lineHeight: 20,
    color: "#E5EEEA",
  },
  heroButton: {
    minHeight: 44,
    marginTop: space.md,
    paddingHorizontal: space.md,
    backgroundColor: colors.surface,
  },
  heroButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
  },
  heroButtonText: {
    fontFamily: type.strong,
    fontSize: 14,
    color: colors.primary,
  },
  heroImageWrap: {
    position: "absolute",
    right: -36,
    bottom: -18,
    width: "50%",
    aspectRatio: 1,
    borderRadius: radius.pill,
    backgroundColor: "#FFFFFF12",
  },
  heroImage: { width: "100%", height: "100%" },
  categoryRail: { paddingTop: space.xs, gap: space.xs },
  category: {
    width: 126,
    minHeight: 110,
    padding: space.sm,
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  categoryImage: { width: 58, height: 58 },
  categoryMark: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  categoryInitial: {
    fontFamily: type.display,
    fontSize: 22,
    color: colors.primary,
  },
  categoryName: {
    minHeight: 34,
    textAlign: "center",
    fontFamily: type.strong,
    fontSize: 13,
    lineHeight: 17,
    color: colors.text,
  },
  rail: { paddingTop: space.xs, gap: space.sm },
  railCard: { width: 176, flex: 0 },
  link: {
    fontFamily: type.strong,
    fontSize: 14,
    color: colors.primary,
    textDecorationLine: "underline",
  },
  loading: { padding: space.md, gap: space.lg },
  heroSkeleton: { height: 248 },
  headingSkeleton: { width: 190, height: 28 },
  skeletonRow: { flexDirection: "row", gap: space.sm },
  cardSkeleton: { flex: 1, aspectRatio: 0.72 },
});
