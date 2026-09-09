import { useEffect, useState } from "react";
import { FlatList, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Search } from "lucide-react-native";
import { api } from "../../src/api";
import { useApp } from "../../src/app-state";
import { t } from "../../src/i18n";
import type { Product } from "../../src/types";
import { Empty, Field, Header, ProductCard, Screen } from "../../src/ui";
import { colors, space } from "../../src/theme";

export default function ShopScreen() {
  const { locale } = useApp(); const copy = t(locale); const params = useLocalSearchParams<{ category?: string }>();
  const [query, setQuery] = useState(""); const [products, setProducts] = useState<Product[]>([]); const [page, setPage] = useState(1); const [pageCount, setPageCount] = useState(1); const [loadingMore, setLoadingMore] = useState(false); const [error, setError] = useState("");
  const queryString = (nextPage: number) => new URLSearchParams({ locale, page: String(nextPage), ...(query ? { query } : {}), ...(params.category ? { category: params.category } : {}) }).toString();

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => api.productsPage(queryString(1)).then((result) => { if (!cancelled) { setProducts(result.items); setPage(result.page); setPageCount(result.pageCount); setError(""); } }).catch(() => { if (!cancelled) { setProducts([]); setError(locale === "de" ? "Produkte konnten nicht geladen werden." : "Products could not be loaded."); } }), 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, params.category, locale]);

  const loadMore = async () => {
    if (loadingMore || page >= pageCount) return;
    setLoadingMore(true);
    try { const result = await api.productsPage(queryString(page + 1)); setProducts((current) => [...current, ...result.items]); setPage(result.page); setPageCount(result.pageCount); }
    catch { setError(locale === "de" ? "Weitere Produkte konnten nicht geladen werden." : "More products could not be loaded."); }
    finally { setLoadingMore(false); }
  };

  return <Screen><Header title={copy.shop}/><View style={{ padding: space.md }}><View style={{ position: "relative" }}><Field label={copy.search} value={query} onChangeText={setQuery} returnKeyType="search"/><Search color={colors.muted} size={20} style={{ position: "absolute", right: 14, bottom: 14 }}/></View></View><FlatList data={products} numColumns={2} keyboardShouldPersistTaps="handled" keyExtractor={(item) => item.id} columnWrapperStyle={{ gap: space.sm }} contentContainerStyle={{ paddingHorizontal: space.md, gap: space.sm, paddingBottom: space.xl }} ListEmptyComponent={<Empty>{error || copy.emptyProducts}</Empty>} onEndReached={loadMore} onEndReachedThreshold={0.5} renderItem={({ item }) => <ProductCard product={item} onPress={() => router.push(`/product/${item.slug}`)}/>} /></Screen>;
}
