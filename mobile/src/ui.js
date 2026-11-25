import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, fonts, radius } from "./theme";
import {
  initials,
  addDays,
  todayISO,
  weekdayShort,
  dayNumber,
  dayLong,
  monthShort,
} from "./format";

// ---------------------------------------------------------------------------
// Textes
// ---------------------------------------------------------------------------

const VARIANTS = {
  display: { fontFamily: fonts.serif, fontSize: 34, letterSpacing: -0.5 },
  title: { fontFamily: fonts.serif, fontSize: 26 },
  h2: { fontFamily: fonts.serif, fontSize: 20 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  strong: { fontFamily: fonts.bold, fontSize: 15 },
  small: { fontFamily: fonts.regular, fontSize: 13 },
  label: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase" },
};

export function T({ v = "body", muted, color, style, ...props }) {
  const t = useTheme();
  return (
    <Text
      style={[VARIANTS[v], { color: color || (muted || v === "label" ? t.muted : t.text) }, style]}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// Briques de base
// ---------------------------------------------------------------------------

export function Card({ style, children, onPress, onLongPress }) {
  const t = useTheme();
  const base = [
    { backgroundColor: t.surface, borderColor: t.border, borderWidth: 1, borderRadius: radius.md, padding: 16 },
    style,
  ];
  if (!onPress && !onLongPress) return <View style={base}>{children}</View>;
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={({ pressed }) => [base, pressed && { opacity: 0.75 }]}>
      {children}
    </Pressable>
  );
}

export function Button({ title, icon, onPress, variant = "primary", loading, style, small }) {
  const t = useTheme();
  const look = {
    primary: { bg: t.primary, fg: t.onPrimary, border: t.primary },
    secondary: { bg: t.surface, fg: t.text, border: t.border },
    soft: { bg: t.soft, fg: t.primary, border: t.soft },
    danger: { bg: "transparent", fg: t.danger, border: "transparent" },
  }[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: look.bg,
          borderColor: look.border,
          borderWidth: 1,
          borderRadius: radius.sm,
          paddingVertical: small ? 9 : 14,
          paddingHorizontal: small ? 12 : 18,
          opacity: pressed || loading ? 0.75 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={look.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={small ? 16 : 18} color={look.fg} style={{ marginRight: title ? 8 : 0 }} /> : null}
          {title ? <Text style={{ color: look.fg, fontFamily: fonts.bold, fontSize: small ? 14 : 15 }}>{title}</Text> : null}
        </>
      )}
    </Pressable>
  );
}

export function IconButton({ icon, onPress, filled }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        {
          width: 42,
          height: 42,
          borderRadius: radius.sm,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: filled ? t.primary : t.surface,
          borderWidth: 1,
          borderColor: filled ? t.primary : t.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={20} color={filled ? t.onPrimary : t.text} />
    </Pressable>
  );
}

export function Badge({ label, tone = "primary", icon }) {
  const t = useTheme();
  const [bg, fg] = {
    primary: [t.soft, t.primary],
    success: [t.successSoft, t.success],
    warning: [t.warningSoft, t.warning],
    neutral: [t.surfaceAlt, t.muted],
  }[tone];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: bg, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start" }}>
      {icon ? <Ionicons name={icon} size={12} color={fg} style={{ marginRight: 4 }} /> : null}
      <Text style={{ color: fg, fontFamily: fonts.bold, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

export function Avatar({ name, size = 44 }) {
  const t = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: radius.sm, backgroundColor: t.soft, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontFamily: fonts.serif, fontSize: size * 0.4, color: t.primary }}>{initials(name)}</Text>
    </View>
  );
}

export function Divider({ style }) {
  const t = useTheme();
  return <View style={[{ height: 1, backgroundColor: t.border, marginVertical: 14 }, style]} />;
}

