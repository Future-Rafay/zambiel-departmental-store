import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import {
  Check,
  Heart,
  Minus,
  Plus,
  ShoppingBag,
  X,
  ZoomIn,
} from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  FlatList,
  Image,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import RenderHtml from "react-native-render-html";
import { api } from "../../src/api";
import { useApp } from "../../src/app-state";
import {
  addRecentlyViewed,
  cartLine,
  money,
  readRecentlyViewed,
  selectedVariant,
} from "../../src/commerce";
import type { Product, ProductPreview } from "../../src/types";
import { Button, Empty, ProductCard } from "../../src/ui";
import { colors, space } from "../../src/theme";

type GalleryItem = { id: string; url: string; alt: string };

function productGallery(
  product: Product,
  variantImage?: string | null,
): GalleryItem[] {
  const seen = new Set<string>();
  return [
    ...(product.imageUrl
      ? [{ id: "primary", url: product.imageUrl, alt: product.name }]
      : []),
    ...product.media.flatMap((item) =>
      item.url
        ? [{ id: item.id, url: item.url, alt: item.alt || product.name }]
        : [],
    ),
    ...(variantImage
      ? [
          {
            id: `variant-${variantImage}`,
            url: variantImage,
            alt: product.name,
          },
        ]
      : []),
  ].filter((item) => !seen.has(item.url) && !!seen.add(item.url));
}

function ZoomableImage({ item, size }: { item: GalleryItem; size: number }) {
  const scale = useRef(new Animated.Value(1)).current;
  const currentScale = useRef(1);
  const startDistance = useRef(0);
  const startScale = useRef(1);
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: (event) =>
          event.nativeEvent.touches.length === 2,
        onMoveShouldSetPanResponder: (event) =>
          event.nativeEvent.touches.length === 2,
        onPanResponderGrant: (event) => {
          const [a, b] = event.nativeEvent.touches;
          if (!a || !b) return;
          startDistance.current = Math.hypot(
            a.pageX - b.pageX,
            a.pageY - b.pageY,
          );
          startScale.current = currentScale.current;
        },
        onPanResponderMove: (event) => {
          const [a, b] = event.nativeEvent.touches;
          if (!a || !b || !startDistance.current) return;
          const distance = Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
          currentScale.current = Math.max(
            1,
            Math.min(
              4,
              (startScale.current * distance) / startDistance.current,
            ),
          );
          scale.setValue(currentScale.current);
        },
        onPanResponderRelease: () => {
          if (currentScale.current < 1.08) {
            currentScale.current = 1;
            Animated.spring(scale, {
              toValue: 1,
              useNativeDriver: true,
            }).start();
          }
        },
      }),
    [scale],
  );

  return (
    <View
      style={{ width: size, height: size, justifyContent: "center" }}
      {...panResponder.panHandlers}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Image
          source={{ uri: item.url }}
          accessibilityLabel={item.alt}
          resizeMode="contain"
          style={{ width: size, height: size }}
        />
      </Animated.View>
    </View>
  );
}

