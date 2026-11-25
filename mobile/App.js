import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Animated,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts, PlayfairDisplay_600SemiBold, PlayfairDisplay_700Bold } from "@expo-google-fonts/playfair-display";
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from "@expo-google-fonts/dm-sans";

import { themes, ThemeContext, useTheme, fonts, radius } from "./src/theme";
import { NavContext, useNav } from "./src/nav";
import { HomeTab, PlanningTab, StudentsTab, MoneyTab } from "./src/tabs";
import { StudentPage, SessionPage } from "./src/pages";
import { StudentSheet, PlanSheet, CompleteSheet, PaymentSheet } from "./src/sheets";
import { auth } from "./src/api";
import { LoginScreen } from "./src/login";

const TABS = [
  { key: "home", label: "Accueil", icon: "home", Screen: HomeTab },
  { key: "planning", label: "Planning", icon: "calendar", Screen: PlanningTab },
  { key: "students", label: "Élèves", icon: "people", Screen: StudentsTab },
  { key: "money", label: "Argent", icon: "wallet", Screen: MoneyTab },
];

const PAGES = { student: StudentPage, session: SessionPage };

const SHEETS = {
  student: { title: (p) => (p.student ? "Modifier le profil" : "Nouvel élève"), Component: StudentSheet },
  plan: { title: (p) => (p.session ? "Déplacer le cours" : "Planifier un cours"), Component: PlanSheet },
  complete: { title: (p) => (p.edit ? "Compte-rendu" : "Terminer la séance"), Component: CompleteSheet },
  payment: { title: () => "Nouveau paiement", Component: PaymentSheet },
};

export default function App() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });
  const [mode, setMode] = useState("light");
  // "checking" au démarrage, "login" si le serveur demande le mot de passe
  const [session, setSession] = useState("checking");

  // Retient le thème choisi et le jeton de connexion
  useEffect(() => {
    AsyncStorage.getItem("theme").then((m) => m && setMode(m)).catch(() => {});
    auth.onLoggedOut(() => setSession("login"));
    auth.load().finally(() => setSession("ok"));
  }, []);
  const themeValue = useMemo(
    () => ({
      theme: themes[mode],
      toggleTheme: () => {
        const next = mode === "light" ? "dark" : "light";
        setMode(next);
        AsyncStorage.setItem("theme", next).catch(() => {});
      },
    }),
    [mode]
  );

  if (!fontsLoaded || session === "checking") return null;
  return (
    <SafeAreaProvider>
      <ThemeContext.Provider value={themeValue}>
        {session === "login" ? <LoginScreen onLoggedIn={() => setSession("ok")} /> : <Main />}
      </ThemeContext.Provider>
    </SafeAreaProvider>
  );
}

function Main() {
  const t = useTheme();
  const [tab, setTab] = useState("home");
  const [stack, setStack] = useState([]); // pages ouvertes : { type, id, key }
  const [sheet, setSheet] = useState(null); // formulaire ouvert : { type, props }
  const [version, setVersion] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const nav = useMemo(
    () => ({
      version,
      refresh: () => setVersion((v) => v + 1),
      openStudent: (id) => setStack((s) => [...s, { type: "student", id, key: Date.now() }]),
      openSession: (id) => setStack((s) => [...s, { type: "session", id, key: Date.now() }]),
      back: () => setStack((s) => s.slice(0, -1)),
      openSheet: (type, props = {}) => setSheet({ type, props, key: Date.now() }),
      closeSheet: () => setSheet(null),
    }),
    [version]
  );

  // Bouton retour Android
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (sheet) return setSheet(null), true;
      if (stack.length) return setStack((s) => s.slice(0, -1)), true;
      return false;
    });
    return () => sub.remove();
  }, [sheet, stack]);

  const changeTab = (key) => {
    setStack([]);
    setTab(key);
  };

  const { Screen } = TABS.find((x) => x.key === tab);

  return (
    <NavContext.Provider value={nav}>
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <StatusBar style={t.mode === "dark" ? "light" : "dark"} />
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
          <ScrollView
            contentContainerStyle={styles.content}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                tintColor={t.primary}
                onRefresh={() => {
                  setRefreshing(true);
                  nav.refresh();
                  setTimeout(() => setRefreshing(false), 600);
                }}
              />
            }
          >
            <Screen key={tab} />
          </ScrollView>
        </SafeAreaView>
        <TabBar current={tab} onChange={changeTab} />

        {stack.map((page) => {
          const Page = PAGES[page.type];
          return (
            <PageShell key={page.key}>
              <Page id={page.id} />
            </PageShell>
          );
        })}

        {sheet && (
          <SheetShell key={sheet.key} title={SHEETS[sheet.type].title(sheet.props)}>
            {React.createElement(SHEETS[sheet.type].Component, sheet.props)}
          </SheetShell>
        )}
      </View>
    </NavContext.Provider>
  );
}

