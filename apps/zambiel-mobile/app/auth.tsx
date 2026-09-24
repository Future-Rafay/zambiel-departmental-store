import { useState } from "react";
import { Alert, ScrollView, Text } from "react-native";
import { router } from "expo-router";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { api } from "../src/api";
import { useApp } from "../src/app-state";
import { t } from "../src/i18n";
import { Button, Field } from "../src/ui";
import { colors, space } from "../src/theme";

export default function AuthScreen() {
  const { authenticate, locale } = useApp();
  const copy = t(locale);
  const [register, setRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (
      !email.includes("@") ||
      password.length < 10 ||
      (register && !name.trim())
    )
      return Alert.alert(
        locale === "de" ? "Eingaben prüfen" : "Check your details",
      );
    setBusy(true);
    try {
      await authenticate(
        register
          ? await api.register(name.trim(), email, password)
          : await api.login(email, password),
      );
      router.back();
    } catch (cause) {
      Alert.alert(
        locale === "de" ? "Anmeldung fehlgeschlagen" : "Sign-in failed",
        String((cause as Error).message),
      );
    } finally {
      setBusy(false);
    }
  };
  const google = async () => {
    try {
      if (!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID)
        throw new Error("GOOGLE_CLIENT_ID_MISSING");
      await GoogleSignin.hasPlayServices();
      const result = await GoogleSignin.signIn();
      const token = result.data?.idToken;
      if (!token) throw new Error("GOOGLE_TOKEN_MISSING");
      await authenticate(await api.google(token));
      router.back();
    } catch (cause) {
      Alert.alert("Google", String((cause as Error).message));
    }
  };
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        padding: space.lg,
        gap: space.md,
        backgroundColor: colors.background,
        flexGrow: 1,
      }}
    >
      <Text
        accessibilityRole="header"
        style={{
          fontFamily: "Archivo_700Bold",
          fontSize: 28,
          color: colors.primary,
        }}
      >
        {register ? copy.register : copy.login}
      </Text>
      {register ? (
        <Field
          label="Name"
          value={name}
          onChangeText={setName}
          autoComplete="name"
        />
      ) : null}
      <Field
        label="E-Mail"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
      <Field
        label={
          locale === "de"
            ? "Passwort (mindestens 10 Zeichen)"
            : "Password (at least 10 characters)"
        }
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete={register ? "new-password" : "current-password"}
      />
      <Button disabled={busy} onPress={submit}>
        {register ? copy.register : copy.login}
      </Button>
      {!register ? (
        <Button
          kind="secondary"
          onPress={() =>
            email.includes("@")
              ? api
                  .forgotPassword(email)
                  .then(() =>
                    Alert.alert(
                      locale === "de"
                        ? "Prüfe deine E-Mails"
                        : "Check your email",
                    ),
                  )
              : Alert.alert(
                  locale === "de" ? "E-Mail eingeben" : "Enter your email",
                )
          }
        >
          {locale === "de" ? "Passwort vergessen?" : "Forgot password?"}
        </Button>
      ) : null}
      <Button kind="secondary" onPress={google}>
        {locale === "de" ? "Mit Google fortfahren" : "Continue with Google"}
      </Button>
      <Button kind="secondary" onPress={() => setRegister(!register)}>
        {register ? copy.login : copy.register}
      </Button>
    </ScrollView>
  );
}
