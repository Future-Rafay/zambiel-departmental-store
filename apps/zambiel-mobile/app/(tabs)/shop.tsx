import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Search, SlidersHorizontal, X } from "lucide-react-native";
import { api } from "../../src/api";
import { useApp } from "../../src/app-state";
import { DiscoverFilterSheet, type DiscoverFilters } from "../../src/discover-filter-sheet";
import type { Category, Product } from "../../src/types";
import { Button, Header, ProductCard, Screen, StateView } from "../../src/ui";
import { colors, space } from "../../src/theme";

const defaultFilters: DiscoverFilters = { availableOnly: false, sort: "featured" };

export default function ShopScreen() {
  const { locale } = useApp();
  const de = locale === "de";
  const params = useLocalSearchParams<{ category?: string }>();
  const routeCategory = typeof params.category === "string" ? params.category : undefined;
  const { width } = useWindowDimensions();
  const gutter = width >= 600 ? space.lg : space.md;
  const cardWidth = (Math.min(width, 760) - gutter * 2 - space.sm) / 2;
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filters, setFilters] = useState<DiscoverFilters>({ ...defaultFilters, category: routeCategory });
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [loadMoreError, setLoadMoreError] = useState("");
  const [filtersVisible, setFiltersVisible] = useState(false);
  const requestVersion = useRef(0);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setFilters((current) => ({ ...current, category: routeCategory }));
  }, [routeCategory]);

  useEffect(() => {
    let active = true;
    api.categories(locale).then((items) => { if (active) setCategories(items); }).catch(() => undefined);
    return () => { active = false; };
  }, [locale]);

  const queryString = useCallback((nextPage: number) => {
    const value = new URLSearchParams({ locale, page: String(nextPage), sort: filters.sort });
    if (debouncedQuery) value.set("query", debouncedQuery);
    if (filters.category) value.set("category", filters.category);
    if (filters.availableOnly) value.set("availableOnly", "true");
    if (filters.minPriceRappen !== undefined) value.set("minPriceRappen", String(filters.minPriceRappen));
    if (filters.maxPriceRappen !== undefined) value.set("maxPriceRappen", String(filters.maxPriceRappen));
    return value.toString();
  }, [debouncedQuery, filters, locale]);

  const loadFirstPage = useCallback(async (refresh = false) => {
    const version = ++requestVersion.current;
    loadingMoreRef.current = false;
    setLoadingMore(false);
    if (refresh) setRefreshing(true); else setLoading(true);
    setError("");
    setLoadMoreError("");
    try {
      const result = await api.productsPage(queryString(1));
      if (version !== requestVersion.current) return;
      setProducts(result.items);
      setPage(result.page);
      setPageCount(result.pageCount);
      setTotal(result.total);
    } catch {
      if (version !== requestVersion.current) return;
      setProducts([]);
      setTotal(0);
      setError(de ? "Produkte konnten nicht geladen werden." : "Products could not be loaded.");
    } finally {
      if (version === requestVersion.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [de, queryString]);

  useEffect(() => { void loadFirstPage(); }, [loadFirstPage]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMoreRef.current || page >= pageCount) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setLoadMoreError("");
    const version = requestVersion.current;
    try {
      const result = await api.productsPage(queryString(page + 1));
      if (version !== requestVersion.current) return;
      setProducts((current) => {
        const existing = new Set(current.map((product) => product.id));
        return [...current, ...result.items.filter((product) => !existing.has(product.id))];
      });
      setPage(result.page);
      setPageCount(result.pageCount);
      setTotal(result.total);
    } catch {
      if (version === requestVersion.current) setLoadMoreError(de ? "Weitere Produkte konnten nicht geladen werden." : "More products could not be loaded.");
    } finally {
      loadingMoreRef.current = false;
      if (version === requestVersion.current) setLoadingMore(false);
    }
  }, [de, loading, page, pageCount, queryString]);

  const activeFilterCount = Number(Boolean(filters.category)) + Number(filters.availableOnly) + Number(filters.minPriceRappen !== undefined) + Number(filters.maxPriceRappen !== undefined) + Number(filters.sort !== "featured");
  const selectedCategory = categories.find((category) => category.slug === filters.category);
  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; clear: () => void }[] = [];
    if (filters.category) chips.push({ key: "category", label: selectedCategory?.name ?? filters.category, clear: () => setFilters((current) => ({ ...current, category: undefined })) });
    if (filters.availableOnly) chips.push({ key: "stock", label: de ? "Verfügbar" : "In stock", clear: () => setFilters((current) => ({ ...current, availableOnly: false })) });
    if (filters.minPriceRappen !== undefined) chips.push({ key: "min", label: `CHF ${(filters.minPriceRappen / 100).toFixed(2)}+`, clear: () => setFilters((current) => ({ ...current, minPriceRappen: undefined })) });
    if (filters.maxPriceRappen !== undefined) chips.push({ key: "max", label: `${de ? "Bis" : "Up to"} CHF ${(filters.maxPriceRappen / 100).toFixed(2)}`, clear: () => setFilters((current) => ({ ...current, maxPriceRappen: undefined })) });
    if (filters.sort !== "featured") chips.push({ key: "sort", label: sortLabel(filters.sort, de), clear: () => setFilters((current) => ({ ...current, sort: "featured" })) });
    return chips;
  }, [de, filters, selectedCategory?.name]);

  return <Screen>
    <Header title={de ? "Entdecken" : "Discover"} right={<Pressable accessibilityRole="button" accessibilityLabel={de ? `Filter öffnen, ${activeFilterCount} aktiv` : `Open filters, ${activeFilterCount} active`} onPress={() => setFiltersVisible(true)} style={({ pressed }) => [styles.filterButton, activeFilterCount > 0 && styles.filterButtonActive, pressed && styles.pressed]}>
      <SlidersHorizontal color={activeFilterCount > 0 ? colors.surface : colors.primary} size={20}/>
      {activeFilterCount > 0 ? <Text style={styles.filterCount}>{activeFilterCount}</Text> : null}
    </Pressable>}/>
    <FlatList
      data={loading ? [] : products}
      numColumns={2}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      keyExtractor={(item) => item.id}
      columnWrapperStyle={styles.row}
      contentContainerStyle={[styles.list, { width: Math.min(width, 760), alignSelf: "center", paddingHorizontal: gutter }, !products.length && styles.listEmpty]}
      ListHeaderComponent={<View style={styles.listHeader}>
        <View style={styles.searchWrap}>
          <Search color={colors.muted} size={20}/>
          <TextInput accessibilityLabel={de ? "Produkte suchen" : "Search products"} value={query} onChangeText={setQuery} placeholder={de ? "Produkte suchen" : "Search products"} placeholderTextColor={colors.muted} returnKeyType="search" autoCorrect={false} style={styles.searchInput}/>
          {query ? <Pressable accessibilityRole="button" accessibilityLabel={de ? "Suche löschen" : "Clear search"} onPress={() => setQuery("")} hitSlop={8} style={styles.clearSearch}><X color={colors.muted} size={18}/></Pressable> : null}
        </View>
        {activeChips.length ? <FlatList horizontal data={activeChips} keyExtractor={(chip) => chip.key} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipList} renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`${item.label}, ${de ? "entfernen" : "remove"}`} onPress={item.clear} style={({ pressed }) => [styles.activeChip, pressed && styles.pressed]}><Text style={styles.activeChipText}>{item.label}</Text><X color={colors.primary} size={14}/></Pressable>}/> : null}
        {!loading && !error ? <Text accessibilityLiveRegion="polite" style={styles.resultCount}>{total} {de ? (total === 1 ? "Produkt" : "Produkte") : (total === 1 ? "product" : "products")}</Text> : null}
        {loading ? <ProductSkeletons cardWidth={cardWidth}/> : null}
      </View>}
      ListEmptyComponent={!loading ? <StateView icon={Search}
        title={error ? (de ? "Verbindung fehlgeschlagen" : "Couldn’t load products") : (de ? "Keine Produkte gefunden" : "No products found")}
        message={error || (de ? "Ändere deine Suche oder Filter und versuche es erneut." : "Try changing your search or filters.")}
        action={error ? <Button onPress={() => void loadFirstPage()}>{de ? "Erneut versuchen" : "Try again"}</Button> : activeFilterCount ? <Button onPress={() => setFilters(defaultFilters)}>{de ? "Filter zurücksetzen" : "Clear filters"}</Button> : undefined}
      /> : null}
      ListFooterComponent={<ListFooter loading={loadingMore} error={loadMoreError} atEnd={!loading && products.length > 0 && page >= pageCount} de={de} onRetry={() => void loadMore()}/>}
      onRefresh={() => void loadFirstPage(true)}
      refreshing={refreshing}
      onEndReached={() => void loadMore()}
      onEndReachedThreshold={0.45}
      initialNumToRender={8}
      maxToRenderPerBatch={8}
      windowSize={7}
      removeClippedSubviews
      renderItem={({ item }) => <View style={{ width: cardWidth }}><ProductCard product={item} onPress={() => router.push(`/product/${item.slug}`)} style={styles.productCard}/></View>}
    />
    <DiscoverFilterSheet visible={filtersVisible} locale={locale} categories={categories} value={filters} onClose={() => setFiltersVisible(false)} onApply={(next) => { setFilters(next); setFiltersVisible(false); }}/>
  </Screen>;
}