export default function ProductScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { add, locale, user } = useApp();
  const queryClient = useQueryClient();
  const galleryRef = useRef<FlatList<GalleryItem>>(null);
  const feedbackOpacity = useRef(new Animated.Value(0)).current;
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<ProductPreview[]>([]);
  const [recent, setRecent] = useState<ProductPreview[]>([]);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [saved, setSaved] = useState(false);
  const [wishlistBusy, setWishlistBusy] = useState(false);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [fullScreen, setFullScreen] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const copy =
    locale === "de"
      ? {
          add: "In den Warenkorb",
          buy: "Jetzt kaufen",
          unavailable: "Nicht verfügbar",
          inStock: "Auf Lager",
          lowStock: "Nur noch",
          description: "Produktdetails",
          related: "Das könnte dir gefallen",
          recent: "Zuletzt angesehen",
          retry: "Erneut versuchen",
          failed: "Dieses Produkt konnte nicht geladen werden.",
          added: "Zum Warenkorb hinzugefügt",
          quantity: "Menge",
          close: "Galerie schließen",
          zoom: "Zum Vergrößern mit zwei Fingern ziehen",
        }
      : {
          add: "Add to cart",
          buy: "Buy now",
          unavailable: "Unavailable",
          inStock: "In stock",
          lowStock: "Only",
          description: "Product details",
          related: "You may also like",
          recent: "Recently viewed",
          retry: "Try again",
          failed: "This product could not be loaded.",
          added: "Added to cart",
          quantity: "Quantity",
          close: "Close gallery",
          zoom: "Pinch with two fingers to zoom",
        };

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!slug) return;
    const controller = new AbortController();
    setError(false);
    setProduct(null);
    api
      .product(slug, locale, controller.signal)
      .then(({ product: item, related: suggestions }) => {
        setProduct(item);
        setRelated(suggestions.filter((entry) => entry.id !== item.id));
        const initialVariant =
          item.variants.find((entry) => entry.stockAvailable !== 0) ??
          item.variants[0];
        setChoices(
          initialVariant
            ? Object.fromEntries(
                initialVariant.optionValues.map((value) => [
                  value.optionId,
                  value.valueId,
                ]),
              )
            : {},
        );
        setQuantity(1);
        AsyncStorage.getItem("recentProducts")
          .then((raw) => {
            const values = readRecentlyViewed(raw ? JSON.parse(raw) : []);
            setRecent(values.filter((entry) => entry.id !== item.id));
            return AsyncStorage.setItem(
              "recentProducts",
              JSON.stringify(addRecentlyViewed(values, item)),
            );
          })
          .catch(() => undefined);
      })
      .catch((cause) => {
        if ((cause as Error).name !== "AbortError") setError(true);
      });
    return () => controller.abort();
  }, [slug, locale, retryKey]);

  useEffect(() => {
    if (!user || !product) {
      setSaved(false);
      return;
    }
    let active = true;
    api
      .wishlist(locale)
      .then((items) => {
        if (active) setSaved(items.some((entry) => entry.id === product.id));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [user, product?.id, locale]);

  const variant = useMemo(
    () => (product ? selectedVariant(product, choices) : undefined),
    [product, choices],
  );
  const gallery = useMemo(
    () => (product ? productGallery(product, variant?.imageUrl) : []),
    [product, variant?.imageUrl],
  );
  const contentWidth = Math.min(width, 720);
  const gallerySize = Math.min(width, 620);
  const maximumQuantity = Math.min(20, variant?.stockAvailable ?? 20);
  const unavailable =
    !product?.available || !variant || variant.stockAvailable === 0;
  const relatedIds = useMemo(
    () => new Set(related.map((item) => item.id)),
    [related],
  );
  const distinctRecent = recent.filter(
    (item) => item.id !== product?.id && !relatedIds.has(item.id),
  );

  useEffect(() => {
    if (!variant?.imageUrl) return;
    const index = gallery.findIndex((item) => item.url === variant.imageUrl);
    if (index >= 0) {
      setGalleryIndex(index);
      requestAnimationFrame(() =>
        galleryRef.current?.scrollToIndex({ index, animated: !reduceMotion }),
      );
    }
  }, [variant?.imageUrl, gallery, reduceMotion]);

  const isValueAvailable = (optionId: string, valueId: string) =>
    product?.variants.some(
      (item) =>
        item.stockAvailable !== 0 &&
        product.options.every((option) =>
          item.optionValues.some(
            (value) =>
              value.optionId === option.id &&
              value.valueId ===
                (option.id === optionId ? valueId : choices[option.id]),
          ),
        ),
    ) ?? false;

  const showAdded = () => {
    AccessibilityInfo.announceForAccessibility(copy.added);
    if (reduceMotion) return;
    feedbackOpacity.stopAnimation();
    feedbackOpacity.setValue(1);
    Animated.sequence([
      Animated.delay(900),
      Animated.timing(feedbackOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const addSelected = (checkout = false) => {
    if (!product || !variant || unavailable) return;
    add([cartLine(product, variant, quantity)]);
    showAdded();
    if (checkout) router.push("/checkout");
  };

  const toggleWishlist = async () => {
    if (!product || wishlistBusy) return;
    setWishlistBusy(true);
    const previous = saved;
    setSaved(!previous);
    try {
      await api.toggleWishlist(product.id, previous);
      await queryClient.invalidateQueries({ queryKey: ["wishlist", user?.id] });
    } catch {
      setSaved(previous);
    } finally {
      setWishlistBusy(false);
    }
  };

  if (error)
    return (
      <View style={styles.center}>
        <ShoppingBag size={36} color={colors.muted} />
        <Empty>{copy.failed}</Empty>
        <Button onPress={() => setRetryKey((value) => value + 1)}>
          {copy.retry}
        </Button>
      </View>
    );
  if (!product)
    return (
      <View style={styles.loading}>
        <View style={styles.loadingImage} />
        <View style={styles.loadingLineWide} />
        <View style={styles.loadingLine} />
      </View>
    );

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 132 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.galleryWrap,
            { width: gallerySize, alignSelf: "center" },
          ]}
        >
          {gallery.length ? (
            <FlatList
              ref={galleryRef}
              data={gallery}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              getItemLayout={(_, index) => ({
                length: gallerySize,
                offset: gallerySize * index,
                index,
              })}
              onMomentumScrollEnd={(event) =>
                setGalleryIndex(
                  Math.round(event.nativeEvent.contentOffset.x / gallerySize),
                )
              }
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="imagebutton"
                  accessibilityLabel={`${item.alt}. ${copy.zoom}`}
                  onPress={() => setFullScreen(true)}
                  style={{ width: gallerySize, height: gallerySize }}
                >
                  <Image
                    source={{ uri: item.url }}
                    resizeMode="cover"
                    style={styles.galleryImage}
                  />
                  <View style={styles.zoomBadge}>
                    <ZoomIn size={18} color={colors.primary} />
                  </View>
                </Pressable>
              )}
            />
          ) : (
            <View style={[styles.galleryPlaceholder, { height: gallerySize }]}>
              <ShoppingBag size={48} color={colors.muted} />
            </View>
          )}
          {gallery.length > 1 ? (
            <View
              style={styles.dots}
              accessibilityLabel={`${galleryIndex + 1} / ${gallery.length}`}
            >
              {gallery.map((item, index) => (
                <View
                  key={item.id}
                  style={[
                    styles.dot,
                    index === galleryIndex && styles.dotActive,
                  ]}
                />
              ))}
            </View>
          ) : null}
        </View>

        <View
          style={[styles.details, { width: contentWidth, alignSelf: "center" }]}
        >
          <View style={styles.titleRow}>
            <View style={styles.titleCopy}>
              <Text style={styles.eyebrow}>{product.category.name}</Text>
              <Text accessibilityRole="header" style={styles.title}>
                {product.name}
              </Text>
              <Text style={styles.price}>
                {money(
                  variant?.priceRappen ?? product.minimumPriceRappen,
                  locale,
                )}
              </Text>
            </View>
            {user ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  locale === "de" ? "Wunschliste" : "Wishlist"
                }
                accessibilityState={{ selected: saved, busy: wishlistBusy }}
                disabled={wishlistBusy}
                onPress={toggleWishlist}
                style={({ pressed }) => [
                  styles.iconButton,
                  pressed && styles.pressed,
                ]}
              >
                <Heart
                  size={23}
                  color={saved ? colors.danger : colors.primary}
                  fill={saved ? colors.danger : "transparent"}
                />
              </Pressable>
            ) : null}
          </View>

          <View
            style={[
              styles.stockPill,
              unavailable && styles.stockPillUnavailable,
            ]}
          >
            <View
              style={[
                styles.stockDot,
                unavailable && styles.stockDotUnavailable,
              ]}
            />
            <Text
              style={[
                styles.stockText,
                unavailable && styles.stockTextUnavailable,
              ]}
            >
              {unavailable
                ? copy.unavailable
                : variant?.stockAvailable && variant.stockAvailable <= 5
                  ? `${copy.lowStock} ${variant.stockAvailable}`
                  : copy.inStock}
            </Text>
          </View>

          {product.options.map((option) => (
            <View
              key={option.id}
              accessibilityRole="radiogroup"
              style={styles.optionGroup}
            >
              <Text style={styles.optionLabel}>{option.name}</Text>
              <View style={styles.optionValues}>
                {option.values.map((value) => {
                  const selected = choices[option.id] === value.id;
                  const available = isValueAvailable(option.id, value.id);
                  return (
                    <Pressable
                      key={value.id}
                      accessibilityRole="radio"
                      accessibilityState={{ selected, disabled: !available }}
                      disabled={!available}
                      onPress={() =>
                        setChoices((current) => ({
                          ...current,
                          [option.id]: value.id,
                        }))
                      }
                      style={({ pressed }) => [
                        styles.option,
                        selected && styles.optionSelected,
                        !available && styles.optionDisabled,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          selected && styles.optionTextSelected,
                          !available && styles.optionTextDisabled,
                        ]}
                      >
                        {value.value}
                      </Text>
                      {selected ? (
                        <Check size={15} color={colors.surface} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}

          {product.description ? (
            <View style={styles.description}>
              <Text style={styles.sectionTitle}>{copy.description}</Text>
              <RenderHtml
                contentWidth={contentWidth - space.md * 2}
                source={{ html: product.description }}
                baseStyle={htmlBaseStyle}
                tagsStyles={htmlTagsStyles}
              />
            </View>
          ) : null}

          {related.length ? (
            <ProductRail title={copy.related} products={related} />
          ) : null}
          {distinctRecent.length ? (
            <ProductRail title={copy.recent} products={distinctRecent} />
          ) : null}
        </View>
      </ScrollView>

      <Animated.View
        pointerEvents="none"
        accessibilityLiveRegion="polite"
        style={[
          styles.feedback,
          {
            opacity: reduceMotion ? 0 : feedbackOpacity,
            bottom: 112 + insets.bottom,
          },
        ]}
      >
        <Check size={17} color={colors.surface} />
        <Text style={styles.feedbackText}>{copy.added}</Text>
      </Animated.View>

      <View
        style={[
          styles.purchaseDock,
          { paddingBottom: Math.max(insets.bottom, 12) },
        ]}
      >
        <View
          accessibilityRole="adjustable"
          accessibilityLabel={copy.quantity}
          accessibilityValue={{ min: 1, max: maximumQuantity, now: quantity }}
          style={styles.stepper}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              locale === "de" ? "Menge verringern" : "Decrease quantity"
            }
            disabled={quantity <= 1}
            onPress={() => setQuantity((value) => Math.max(1, value - 1))}
            style={styles.stepperButton}
          >
            <Minus
              size={18}
              color={quantity <= 1 ? colors.border : colors.primary}
            />
          </Pressable>
          <Text style={styles.quantity}>{quantity}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              locale === "de" ? "Menge erhöhen" : "Increase quantity"
            }
            disabled={quantity >= maximumQuantity}
            onPress={() =>
              setQuantity((value) => Math.min(maximumQuantity, value + 1))
            }
            style={styles.stepperButton}
          >
            <Plus
              size={18}
              color={
                quantity >= maximumQuantity ? colors.border : colors.primary
              }
            />
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={unavailable}
          onPress={() => addSelected(false)}
          style={({ pressed }) => [
            styles.addButton,
            pressed && styles.pressed,
            unavailable && styles.disabled,
          ]}
        >
          <Text style={styles.addButtonText}>
            {unavailable ? copy.unavailable : copy.add}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={unavailable}
          onPress={() => addSelected(true)}
          style={({ pressed }) => [
            styles.buyButton,
            pressed && styles.pressed,
            unavailable && styles.disabled,
          ]}
        >
          <Text style={styles.buyButtonText}>{copy.buy}</Text>
        </Pressable>
      </View>

      <Modal
        visible={fullScreen}
        transparent
        animationType={reduceMotion ? "none" : "fade"}
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setFullScreen(false)}
      >
        <View
          style={[
            styles.modal,
            { paddingTop: insets.top, paddingBottom: insets.bottom },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.close}
            onPress={() => setFullScreen(false)}
            style={[styles.closeButton, { top: insets.top + 8 }]}
          >
            <X size={25} color={colors.surface} />
          </Pressable>
          <FlatList
            data={gallery}
            horizontal
            pagingEnabled
            initialScrollIndex={galleryIndex}
            keyExtractor={(item) => item.id}
            getItemLayout={(_, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <View
                style={{
                  width,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ZoomableImage
                  item={item}
                  size={Math.min(
                    width,
                    height - insets.top - insets.bottom - 48,
                  )}
                />
              </View>
            )}
          />
          <Text style={[styles.zoomHint, { bottom: insets.bottom + 12 }]}>
            {copy.zoom}
          </Text>
        </View>
      </Modal>
    </View>
  );
}

function ProductRail({
  title,
  products,
}: {
  title: string;
  products: ProductPreview[];
}) {
  return (
    <View style={styles.railSection}>
      <Text style={[styles.sectionTitle, styles.railTitle]}>{title}</Text>
      <FlatList
        horizontal
        data={products}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.railContent}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onPress={() => router.push(`/product/${item.slug}`)}
            style={styles.railCard}
          />
        )}
      />
    </View>
  );
}

const htmlBaseStyle = {
  fontFamily: "Inter_400Regular",
  fontSize: 16,
  lineHeight: 25,
  color: colors.text,
};
const htmlTagsStyles = {
  a: { color: colors.primary },
  p: { marginTop: 0, marginBottom: 12 },
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { backgroundColor: colors.background },
  center: {
    flex: 1,
    padding: space.xl,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
    padding: space.md,
    gap: space.md,
    backgroundColor: colors.background,
  },
  loadingImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: "#E8ECE9",
  },
  loadingLineWide: {
    width: "82%",
    height: 26,
    borderRadius: 8,
    backgroundColor: "#E1E6E2",
  },
  loadingLine: {
    width: "38%",
    height: 22,
    borderRadius: 8,
    backgroundColor: "#E1E6E2",
  },
  galleryWrap: { position: "relative", backgroundColor: colors.surface },
  galleryImage: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.surface,
  },
  galleryPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8ECE9",
  },
  zoomBadge: {
    position: "absolute",
    right: 14,
    top: 14,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFFE8",
    borderWidth: 1,
    borderColor: colors.border,
  },
  dots: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#153B3540" },
  dotActive: { width: 18, backgroundColor: colors.primary },
  details: { padding: space.md, gap: space.lg },
  titleRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  titleCopy: { flex: 1, minWidth: 0 },
  eyebrow: {
    marginBottom: 6,
    color: colors.muted,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  title: {
    color: colors.text,
    fontFamily: "Archivo_700Bold",
    fontSize: 27,
    lineHeight: 34,
  },
  price: {
    marginTop: 10,
    color: colors.primary,
    fontFamily: "Archivo_700Bold",
    fontSize: 22,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stockPill: {
    alignSelf: "flex-start",
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#E7F3EC",
  },
  stockPillUnavailable: { backgroundColor: "#F8EAE8" },
  stockDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  stockDotUnavailable: { backgroundColor: colors.danger },
  stockText: {
    color: colors.success,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  stockTextUnavailable: { color: colors.danger },
  optionGroup: { gap: 10 },
  optionLabel: {
    color: colors.text,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  optionValues: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  option: {
    minHeight: 48,
    paddingHorizontal: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  optionDisabled: { opacity: 0.4 },
  optionText: {
    color: colors.text,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  optionTextSelected: { color: colors.surface },
  optionTextDisabled: { textDecorationLine: "line-through" },
  description: {
    paddingTop: space.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sectionTitle: {
    marginBottom: 12,
    color: colors.primary,
    fontFamily: "Archivo_700Bold",
    fontSize: 21,
    lineHeight: 27,
  },
  railSection: { marginHorizontal: -space.md },
  railTitle: { marginHorizontal: space.md },
  railContent: { paddingHorizontal: space.md, gap: 12 },
  railCard: { width: 188, flex: 0 },
  purchaseDock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 82,
    paddingTop: 12,
    paddingHorizontal: space.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  stepper: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  stepperButton: {
    width: 38,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  quantity: {
    minWidth: 20,
    textAlign: "center",
    color: colors.text,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  addButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    backgroundColor: colors.primary,
  },
  addButtonText: {
    color: colors.surface,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    textAlign: "center",
  },
  buyButton: {
    minHeight: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    backgroundColor: colors.accent,
  },
  buyButtonText: {
    color: colors.primaryPressed,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    textAlign: "center",
  },
  feedback: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.success,
  },
  feedbackText: {
    color: colors.surface,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  modal: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#09110F",
  },
  closeButton: {
    position: "absolute",
    zIndex: 2,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF20",
  },
  zoomHint: {
    position: "absolute",
    color: colors.surface,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.45 },
});