export function Section({ title, action, onAction, children, style }) {
  const t = useTheme();
  return (
    <View style={[{ marginTop: 28 }, style]}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <T v="label">{title}</T>
        {action ? (
          <Pressable onPress={onAction} hitSlop={8}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: t.primary }}>{action}</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export function ScreenTitle({ label, title, right }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", marginBottom: 22 }}>
      <View style={{ flex: 1 }}>
        {label ? <T v="label" style={{ marginBottom: 4 }}>{label}</T> : null}
        <T v="display">{title}</T>
      </View>
      {right}
    </View>
  );
}

export function Empty({ icon, text }) {
  const t = useTheme();
  return (
    <View style={{ alignItems: "center", paddingVertical: 22, borderWidth: 1, borderStyle: "dashed", borderColor: t.border, borderRadius: radius.md }}>
      <Ionicons name={icon} size={22} color={t.muted} />
      <T muted v="small" style={{ marginTop: 6, textAlign: "center", paddingHorizontal: 20 }}>{text}</T>
    </View>
  );
}

export function Loading() {
  const t = useTheme();
  return <ActivityIndicator color={t.primary} style={{ marginVertical: 40 }} />;
}

export function ErrorText({ message }) {
  const t = useTheme();
  if (!message) return null;
  return (
    <View style={{ backgroundColor: t.soft, borderRadius: radius.sm, padding: 12, marginBottom: 14 }}>
      <Text style={{ color: t.danger, fontFamily: fonts.medium }}>{message}</Text>
    </View>
  );
}

// Onglets segmentés (Semaine / Mois)
export function Segmented({ options, value, onChange }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", backgroundColor: t.surfaceAlt, borderRadius: radius.sm, padding: 3 }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={{ flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 4, backgroundColor: active ? t.surface : "transparent" }}
          >
            <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: active ? t.text : t.muted }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Formulaires
// ---------------------------------------------------------------------------

export function Field({ label, hint, style, ...props }) {
  const t = useTheme();
  return (
    <View style={[{ marginBottom: 16 }, style]}>
      {label ? <T v="label" style={{ marginBottom: 7 }}>{label}</T> : null}
      <TextInput
        placeholderTextColor={t.muted}
        style={[
          {
            backgroundColor: t.surfaceAlt,
            borderRadius: radius.sm,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 15,
            fontFamily: fonts.regular,
            color: t.text,
          },
          props.multiline && { minHeight: 84, textAlignVertical: "top" },
        ]}
        {...props}
      />
      {hint ? <T v="small" muted style={{ marginTop: 6 }}>{hint}</T> : null}
    </View>
  );
}

export function Chips({ label, options, value, onChange, style }) {
  const t = useTheme();
  return (
    <View style={[{ marginBottom: 16 }, style]}>
      {label ? <T v="label" style={{ marginBottom: 7 }}>{label}</T> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <Pressable
              key={String(o.value)}
              onPress={() => onChange(o.value)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 9,
                borderRadius: radius.sm,
                borderWidth: 1,
                borderColor: active ? t.primary : t.border,
                backgroundColor: active ? t.primary : t.surface,
                marginRight: 8,
              }}
            >
              <Text style={{ fontFamily: fonts.medium, color: active ? t.onPrimary : t.text }}>{o.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function Toggle({ label, hint, value, onChange }) {
  const t = useTheme();
  return (
    <Pressable onPress={() => onChange(!value)} style={{ flexDirection: "row", alignItems: "center", marginBottom: 16, backgroundColor: t.surfaceAlt, padding: 14, borderRadius: radius.sm }}>
      <View style={{ flex: 1 }}>
        <T v="strong">{label}</T>
        {hint ? <T v="small" muted style={{ marginTop: 2 }}>{hint}</T> : null}
      </View>
      <View style={{ width: 46, height: 26, borderRadius: 13, padding: 3, backgroundColor: value ? t.primary : t.border, alignItems: value ? "flex-end" : "flex-start" }}>
        <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: value ? t.onPrimary : t.surface }} />
      </View>
    </Pressable>
  );
}

// Bande de jours défilante pour choisir une date
const DAY_WIDTH = 54;
export function DayPicker({ label, value, onChange }) {
  const t = useTheme();
  const ref = useRef(null);
  const start = addDays(todayISO(), -14);
  const days = Array.from({ length: 75 }, (_, i) => addDays(start, i));
  const index = Math.max(0, days.indexOf(value));
  useEffect(() => {
    const id = setTimeout(() => ref.current?.scrollTo({ x: Math.max(0, (index - 2) * (DAY_WIDTH + 6)), animated: false }), 50);
    return () => clearTimeout(id);
  }, []);
  return (
    <View style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 7 }}>
        <T v="label">{label}</T>
        <T v="small" style={{ fontFamily: fonts.bold, color: t.primary }}>{dayLong(value)}</T>
      </View>
      <ScrollView ref={ref} horizontal showsHorizontalScrollIndicator={false}>
        {days.map((d) => {
          const active = d === value;
          const isToday = d === todayISO();
          return (
            <Pressable
              key={d}
              onPress={() => onChange(d)}
              style={{
                width: DAY_WIDTH,
                marginRight: 6,
                paddingVertical: 8,
                alignItems: "center",
                borderRadius: radius.sm,
                borderWidth: 1,
                borderColor: active ? t.primary : isToday ? t.accent : t.border,
                backgroundColor: active ? t.primary : t.surface,
              }}
            >
              <Text style={{ fontFamily: fonts.medium, fontSize: 11, color: active ? t.onPrimary : t.muted }}>{weekdayShort(d)}</Text>
              <Text style={{ fontFamily: fonts.serif, fontSize: 20, color: active ? t.onPrimary : t.text }}>{dayNumber(d)}</Text>
              <Text style={{ fontFamily: fonts.regular, fontSize: 10, color: active ? t.onPrimary : t.muted }}>{monthShort(d)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function TimePicker({ value, onChange }) {
  const [h, m] = (value || "17:00").split(":");
  const hoursOpts = Array.from({ length: 16 }, (_, i) => String(i + 7).padStart(2, "0"));
  return (
    <View>
      <Chips label={`Heure · ${h}h${m}`} options={hoursOpts.map((x) => ({ value: x, label: `${Number(x)}h` }))} value={h} onChange={(x) => onChange(`${x}:${m}`)} style={{ marginBottom: 8 }} />
      <Chips options={["00", "15", "30", "45"].map((x) => ({ value: x, label: `:${x}` }))} value={m} onChange={(x) => onChange(`${h}:${x}`)} />
    </View>
  );
}

export const DURATIONS = [0.5, 1, 1.5, 2, 2.5, 3].map((d) => ({ value: d, label: `${String(d).replace(".", ",")} h` }));

// Liste à cocher (difficultés, à faire) avec ajout rapide
export function Checklist({ items, onToggle, onAdd, onDelete, placeholder, emptyText, doneStyle }) {
  const t = useTheme();
  const [draft, setDraft] = useState("");
  const add = () => {
    if (!draft.trim()) return;
    onAdd(draft.trim());
    setDraft("");
  };
  return (
    <View>
      {items.length === 0 && !onAdd ? <T v="small" muted>{emptyText}</T> : null}
      {items.map((item) => {
        const done = !!item.done_at;
        return (
          <Pressable
            key={item.id}
            onPress={() => onToggle(item)}
            onLongPress={onDelete ? () => onDelete(item) : undefined}
            style={({ pressed }) => [
              { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: t.border, opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 4,
                borderWidth: 1.5,
                borderColor: done ? t.success : t.accent,
                backgroundColor: done ? t.success : "transparent",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              {done ? <Ionicons name="checkmark" size={15} color={t.surface} /> : null}
            </View>
            <T style={[{ flex: 1 }, done && { textDecorationLine: "line-through", color: t.muted }, doneStyle]}>{item.text}</T>
          </Pressable>
        );
      })}
      {onAdd ? (
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10 }}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={add}
            placeholder={placeholder}
            placeholderTextColor={t.muted}
            returnKeyType="done"
            style={{ flex: 1, backgroundColor: t.surfaceAlt, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontFamily: fonts.regular, fontSize: 15, color: t.text, marginRight: 8 }}
          />
          <IconButton icon="add" filled onPress={add} />
        </View>
      ) : null}
    </View>
  );
}

// Saisie d'une liste de lignes (pour le compte-rendu, avant enregistrement)
export function ListInput({ label, values, onChange, placeholder }) {
  const items = values.map((text, i) => ({ id: i, text }));
  return (
    <View style={{ marginBottom: 16 }}>
      <T v="label" style={{ marginBottom: 4 }}>{label}</T>
      <Checklist
        items={items}
        onToggle={(item) => onChange(values.filter((_, i) => i !== item.id))}
        onAdd={(text) => onChange([...values, text])}
        placeholder={placeholder}
      />
      {values.length ? <T v="small" muted style={{ marginTop: 6 }}>Touchez une ligne pour la retirer.</T> : null}
    </View>
  );
}

export const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
});