function ProductSkeletons({ cardWidth }: { cardWidth: number }) {
  return <View accessibilityLabel="Loading products" style={styles.skeletonGrid}>{Array.from({ length: 6 }, (_, index) => <View key={index} style={[styles.skeletonCard, { width: cardWidth }]}><View style={styles.skeletonImage}/><View style={styles.skeletonLine}/><View style={styles.skeletonPrice}/></View>)}</View>;
}

function ListFooter({ loading, error, atEnd, de, onRetry }: { loading: boolean; error: string; atEnd: boolean; de: boolean; onRetry: () => void }) {
  if (loading) return <View style={styles.footer}><ActivityIndicator color={colors.primary}/><Text style={styles.footerText}>{de ? "Weitere Produkte werden geladen …" : "Loading more products…"}</Text></View>;
  if (error) return <View style={styles.footer}><Text accessibilityRole="alert" style={styles.footerText}>{error}</Text><Pressable accessibilityRole="button" onPress={onRetry} style={styles.footerRetry}><Text style={styles.footerRetryText}>{de ? "Erneut versuchen" : "Try again"}</Text></Pressable></View>;
  if (atEnd) return <Text style={styles.endText}>{de ? "Du hast alle Produkte gesehen." : "You’ve seen all products."}</Text>;
  return null;
}

