import React, { useContext, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, fonts, radius, ThemeContext } from "./theme";
import { useNav, useLoad, confirmAction, showError } from "./nav";
import { api } from "./api";
import { T, Card, Button, IconButton, Badge, Avatar, Section, ScreenTitle, Empty, Loading, ErrorText, Segmented } from "./ui";
import { SessionRow, EarningsBlock } from "./blocks";
import { euro, hours, time, relativeDay, dayLong, dayShort, todayISO, monthLabel, payoutCutoff } from "./format";

const PERIODS = [
  { value: "week", label: "Cette semaine" },
  { value: "month", label: "Ce mois-ci" },
];

// ---------------------------------------------------------------------------
// Accueil
// ---------------------------------------------------------------------------

export function HomeTab() {
  const t = useTheme();
  const { toggleTheme } = useContext(ThemeContext);
  const nav = useNav();
  const { data, error } = useLoad(api.dashboard);
  const [period, setPeriod] = useState("week");

  return (
    <View>
      <ScreenTitle
        label={dayLong(todayISO())}
        title="Mes cours"
        right={<IconButton icon={t.mode === "dark" ? "sunny-outline" : "moon-outline"} onPress={toggleTheme} />}
      />
      <ErrorText message={error} />
      {!data ? (
        !error && <Loading />
      ) : (
        <>
          {data.to_complete.length > 0 && (
            <Card style={{ backgroundColor: t.warningSoft, borderColor: t.warningSoft, marginBottom: 16 }}>
              <T v="strong" color={t.warning}>
                {data.to_complete.length} séance{data.to_complete.length > 1 ? "s" : ""} à compléter
              </T>
              {data.to_complete.map((s) => (
                <Pressable key={s.id} onPress={() => nav.openSession(s.id)} style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
                  <T style={{ flex: 1 }}>
                    {s.student_name} · {dayShort(s.date)} {time(s.time)}
                  </T>
                  <T v="strong" color={t.warning}>Remplir →</T>
                </Pressable>
              ))}
            </Card>
          )}

          <NextLessonHero next={data.next} />

          <Section title="À venir" action="+ Planifier" onAction={() => nav.openSheet("plan")}>
            {data.upcoming.length === 0 ? (
              <Empty icon="calendar-outline" text="Rien d'autre de prévu pour l'instant." />
            ) : (
              data.upcoming.map((s) => <SessionRow key={s.id} session={s} onPress={() => nav.openSession(s.id)} />)
            )}
          </Section>

          <Section title="Mes gains">
            <Segmented options={PERIODS} value={period} onChange={setPeriod} />
            <View style={{ height: 12 }} />
            <EarningsBlock stats={data[period]} />
            {data.next_payout ? (
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10, padding: 14, borderRadius: radius.md, backgroundColor: t.warningSoft }}>
                <Ionicons name="business-outline" size={18} color={t.warning} style={{ marginRight: 10 }} />
                <T style={{ flex: 1 }} color={t.warning}>
                  Prochain versement Progrétudes : <T v="strong" color={t.warning}>{euro(data.next_payout.total)}</T> en {monthLabel(data.next_payout.month)}
                </T>
              </View>
            ) : null}
          </Section>
        </>
      )}
    </View>
  );
}

function NextLessonHero({ next }) {
  const t = useTheme();
  const nav = useNav();
  if (!next) {
    return (
      <LinearGradient colors={t.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.lg, padding: 22 }}>
        <T v="label" color={t.heroMuted}>Prochain cours</T>
        <T v="title" color={t.heroText} style={{ marginTop: 8, marginBottom: 16 }}>Aucun cours planifié</T>
        <Button title="Planifier un cours" icon="add" variant="secondary" onPress={() => nav.openSheet("plan")} style={{ alignSelf: "flex-start" }} />
      </LinearGradient>
    );
  }
  const homework = next.previous?.homework;
  return (
    <Pressable onPress={() => nav.openSession(next.id)}>
      <LinearGradient colors={t.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.lg, padding: 22 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <T v="label" color={t.heroMuted}>Prochain cours</T>
          <View style={{ backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ color: t.heroText, fontFamily: fonts.bold, fontSize: 12 }}>
              {relativeDay(next.date)}{next.time ? ` · ${time(next.time)}` : ""}
            </Text>
          </View>
        </View>
        <T v="display" color={t.heroText} style={{ marginTop: 10 }}>{next.student_name}</T>
        <T color={t.heroMuted} style={{ marginTop: 2 }}>
          {[next.subject, hours(next.duration_hours), euro(next.amount), next.via_agency ? "Progrétudes" : null].filter(Boolean).join("  ·  ")}
        </T>

        <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.18)", marginVertical: 16 }} />

        <HeroLine icon="document-text-outline" title="Devoirs donnés" text={homework || "Pas de devoirs notés"} />
        <HeroLine
          icon="alert-circle-outline"
          title={`Difficultés en cours (${next.difficulties.length})`}
          text={next.difficulties.length ? next.difficulties.slice(0, 3).map((d) => d.text).join(" · ") : "Aucune 🎉"}
        />
        <HeroLine
          icon="list-outline"
          title={`Prévu pour cette séance (${next.todos.length})`}
          text={next.todos.length ? next.todos.slice(0, 3).map((d) => d.text).join(" · ") : "Rien de noté"}
        />

        <Text style={{ color: t.heroText, fontFamily: fonts.bold, marginTop: 6 }}>Préparer la séance →</Text>
      </LinearGradient>
    </Pressable>
  );
}

