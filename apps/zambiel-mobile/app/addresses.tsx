import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { api } from "../src/api";
import type { Address } from "../src/types";
import { Button, Empty, Field } from "../src/ui";
import { colors, space } from "../src/theme";
import { useApp } from "../src/app-state";

const blank = {
  label: "",
  recipientName: "",
  phone: "",
  street: "",
  streetExtra: null,
  city: "",
  countryCode: "CH",
  isDefault: false,
};
export default function Addresses() {
  const { locale } = useApp();
  const [items, setItems] = useState<Address[]>([]);
  const [draft, setDraft] = useState<Partial<Address> | null>(null);
  const load = () => api.addresses().then(setItems);
  useEffect(() => {
    load();
  }, []);
  const save = async () => {
    if (
      !draft?.label ||
      !draft.recipientName ||
      !draft.phone ||
      !draft.street ||
      !draft.city
    )
      return Alert.alert(
        locale === "de"
          ? "Bitte alle Pflichtfelder ausfüllen."
          : "Complete all required fields.",
      );
    await api.saveAddress(draft);
    setDraft(null);
    load();
  };
  const remove = (address: Address) =>
    Alert.alert(
      locale === "de" ? "Adresse löschen?" : "Delete address?",
      address.label,
      [
        { text: locale === "de" ? "Zurück" : "Back", style: "cancel" },
        {
          text: locale === "de" ? "Löschen" : "Delete",
          style: "destructive",
          onPress: () => api.deleteAddress(address.id).then(load),
        },
      ],
    );
  if (draft)
    return (
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: space.md, gap: space.md }}
      >
        <Field
          label={locale === "de" ? "Bezeichnung" : "Label"}
          value={draft.label}
          onChangeText={(value) => setDraft({ ...draft, label: value })}
        />
        <Field
          label="Name"
          value={draft.recipientName}
          onChangeText={(value) => setDraft({ ...draft, recipientName: value })}
        />
        <Field
          label={locale === "de" ? "Telefon" : "Phone"}
          value={draft.phone}
          onChangeText={(value) => setDraft({ ...draft, phone: value })}
        />
        <Field
          label={locale === "de" ? "Strasse" : "Street"}
          value={draft.street}
          onChangeText={(value) => setDraft({ ...draft, street: value })}
        />
        <Field
          label={locale === "de" ? "Adresszusatz" : "Address line 2"}
          value={draft.streetExtra || ""}
          onChangeText={(value) =>
            setDraft({ ...draft, streetExtra: value || null })
          }
        />
        <Field
          label={locale === "de" ? "Ort" : "City"}
          value={draft.city}
          onChangeText={(value) => setDraft({ ...draft, city: value })}
        />
        <Field
          label={locale === "de" ? "Land (ISO)" : "Country (ISO)"}
          value={draft.countryCode}
          autoCapitalize="characters"
          maxLength={2}
          onChangeText={(value) =>
            setDraft({ ...draft, countryCode: value.toUpperCase() })
          }
        />
        <Button onPress={save}>{locale === "de" ? "Speichern" : "Save"}</Button>
        <Button kind="secondary" onPress={() => setDraft(null)}>
          {locale === "de" ? "Zurück" : "Back"}
        </Button>
      </ScrollView>
    );
  return (
    <ScrollView contentContainerStyle={{ padding: space.md, gap: space.md }}>
      {!items.length ? (
        <Empty>
          {locale === "de" ? "Noch keine Adressen." : "No addresses yet."}
        </Empty>
      ) : (
        items.map((address) => (
          <View
            key={address.id}
            style={{
              padding: 16,
              gap: 10,
              borderRadius: 14,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ fontFamily: "Archivo_700Bold", fontSize: 17 }}>
              {address.label}
              {address.isDefault
                ? " · " + (locale === "de" ? "Standard" : "Default")
                : ""}
            </Text>
            <Text style={{ color: colors.muted }}>
              {address.recipientName}
              {"\n"}
              {address.street}
              {address.streetExtra ? "\n" + address.streetExtra : ""}
              {"\n"}
              {address.city}, {address.countryCode}
            </Text>
            <Button kind="secondary" onPress={() => setDraft(address)}>
              {locale === "de" ? "Bearbeiten" : "Edit"}
            </Button>
            {!address.isDefault ? (
              <Button
                kind="secondary"
                onPress={() =>
                  api
                    .saveAddress({ id: address.id, isDefault: true })
                    .then(load)
                }
              >
                {locale === "de" ? "Als Standard festlegen" : "Set as default"}
              </Button>
            ) : null}
            <View style={{ marginTop: space.md }}>
              <Button kind="danger" onPress={() => remove(address)}>
                {locale === "de" ? "Löschen" : "Delete"}
              </Button>
            </View>
          </View>
        ))
      )}
      <Button onPress={() => setDraft(blank)}>
        {locale === "de" ? "Adresse hinzufügen" : "Add address"}
      </Button>
    </ScrollView>
  );
}
