import { Alert, Linking, ScrollView, Text, View } from "react-native";
import { api } from "../src/api";
import { useApp } from "../src/app-state";
import { Button } from "../src/ui";
import { colors, space } from "../src/theme";
export default function Support() {
  const { locale, user } = useApp();
  const open = (path: string) =>
    Linking.openURL(
      `${process.env.EXPO_PUBLIC_WEB_URL || process.env.EXPO_PUBLIC_API_URL}/${locale}/${path}`,
    );
  const deletion = () =>
    Alert.alert(
      locale === "de" ? "Kontolöschung" : "Delete account",
      locale === "de"
        ? "Wir prüfen deine Anfrage. Bestelldaten können aus gesetzlichen Gründen aufbewahrt werden."
        : "We will review your request. Order records may be retained where legally required.",
      [
        { text: locale === "de" ? "Zurück" : "Back", style: "cancel" },
        {
          text: locale === "de" ? "Anfrage senden" : "Send request",
          style: "destructive",
          onPress: () =>
            api
              .deletionRequest()
              .then(() =>
                Alert.alert(
                  locale === "de" ? "Anfrage gesendet" : "Request sent",
                ),
              ),
        },
      ],
    );
  return (
    <ScrollView contentContainerStyle={{ padding: space.md, gap: space.md }}>
      <Text
        accessibilityRole="header"
        style={{
          fontFamily: "Archivo_700Bold",
          fontSize: 26,
          color: colors.primary,
        }}
      >
        {locale === "de" ? "Hilfe & Rechtliches" : "Help & legal"}
      </Text>
      <Text style={{ fontSize: 16, lineHeight: 24, color: colors.text }}>
        {locale === "de"
          ? "Fragen zu einer Bestellung? Kontaktiere uns über die aktuellen Angaben auf der Website."
          : "Questions about an order? Contact us using the current details on the website."}
      </Text>
      <Button kind="secondary" onPress={() => open("contact")}>
        {locale === "de" ? "Kontakt" : "Contact"}
      </Button>
      <Button kind="secondary" onPress={() => open("privacy")}>
        {locale === "de" ? "Datenschutz" : "Privacy"}
      </Button>
      <Button kind="secondary" onPress={() => open("terms")}>
        {locale === "de" ? "Bedingungen" : "Terms"}
      </Button>
      {user ? (
        <View style={{ marginTop: space.xl }}>
          <Button kind="danger" onPress={deletion}>
            {locale === "de"
              ? "Kontolöschung beantragen"
              : "Request account deletion"}
          </Button>
        </View>
      ) : null}
    </ScrollView>
  );
}