function HeroLine({ icon, title, text }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", marginBottom: 12 }}>
      <Ionicons name={icon} size={17} color={t.heroMuted} style={{ marginTop: 2, marginRight: 10 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: t.heroMuted, fontFamily: fonts.medium, fontSize: 12 }}>{title}</Text>
        <Text style={{ color: t.heroText, fontFamily: fonts.regular, fontSize: 14, marginTop: 1 }} numberOfLines={2}>{text}</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Planning
// ---------------------------------------------------------------------------

export function PlanningTab() {
  const nav = useNav();
  const { data, error } = useLoad(() => Promise.all([api.sessions("planned"), api.sessions("done")]));
  const [planned, done] = data || [[], []];

  // Séances planifiées déjà passées = compte-rendu à remplir
  const now = new Date();
  const nowKey = todayISO() + `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const key = (s) => s.date + (s.time || "99:99");
  const toComplete = planned.filter((s) => key(s) < nowKey);
  const upcoming = planned.filter((s) => key(s) >= nowKey);

  // Regroupe les cours à venir par jour
  const groups = [];
  upcoming.forEach((s) => {
    const last = groups[groups.length - 1];
    if (last && last.date === s.date) last.items.push(s);
    else groups.push({ date: s.date, items: [s] });
  });

  const dayTitle = (d) => {
    const rel = relativeDay(d);
    return rel === "Aujourd'hui" || rel === "Demain" ? `${rel} · ${dayLong(d)}` : dayLong(d);
  };

  return (
    <View>
      <ScreenTitle label="Mes séances" title="Planning" right={<IconButton icon="add" filled onPress={() => nav.openSheet("plan")} />} />
      <ErrorText message={error} />
      {!data ? (
        !error && <Loading />
      ) : (
        <>
          {toComplete.length > 0 && (
            <Section title="À compléter" style={{ marginTop: 0 }}>
              {toComplete.map((s) => <SessionRow key={s.id} session={s} onPress={() => nav.openSession(s.id)} />)}
            </Section>
          )}
          <Section title="À venir" style={toComplete.length ? null : { marginTop: 0 }}>
            {groups.length === 0 ? (
              <Empty icon="calendar-outline" text="Appuie sur + pour planifier ton prochain cours." />
            ) : (
              groups.map((g) => (
                <View key={g.date} style={{ marginBottom: 14 }}>
                  <T v="h2" style={{ marginBottom: 2 }}>{dayTitle(g.date)}</T>
                  {g.items.map((s) => <SessionRow key={s.id} session={s} onPress={() => nav.openSession(s.id)} />)}
                </View>
              ))
            )}
          </Section>
          <Section title="Séances terminées">
            {done.length === 0 ? (
              <Empty icon="checkmark-done-outline" text="Tes séances terminées apparaîtront ici." />
            ) : (
              done.slice(0, 30).map((s) => <SessionRow key={s.id} session={s} showAmount onPress={() => nav.openSession(s.id)} />)
            )}
          </Section>
        </>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Élèves
// ---------------------------------------------------------------------------

export function StudentsTab() {
  const t = useTheme();
  const nav = useNav();
  const { data, error } = useLoad(api.students);

  return (
    <View>
      <ScreenTitle
        label={data ? `${data.length} profil${data.length > 1 ? "s" : ""}` : "Profils"}
        title="Élèves"
        right={<IconButton icon="person-add-outline" filled onPress={() => nav.openSheet("student")} />}
      />
      <ErrorText message={error} />
      {!data ? (
        !error && <Loading />
      ) : data.length === 0 ? (
        <Empty icon="people-outline" text="Crée le profil de ton premier élève avec le bouton en haut." />
      ) : (
        data.map((s) => (
          <Card key={s.id} onPress={() => nav.openStudent(s.id)} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Avatar name={s.name} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <T v="h2">{s.name}</T>
                <T v="small" muted style={{ marginTop: 2 }}>
                  {[s.level, s.subject, `${euro(s.hourly_rate)}/h`].filter(Boolean).join(" · ")}
                </T>
              </View>
              {s.via_progretudes ? <Badge label="Progrétudes" tone="neutral" /> : <BalanceBadge balance={s.balance} />}
            </View>
            <View style={{ flexDirection: "row", marginTop: 12, gap: 16 }}>
              <MiniInfo icon="calendar-outline" text={s.next_date ? `${dayShort(s.next_date)} ${time(s.next_time)}` : "Pas de cours prévu"} />
              <MiniInfo icon="alert-circle-outline" text={`${s.open_difficulties} difficulté${s.open_difficulties > 1 ? "s" : ""}`} />
            </View>
          </Card>
        ))
      )}
    </View>
  );
}

function MiniInfo({ icon, text }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Ionicons name={icon} size={14} color={t.muted} style={{ marginRight: 5 }} />
      <T v="small" muted>{text}</T>
    </View>
  );
}

export function BalanceBadge({ balance }) {
  if (balance > 0.001) return <Badge tone="warning" label={`Doit ${euro(balance)}`} />;
  if (balance < -0.001) return <Badge tone="primary" label={`Avance ${euro(-balance)}`} />;
  return <Badge tone="success" label="À jour" />;
}

// ---------------------------------------------------------------------------
// Argent
// ---------------------------------------------------------------------------

export function MoneyTab() {
  const t = useTheme();
  const nav = useNav();
  const { data, error } = useLoad(() =>
    Promise.all([api.dashboard(), api.progretudes(), api.students(), api.payments()])
  );
  const [period, setPeriod] = useState("month");
  const [saving, setSaving] = useState(null);
  const [dash, agency, students, payments] = data || [];

  const markPaid = async (group) => {
    setSaving(group.month);
    try {
      await api.markProgretudesPaid(group.sessions.map((s) => s.id));
      nav.refresh();
    } catch (e) {
      showError(e.message);
    } finally {
      setSaving(null);
    }
  };

  return (
    <View>
      <ScreenTitle label="Mes finances" title="Argent" right={<IconButton icon="add" filled onPress={() => nav.openSheet("payment")} />} />
      <ErrorText message={error} />
      {!data ? (
        !error && <Loading />
      ) : (
        <>
          <Segmented options={PERIODS} value={period} onChange={setPeriod} />
          <View style={{ height: 12 }} />
          <EarningsBlock stats={dash[period]} />

          <Section title={`Progrétudes en attente · ${euro(agency.pending_total)}`}>
            {agency.payouts.length === 0 ? (
              <Empty icon="checkmark-circle-outline" text="Progrétudes t'a tout versé." />
            ) : (
              agency.payouts.map((g) => (
                <Card key={g.month} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                    <View style={{ flex: 1 }}>
                      <T v="h2">Versement de {monthLabel(g.month)}</T>
                      <T v="small" muted style={{ marginTop: 2 }}>Cours faits jusqu'au {payoutCutoff(g.month)} inclus</T>
                    </View>
                    <T v="h2">{euro(g.total)}</T>
                  </View>
                  <View style={{ marginTop: 8 }}>
                    {g.sessions.map((s) => (
                      <Pressable key={s.id} onPress={() => nav.openSession(s.id)} style={{ flexDirection: "row", paddingVertical: 8, borderTopWidth: 1, borderTopColor: t.border }}>
                        <T style={{ flex: 1 }}>{s.student_name} · {dayShort(s.date)} · {hours(s.duration_hours)}</T>
                        <T v="strong">{euro(s.amount)}</T>
                      </Pressable>
                    ))}
                  </View>
                  <Button small icon="checkmark" title="Progrétudes m'a versé ce montant" loading={saving === g.month} onPress={() => markPaid(g)} style={{ marginTop: 10 }} />
                </Card>
              ))
            )}
          </Section>

          <Section title="Soldes des élèves">
            {students.filter((s) => !s.via_progretudes && Math.abs(s.balance) > 0.001).length === 0 ? (
              <Empty icon="happy-outline" text="Tout le monde est à jour." />
            ) : (
              students
                .filter((s) => !s.via_progretudes && Math.abs(s.balance) > 0.001)
                .map((s) => (
                  <Pressable key={s.id} onPress={() => nav.openStudent(s.id)} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: t.border }}>
                    <Avatar name={s.name} size={36} />
                    <T v="strong" style={{ flex: 1, marginLeft: 12 }}>{s.name}</T>
                    <BalanceBadge balance={s.balance} />
                  </Pressable>
                ))
            )}
          </Section>

          <Section title="Paiements reçus" action="+ Ajouter" onAction={() => nav.openSheet("payment")}>
            {payments.length === 0 ? (
              <Empty icon="wallet-outline" text="Aucun paiement enregistré." />
            ) : (
              payments.slice(0, 40).map((p) => (
                <Pressable
                  key={p.id}
                  onLongPress={() => confirmAction("Supprimer ce paiement ?", `${p.student_name} · ${euro(p.amount)}`, () => api.deletePayment(p.id).then(nav.refresh, (e) => showError(e.message)))}
                  style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: t.border }}
                >
                  <View style={{ flex: 1 }}>
                    <T v="strong">{p.student_name}</T>
                    <T v="small" muted>{dayShort(p.date)}{p.note ? ` · ${p.note}` : ""}</T>
                  </View>
                  <T v="strong" color={t.success}>+{euro(p.amount)}</T>
                </Pressable>
              ))
            )}
            {payments.length > 0 ? <T v="small" muted style={{ marginTop: 8 }}>Appui long sur un paiement pour le supprimer.</T> : null}
          </Section>
        </>
      )}
    </View>
  );
}
