import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, fonts, radius } from "./theme";
import { T, Badge, Card } from "./ui";
import { euro, hours, time, dayNumber, monthShort, relativeDay } from "./format";

// Carré date (jour + mois)
export function DateBox({ date, highlight }) {
  const t = useTheme();
  return (
    <View
      style={{
        width: 48,
        paddingVertical: 6,
        borderRadius: radius.sm,
        alignItems: "center",
        backgroundColor: highlight ? t.primary : t.surfaceAlt,
      }}
    >
      <Text style={{ fontFamily: fonts.serif, fontSize: 19, color: highlight ? t.onPrimary : t.text }}>{dayNumber(date)}</Text>
      <Text style={{ fontFamily: fonts.medium, fontSize: 11, color: highlight ? t.onPrimary : t.muted }}>{monthShort(date)}</Text>
    </View>
  );
}

// Ligne de séance (planning, historique)
export function SessionRow({ session, onPress, showName = true, showAmount }) {
  const t = useTheme();
  const planned = session.status === "planned";
  const sub = [
    planned ? relativeDay(session.date) : null,
    session.time ? time(session.time) : null,
    hours(session.duration_hours),
    !showName ? null : session.subject,
  ].filter(Boolean);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: t.border,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <DateBox date={session.date} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <T v="strong">{showName ? session.student_name : session.subject || "Séance"}</T>
        <T v="small" muted style={{ marginTop: 2 }}>{sub.join(" · ")}</T>
        {!planned && session.notes ? (
          <T v="small" numberOfLines={1} style={{ marginTop: 3 }}>{session.notes}</T>
        ) : null}
      </View>
      {showAmount && !planned ? (
        <View style={{ alignItems: "flex-end" }}>
          <T v="strong">{euro(session.amount)}</T>
          {session.via_agency ? (
            <T v="small" color={session.agency_paid_at ? t.success : t.warning} style={{ marginTop: 2 }}>
              {session.agency_paid_at ? "Progrétudes ✓" : "Progrétudes"}
            </T>
          ) : null}
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={18} color={t.muted} />
      )}
    </Pressable>
  );
}

// Bloc des gains : vision "tout compris" + séparation direct / Progrétudes
export function EarningsBlock({ stats }) {
  const t = useTheme();
  if (!stats) return null;
  return (
    <Card style={{ padding: 0 }}>
      <View style={{ padding: 18 }}>
        <T v="label">Gagné · Progrétudes compris</T>
        <T v="display" style={{ marginTop: 6 }}>{euro(stats.earned)}</T>
        <T v="small" muted style={{ marginTop: 4 }}>
          {hours(stats.hours)} de cours · {stats.session_count} séance{stats.session_count > 1 ? "s" : ""}
        </T>
      </View>
      <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: t.border }}>
        <View style={{ flex: 1, padding: 16, borderRightWidth: 1, borderRightColor: t.border }}>
          <T v="label">En direct</T>
          <T v="h2" style={{ marginTop: 4 }}>{euro(stats.direct)}</T>
        </View>
        <View style={{ flex: 1, padding: 16 }}>
          <T v="label">Progrétudes</T>
          <T v="h2" style={{ marginTop: 4 }}>{euro(stats.agency)}</T>
          {stats.agency_pending > 0 ? (
            <View style={{ marginTop: 6 }}>
              <Badge tone="warning" label={`${euro(stats.agency_pending)} en attente`} />
            </View>
          ) : null}
        </View>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, backgroundColor: t.surfaceAlt, borderBottomLeftRadius: radius.md, borderBottomRightRadius: radius.md }}>
        <T v="small" muted>Réellement encaissé sur la période</T>
        <T v="strong" color={t.success}>{euro(stats.received)}</T>
      </View>
    </Card>
  );
}