function sortLabel(sort: DiscoverFilters["sort"], de: boolean) {
  const labels = de ? { newest: "Neueste", "price-asc": "Preis aufsteigend", "price-desc": "Preis absteigend", name: "Name", featured: "Empfohlen" } : { newest: "Newest", "price-asc": "Price ascending", "price-desc": "Price descending", name: "Name", featured: "Featured" };
  return labels[sort];
}

const styles = StyleSheet.create({
  filterButton: { minWidth: 48, height: 48, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  filterButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterCount: { color: colors.surface, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  list: { gap: space.sm, paddingTop: space.md, paddingBottom: space.xl },
  listEmpty: { flexGrow: 1 },
  listHeader: { gap: space.md, marginBottom: space.sm },
  searchWrap: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  searchInput: { minHeight: 50, flex: 1, color: colors.text, fontSize: 16, paddingVertical: 0 },
  clearSearch: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 20 },
  chipList: { gap: space.sm },
  activeChip: { minHeight: 40, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.surfaceMuted },
  activeChipText: { color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  resultCount: { color: colors.muted, fontSize: 14 },
  row: { gap: space.sm },
  productCard: { width: "auto", flex: 1 },
  skeletonGrid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  skeletonCard: { overflow: "hidden", borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingBottom: 14 },
  skeletonImage: { width: "100%", aspectRatio: 1, backgroundColor: colors.surfaceMuted },
  skeletonLine: { height: 13, marginTop: 14, marginHorizontal: 12, borderRadius: 7, backgroundColor: colors.surfaceMuted },
  skeletonPrice: { width: "42%", height: 13, marginTop: 10, marginHorizontal: 12, borderRadius: 7, backgroundColor: colors.surfaceMuted },
  footer: { minHeight: 80, alignItems: "center", justifyContent: "center", gap: space.sm },
  footerText: { color: colors.muted, fontSize: 14, textAlign: "center" },
  footerRetry: { minHeight: 44, paddingHorizontal: 16, justifyContent: "center" },
  footerRetryText: { color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 14 },
  endText: { paddingVertical: space.lg, color: colors.muted, fontSize: 13, textAlign: "center" },
  pressed: { opacity: 0.76 },
});