// Page plein écran qui glisse depuis la droite
function PageShell({ children }) {
  const t = useTheme();
  const nav = useNav();
  const x = useRef(new Animated.Value(60)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(x, { toValue: 0, duration: 220, useNativeDriver: Platform.OS !== "web" }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: Platform.OS !== "web" }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: t.bg, opacity, transform: [{ translateX: x }] }]}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <View style={styles.pageHeader}>
          <Pressable onPress={nav.back} hitSlop={10} style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="chevron-back" size={22} color={t.primary} />
            <Text style={{ color: t.primary, fontFamily: fonts.bold, fontSize: 15 }}>Retour</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={[styles.content, { paddingTop: 6 }]} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </SafeAreaView>
    </Animated.View>
  );
}

// Fenêtre de formulaire qui monte du bas
function SheetShell({ title, children }) {
  const t = useTheme();
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const y = useRef(new Animated.Value(400)).current;
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(y, { toValue: 0, duration: 260, useNativeDriver: Platform.OS !== "web" }),
      Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: Platform.OS !== "web" }),
    ]).start();
  }, []);
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(20,4,10,0.45)", opacity: fade }]}>
        <Pressable style={{ flex: 1 }} onPress={nav.closeSheet} />
      </Animated.View>
      <View style={{ flex: 1 }} pointerEvents="box-none" />
      <Animated.View
        style={{
          backgroundColor: t.surface,
          borderTopLeftRadius: radius.lg,
          borderTopRightRadius: radius.lg,
          maxHeight: "90%",
          paddingBottom: insets.bottom + 10,
          transform: [{ translateY: y }],
        }}
      >
        <View style={styles.sheetHeader}>
          <Text style={{ fontFamily: fonts.serif, fontSize: 22, color: t.text }}>{title}</Text>
          <Pressable onPress={nav.closeSheet} hitSlop={10}>
            <Ionicons name="close" size={24} color={t.muted} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 10 }} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

function TabBar({ current, onChange }) {
  const t = useTheme();
  return (
    <SafeAreaView edges={["bottom"]} style={{ flexDirection: "row", backgroundColor: t.surface, borderTopWidth: 1, borderTopColor: t.border }}>
      {TABS.map((tab) => {
        const active = tab.key === current;
        return (
          <Pressable key={tab.key} style={styles.tab} onPress={() => onChange(tab.key)}>
            <View style={{ height: 2, width: 28, backgroundColor: active ? t.primary : "transparent", marginBottom: 8 }} />
            <Ionicons name={active ? tab.icon : `${tab.icon}-outline`} size={22} color={active ? t.primary : t.muted} />
            <Text style={{ fontSize: 11, fontFamily: active ? fonts.bold : fonts.medium, color: active ? t.primary : t.muted, marginTop: 3, marginBottom: 6 }}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 48 },
  tab: { flex: 1, alignItems: "center" },
  pageHeader: { paddingHorizontal: 14, paddingVertical: 10 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14 },
});
