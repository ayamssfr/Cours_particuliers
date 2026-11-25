import React, { useState } from "react";
import { View, KeyboardAvoidingView, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, radius } from "./theme";
import { api, auth } from "./api";
import { T, Field, Button, ErrorText } from "./ui";

// Écran affiché quand le serveur demande le mot de passe
export function LoginScreen({ onLoggedIn }) {
  const t = useTheme();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const login = async () => {
    setError(null);
    setLoading(true);
    try {
      const { token } = await api.login(password);
      await auth.save(token);
      onLoggedIn();
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={t.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "center", padding: 24 }}>
          <T v="label" color={t.heroMuted}>Cours particuliers</T>
          <T v="display" color={t.heroText} style={{ fontSize: 44, marginTop: 6, marginBottom: 28 }}>Mes cours</T>
          <View style={{ backgroundColor: t.surface, borderRadius: radius.lg, padding: 20 }}>
            <Field
              label="Mot de passe"
              secureTextEntry
              autoFocus
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={login}
              returnKeyType="go"
            />
            <ErrorText message={error} />
            <Button title="Entrer" loading={loading} onPress={login} />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}
