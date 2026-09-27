import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAuthState } from "@/lib/auth-context";

function ping() {
  if (Platform.OS !== "web") {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

export default function LoginScreen() {
  const colors = useColors();
  const { status, signIn } = useAuthState();
  const [schoolUrl, setSchoolUrl] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "signed_in") {
      router.replace("/(tabs)");
    }
  }, [status]);

  const handleSubmit = async () => {
    ping();
    setError(null);
    setSubmitting(true);
    try {
      await signIn({ schoolUrl, email, password });
      router.replace("/(tabs)");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Přihlášení se nepodařilo.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer className="px-5" edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View className="flex-1 justify-between py-5">
          <View>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary" style={styles.logoShadow}>
                  <Text className="text-2xl font-bold text-white">B</Text>
                </View>
                <View>
                  <Text className="text-base font-bold text-foreground">Bakaláři Mobile</Text>
                  <Text className="mt-0.5 text-xs text-muted">Školní přehled jednoduše</Text>
                </View>
              </View>
              <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: "#E5EEFF" }}>
                <Text className="text-[10px] font-bold uppercase tracking-wider text-primary">API</Text>
              </View>
            </View>

            <View className="mt-12">
              <Text className="text-4xl font-bold leading-tight text-foreground">Vítej zpět.</Text>
              <Text className="mt-3 text-base leading-6 text-muted">Připoj svůj školní účet a měj rozvrh, známky i úkoly vždy po ruce.</Text>
            </View>

            <View className="mt-8 gap-4">
              <View>
                <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Adresa školy</Text>
                <View className="flex-row items-center rounded-2xl bg-surface px-4" style={[styles.inputShell, { borderColor: colors.border }]}>
                  <IconSymbol name="link" size={19} color={colors.muted} />
                  <TextInput
                    value={schoolUrl}
                    onChangeText={setSchoolUrl}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    placeholder="např. skola.bakalari.cz"
                    placeholderTextColor={colors.muted}
                    style={[styles.input, { color: colors.foreground }]}
                  />
                </View>
              </View>

              <View>
                <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">E-mail nebo uživatelské jméno</Text>
                <View className="flex-row items-center rounded-2xl bg-surface px-4" style={[styles.inputShell, { borderColor: colors.border }]}>
                  <IconSymbol name="person.crop.circle" size={20} color={colors.muted} />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    placeholder="uživatelské jméno"
                    placeholderTextColor={colors.muted}
                    style={[styles.input, { color: colors.foreground }]}
                  />
                </View>
              </View>

              <View>
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="text-xs font-bold uppercase tracking-wider text-muted">Heslo</Text>
                  <Pressable onPress={() => setError("Obnovu hesla řeší tvoje škola nebo školní správce.")}>
                    <Text className="text-xs font-bold text-primary">Potřebuješ pomoc?</Text>
                  </Pressable>
                </View>
                <View className="flex-row items-center rounded-2xl bg-surface px-4" style={[styles.inputShell, { borderColor: colors.border }]}>
                  <IconSymbol name="book.closed" size={19} color={colors.muted} />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry
                    placeholder="Tvoje heslo"
                    placeholderTextColor={colors.muted}
                    style={[styles.input, { color: colors.foreground }]}
                  />
                </View>
              </View>
            </View>

            {error ? (
              <View className="mt-4 flex-row items-center gap-2 rounded-2xl px-4 py-3" style={{ backgroundColor: "#FFF0F1" }}>
                <IconSymbol name="info.circle" size={18} color={colors.error} />
                <Text className="flex-1 text-xs font-semibold" style={{ color: colors.error }}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              disabled={submitting}
              onPress={handleSubmit}
              style={({ pressed }) => [styles.submitButton, pressed && styles.pressed, submitting && styles.disabled]}
            >
              {submitting ? <ActivityIndicator color="#FFFFFF" /> : <><Text className="text-base font-bold text-white">Přihlásit ke škole</Text><IconSymbol name="chevron.right" size={19} color="#FFFFFF" /></>}
            </Pressable>

            <View className="mt-5 flex-row items-start gap-2 rounded-2xl border border-border bg-surface p-4">
              <IconSymbol name="info.circle" size={18} color={colors.primary} />
              <Text className="flex-1 text-xs leading-5 text-muted">Přihlášení používá OAuth endpoint školy. Heslo se po přihlášení neukládá; na telefonu jsou tokeny v SecureStore, webové preview používá lokální fallback.</Text>
            </View>
          </View>

          <Text className="pb-1 text-center text-xs text-muted">Používáním aplikace souhlasíš s podmínkami školy.</Text>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  keyboard: { flex: 1 },
  logoShadow: { shadowColor: "#2F7DF6", shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  inputShell: { minHeight: 54, borderWidth: 1, borderColor: "#E5EAF2" },
  input: { flex: 1, minHeight: 52, marginLeft: 10, color: "#172033", fontSize: 15 },
  submitButton: { marginTop: 22, minHeight: 54, borderRadius: 17, backgroundColor: "#2F7DF6", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, shadowColor: "#2F7DF6", shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 4 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.65 },
});
