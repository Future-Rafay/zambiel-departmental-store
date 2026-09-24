import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Check, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, space } from "./theme";
import type { Category, Locale } from "./types";

export type CatalogSort =
  | "featured"
  | "newest"
  | "price-asc"
  | "price-desc"
  | "name";
export type DiscoverFilters = {
  category?: string;
  availableOnly: boolean;
  minPriceRappen?: number;
  maxPriceRappen?: number;
  sort: CatalogSort;
};

type Props = {
  visible: boolean;
  locale: Locale;
  categories: Category[];
  value: DiscoverFilters;
  onApply: (filters: DiscoverFilters) => void;
  onClose: () => void;
};

const emptyFilters: DiscoverFilters = {
  availableOnly: false,
  sort: "featured",
};
const toFrancs = (rappen?: number) =>
  rappen === undefined ? "" : String(rappen / 100);
const toRappen = (value: string) => {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return undefined;
  const francs = Number(normalized);
  return Number.isFinite(francs) && francs >= 0
    ? Math.round(francs * 100)
    : null;
};

export function DiscoverFilterSheet({
  visible,
  locale,
  categories,
  value,
  onApply,
  onClose,
}: Props) {
  const de = locale === "de";
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(value);
  const [minPrice, setMinPrice] = useState(toFrancs(value.minPriceRappen));
  const [maxPrice, setMaxPrice] = useState(toFrancs(value.maxPriceRappen));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) return;
    setDraft(value);
    setMinPrice(toFrancs(value.minPriceRappen));
    setMaxPrice(toFrancs(value.maxPriceRappen));
    setError("");
  }, [value, visible]);

  const apply = () => {
    const min = toRappen(minPrice);
    const max = toRappen(maxPrice);
    if (
      min === null ||
      max === null ||
      (min !== undefined && max !== undefined && min > max)
    ) {
      setError(
        de
          ? "Bitte gib einen gültigen Preisbereich ein."
          : "Enter a valid price range.",
      );
      return;
    }
    onApply({ ...draft, minPriceRappen: min, maxPriceRappen: max });
  };

  const clear = () => {
    setDraft(emptyFilters);
    setMinPrice("");
    setMaxPrice("");
    setError("");
  };

  const sorts: { value: CatalogSort; label: string }[] = de
    ? [
        { value: "featured", label: "Empfohlen" },
        { value: "newest", label: "Neueste" },
        { value: "price-asc", label: "Preis: niedrig bis hoch" },
        { value: "price-desc", label: "Preis: hoch bis niedrig" },
        { value: "name", label: "Name" },
      ]
    : [
        { value: "featured", label: "Featured" },
        { value: "newest", label: "Newest" },
        { value: "price-asc", label: "Price: low to high" },
        { value: "price-desc", label: "Price: high to low" },
        { value: "name", label: "Name" },
      ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel={de ? "Filter schließen" : "Close filters"}
        />
        <View
          style={styles.sheet}
          accessibilityViewIsModal
          accessibilityRole="none"
        >
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.title}>
              {de ? "Filter & Sortierung" : "Filter & sort"}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={de ? "Filter schließen" : "Close filters"}
              hitSlop={10}
              onPress={onClose}
              style={styles.iconButton}
            >
              <X color={colors.text} size={22} />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.sectionTitle}>
              {de ? "Kategorie" : "Category"}
            </Text>
            <View style={styles.chips}>
              <Choice
                selected={!draft.category}
                label={de ? "Alle" : "All"}
                onPress={() =>
                  setDraft((current) => ({ ...current, category: undefined }))
                }
              />
              {categories.map((category) => (
                <Choice
                  key={category.id}
                  selected={draft.category === category.slug}
                  label={category.name}
                  onPress={() =>
                    setDraft((current) => ({
                      ...current,
                      category: category.slug,
                    }))
                  }
                />
              ))}
            </View>

            <Text style={styles.sectionTitle}>{de ? "Sortieren" : "Sort"}</Text>
            <View style={styles.options}>
              {sorts.map((sort) => (
                <Choice
                  key={sort.value}
                  selected={draft.sort === sort.value}
                  label={sort.label}
                  onPress={() =>
                    setDraft((current) => ({ ...current, sort: sort.value }))
                  }
                />
              ))}
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchCopy}>
                <Text style={styles.switchTitle}>
                  {de ? "Nur verfügbare Artikel" : "In-stock products only"}
                </Text>
                <Text style={styles.hint}>
                  {de
                    ? "Nicht verfügbare Produkte ausblenden"
                    : "Hide products that are unavailable"}
                </Text>
              </View>
              <Switch
                accessibilityLabel={
                  de ? "Nur verfügbare Artikel" : "In-stock products only"
                }
                value={draft.availableOnly}
                onValueChange={(availableOnly) =>
                  setDraft((current) => ({ ...current, availableOnly }))
                }
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.surface}
              />
            </View>

            <Text style={styles.sectionTitle}>
              {de ? "Preisbereich" : "Price range"}
            </Text>
            <View style={styles.priceRow}>
              <PriceField
                label={de ? "Min. CHF" : "Min CHF"}
                value={minPrice}
                onChangeText={setMinPrice}
              />
              <PriceField
                label={de ? "Max. CHF" : "Max CHF"}
                value={maxPrice}
                onChangeText={setMaxPrice}
              />
            </View>
            {error ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
            ) : null}
          </ScrollView>
          <View
            style={[
              styles.actions,
              { paddingBottom: Math.max(insets.bottom, space.md) },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              onPress={clear}
              style={({ pressed }) => [
                styles.clearButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.clearText}>
                {de ? "Zurücksetzen" : "Clear"}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={apply}
              style={({ pressed }) => [
                styles.applyButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.applyText}>{de ? "Anwenden" : "Apply"}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Choice({
  selected,
  label,
  onPress,
}: {
  selected: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        selected && styles.choiceSelected,
        pressed && styles.pressed,
      ]}
    >
      {selected ? <Check color={colors.surface} size={15} /> : null}
      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

function PriceField({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.priceField}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
        placeholder="0.00"
        placeholderTextColor={colors.muted}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: colors.overlay,
  },
  sheet: {
    maxHeight: "90%",
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  header: {
    minHeight: 64,
    paddingHorizontal: space.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  title: { color: colors.text, fontFamily: "Archivo_700Bold", fontSize: 22 },
  iconButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
  },
  content: { padding: space.md, paddingBottom: space.lg },
  sectionTitle: {
    color: colors.text,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    marginTop: space.sm,
    marginBottom: space.sm,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  options: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  choice: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  choiceSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  choiceText: {
    color: colors.text,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  choiceTextSelected: { color: colors.surface },
  switchRow: {
    minHeight: 72,
    marginTop: space.md,
    paddingVertical: space.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  switchCopy: { flex: 1 },
  switchTitle: {
    color: colors.text,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  hint: { color: colors.muted, fontSize: 13, marginTop: 2 },
  priceRow: { flexDirection: "row", gap: space.sm },
  priceField: { flex: 1, gap: 6 },
  inputLabel: {
    color: colors.muted,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  input: {
    minHeight: 48,
    paddingHorizontal: 14,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    fontSize: 16,
  },
  error: { color: colors.danger, marginTop: space.sm, fontSize: 13 },
  actions: {
    flexDirection: "row",
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingTop: space.sm,
    paddingBottom: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  clearButton: {
    minHeight: 50,
    minWidth: 116,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  clearText: {
    color: colors.primary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  applyButton: {
    minHeight: 50,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  applyText: {
    color: colors.surface,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  pressed: { opacity: 0.78 },
});
