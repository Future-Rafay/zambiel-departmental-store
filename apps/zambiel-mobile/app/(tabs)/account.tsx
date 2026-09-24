import { router } from "expo-router";
import {
  ChevronRight,
  Heart,
  Languages,
  LifeBuoy,
  LogIn,
  LogOut,
  MapPin,
  type LucideIcon,
} from "lucide-react-native";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useApp } from "../../src/app-state";
import { t } from "../../src/i18n";
import { colors, space } from "../../src/theme";
import { Header, Screen } from "../../src/ui";

function AccountRow({
  icon: Icon,
  label,
  onPress,
  danger = false,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const color = danger ? colors.danger : colors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 62,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 14,
        borderRadius: 14,
        backgroundColor: pressed
          ? danger
            ? colors.dangerSoft
            : colors.primarySoft
          : colors.surface,
      })}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: danger ? colors.dangerSoft : colors.primarySoft,
        }}
      >
        <Icon color={color} size={20} />
      </View>
      <Text
        style={{
          flex: 1,
          fontFamily: "Inter_600SemiBold",
          fontSize: 15,
          color,
        }}
      >
        {label}
      </Text>
      {danger ? null : <ChevronRight color={colors.muted} size={19} />}
    </Pressable>
  );
}
export default function AccountScreen() {
  const { user, logout, locale, setLocale } = useApp();
  const copy = t(locale);
  return (
    <Screen>
      <Header title={copy.account} />
      <ScrollView
        contentContainerStyle={{
          padding: space.md,
          gap: space.lg,
          paddingBottom: space.xl,
        }}
      >
        {user ? (
          <View
            style={{
              padding: 22,
              borderRadius: 20,
              backgroundColor: colors.primary,
              borderBottomWidth: 4,
              borderBottomColor: colors.accent,
            }}
          >
            <Text
              style={{
                color: colors.accent,
                fontFamily: "Inter_600SemiBold",
                fontSize: 12,
                letterSpacing: 1,
              }}
            >
              {locale === "de" ? "DEIN KONTO" : "YOUR ACCOUNT"}
            </Text>
            <Text
              style={{
                marginTop: 6,
                fontFamily: "Archivo_700Bold",
                fontSize: 24,
                color: colors.surface,
              }}
            >
              {user.name || user.email}
            </Text>
            <Text
              style={{ color: colors.surface, opacity: 0.78, marginTop: 4 }}
            >
              {user.email}
            </Text>
          </View>
        ) : (
          <View
            style={{
              padding: 22,
              borderRadius: 20,
              backgroundColor: colors.primarySoft,
              gap: 10,
            }}
          >
            <Text
              accessibilityRole="header"
              style={{
                fontFamily: "Archivo_700Bold",
                fontSize: 23,
                color: colors.text,
              }}
            >
              {locale === "de"
                ? "Willkommen bei Zambiel"
                : "Welcome to Zambiel"}
            </Text>
            <Text style={{ color: colors.muted, lineHeight: 22 }}>
              {locale === "de"
                ? "Melde dich an, um Wunschlisten, Adressen und Bestellungen zu verwalten."
                : "Sign in to manage saved products, addresses, and orders."}
            </Text>
            <AccountRow
              icon={LogIn}
              label={copy.login}
              onPress={() => router.push("/auth")}
            />
          </View>
        )}
        <View style={{ gap: 8 }}>
          {user ? (
            <>
              <AccountRow
                icon={Heart}
                label={copy.wishlist}
                onPress={() => router.push("/wishlist")}
              />
              <AccountRow
                icon={MapPin}
                label={copy.addresses}
                onPress={() => router.push("/addresses")}
              />
            </>
          ) : null}
          <AccountRow
            icon={Languages}
            label={locale === "de" ? "English" : "Deutsch"}
            onPress={() => setLocale(locale === "de" ? "en" : "de")}
          />
          <AccountRow
            icon={LifeBuoy}
            label={copy.support}
            onPress={() => router.push("/support")}
          />
        </View>
        {user ? (
          <View
            style={{
              marginTop: space.md,
              paddingTop: space.md,
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}
          >
            <AccountRow
              danger
              icon={LogOut}
              label={copy.logout}
              onPress={() =>
                Alert.alert(
                  copy.logout,
                  locale === "de"
                    ? "Möchtest du dich wirklich abmelden?"
                    : "Are you sure you want to sign out?",
                  [
                    {
                      text: locale === "de" ? "Zurück" : "Back",
                      style: "cancel",
                    },
                    {
                      text: copy.logout,
                      style: "destructive",
                      onPress: logout,
                    },
                  ],
                )
              }
            />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
