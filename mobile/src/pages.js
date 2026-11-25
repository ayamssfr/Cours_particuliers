import React, { useState } from "react";
import { View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, radius } from "./theme";
import { useNav, useLoad, confirmAction, showError } from "./nav";
import { api } from "./api";
import { T, Card, Button, Badge, Avatar, Section, Empty, Loading, ErrorText, Checklist, Divider } from "./ui";
import { SessionRow } from "./blocks";
import { BalanceBadge } from "./tabs";
import { euro, hours, time, dayLong, dayShort, relativeDay, monthLabel } from "./format";

// Actions communes sur les listes à cocher
function useItemActions() {
  const nav = useNav();
  const run = (p) => p.then(nav.refresh, (e) => showError(e.message));
  return {
    toggle: (item) => run(api.setItemDone(item.id, !item.done_at)),
    add: (studentId, kind) => (text) => run(api.addItem(studentId, kind, text)),
    remove: (item) => confirmAction("Supprimer cette ligne ?", item.text, () => run(api.deleteItem(item.id))),
  };
}

function Stat({ label, value, color }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: t.surfaceAlt, borderRadius: radius.sm, padding: 12 }}>
      <T v="label">{label}</T>
      <T v="h2" color={color} style={{ marginTop: 4 }}>{value}</T>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Fiche élève
// ---------------------------------------------------------------------------

export function StudentPage({ id }) {
  const t = useTheme();
  const nav = useNav();
  const items = useItemActions();
  const { data: s, error } = useLoad(() => api.student(id), [id]);
  const [showAcquired, setShowAcquired] = useState(false);

  if (error) return <ErrorText message={error} />;
  if (!s) return <Loading />;

  const difficulties = s.items.filter((i) => i.kind === "difficulty");
  const openDiff = difficulties.filter((i) => !i.done_at);
  const acquired = difficulties.filter((i) => i.done_at);
  const todos = s.items.filter((i) => i.kind === "todo" && !i.done_at);

  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Avatar name={s.name} size={60} />
        <View style={{ flex: 1, marginLeft: 14 }}>
          <T v="display" style={{ fontSize: 30 }}>{s.name}</T>
          <T muted>{[s.level, s.subject, `${euro(s.hourly_rate)}/h`].filter(Boolean).join(" · ")}</T>
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
        {s.via_progretudes ? <Badge label="Via Progrétudes" tone="neutral" icon="business-outline" /> : <BalanceBadge balance={s.balance} />}
      </View>

      <View style={{ flexDirection: "row", gap: 8, marginTop: 18 }}>
        <Stat label="Heures" value={hours(s.total_hours)} />
        <Stat label="Gagné" value={euro(s.total_earned)} />
        {s.via_progretudes ? (
          <Stat label="En attente" value={euro(s.agency_pending)} color={s.agency_pending > 0 ? t.warning : undefined} />
        ) : (
          <Stat label="Payé" value={euro(s.total_paid)} />
        )}
      </View>

      <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
        <Button title="Planifier" icon="calendar-outline" onPress={() => nav.openSheet("plan", { studentId: s.id })} style={{ flex: 1 }} />
        {!s.via_progretudes && (
          <Button title="Paiement" icon="cash-outline" variant="soft" onPress={() => nav.openSheet("payment", { studentId: s.id })} style={{ flex: 1 }} />
        )}
        <Button icon="create-outline" variant="secondary" onPress={() => nav.openSheet("student", { student: s })} />
      </View>

      <Section title="Prochains cours">
        {s.planned.length === 0 ? (
          <Empty icon="calendar-outline" text="Aucun cours planifié." />
        ) : (
          s.planned.map((se) => <SessionRow key={se.id} session={se} showName={false} onPress={() => nav.openSession(se.id)} />)
        )}
      </Section>

      <Section title={`Difficultés en cours · ${openDiff.length}`}>
        <Checklist
          items={openDiff}
          onToggle={items.toggle}
          onDelete={items.remove}
          onAdd={items.add(s.id, "difficulty")}
          placeholder="Nouvelle difficulté…"
        />
        {acquired.length > 0 && (
          <Pressable onPress={() => setShowAcquired(!showAcquired)} style={{ flexDirection: "row", alignItems: "center", marginTop: 14 }}>
            <Ionicons name={showAcquired ? "chevron-down" : "chevron-forward"} size={16} color={t.success} />
            <T v="strong" color={t.success} style={{ marginLeft: 4 }}>Acquis ({acquired.length})</T>
          </Pressable>
        )}
        {showAcquired && <Checklist items={acquired} onToggle={items.toggle} onDelete={items.remove} />}
      </Section>

      <Section title={`À faire à la prochaine séance · ${todos.length}`}>
        <Checklist items={todos} onToggle={items.toggle} onDelete={items.remove} onAdd={items.add(s.id, "todo")} placeholder="Ex : corriger l'exercice 12…" />
      </Section>

      <Section title="Historique">
        {s.history.length === 0 ? (
          <Empty icon="time-outline" text="Pas encore de séance terminée." />
        ) : (
          s.history.map((se) => <SessionRow key={se.id} session={se} showName={false} showAmount onPress={() => nav.openSession(se.id)} />)
        )}
      </Section>

      {!s.via_progretudes && (
        <Section title="Paiements">
          {s.payments.length === 0 ? (
            <Empty icon="wallet-outline" text="Aucun paiement." />
          ) : (
            s.payments.map((p) => (
              <View key={p.id} style={{ flexDirection: "row", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: t.border }}>
                <T style={{ flex: 1 }}>{dayShort(p.date)}{p.note ? ` · ${p.note}` : ""}</T>
                <T v="strong" color={t.success}>+{euro(p.amount)}</T>
              </View>
            ))
          )}
        </Section>
      )}

      <Button
        title="Supprimer l'élève"
        icon="trash-outline"
        variant="danger"
        style={{ marginTop: 30 }}
        onPress={() =>
          confirmAction(`Supprimer ${s.name} ?`, "Ses séances, paiements et listes seront aussi supprimés.", () =>
            api.deleteStudent(s.id).then(() => {
              nav.back();
              nav.refresh();
            }, (e) => showError(e.message))
          )
        }
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Séance (préparation ou compte-rendu)
// ---------------------------------------------------------------------------

export function SessionPage({ id }) {
  const t = useTheme();
  const nav = useNav();
  const items = useItemActions();
  const { data: s, error } = useLoad(() => api.session(id), [id]);

  if (error) return <ErrorText message={error} />;
  if (!s) return <Loading />;

  const planned = s.status === "planned";
  const prev = s.previous;

  return (
    <View>
      <T v="label">{planned ? "Séance prévue" : "Séance terminée"} · {relativeDay(s.date)}</T>
      <Pressable onPress={() => nav.openStudent(s.student_id)}>
        <T v="display" style={{ marginTop: 6 }}>{s.student_name}</T>
      </Pressable>
      <T muted style={{ marginTop: 4 }}>
        {[dayLong(s.date), s.time ? time(s.time) : null, hours(s.duration_hours), s.subject].filter(Boolean).join(" · ")}
      </T>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
        <Badge label={euro(s.amount)} tone="primary" icon="cash-outline" />
        {s.via_agency ? (
          planned ? (
            <Badge label={`Progrétudes · versé en ${monthLabel(s.expected_payout)}`} tone="neutral" />
          ) : (
            <Badge label={s.agency_paid_at ? `Progrétudes · reçu le ${dayShort(s.agency_paid_at)}` : `Progrétudes · versé en ${monthLabel(s.expected_payout)}`} tone={s.agency_paid_at ? "success" : "warning"} />
          )
        ) : null}
        {planned && s.series_id ? <Badge label="Récurrent" tone="neutral" icon="repeat" /> : null}
      </View>

      {planned ? (
        <>
          <Section title="La dernière fois">
            {prev ? (
              <Card>
                <T v="small" muted>{dayLong(prev.date)}</T>
                <T v="strong" style={{ marginTop: 10 }}>Ce qu'on a fait</T>
                <T style={{ marginTop: 2 }}>{prev.notes || "—"}</T>
                <Divider />
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="document-text-outline" size={16} color={t.primary} />
                  <T v="strong" style={{ marginLeft: 6 }}>Devoirs à vérifier</T>
                </View>
                <T style={{ marginTop: 2 }}>{prev.homework || "Pas de devoirs donnés"}</T>
              </Card>
            ) : (
              <Empty icon="sparkles-outline" text="Première séance avec cet élève." />
            )}
          </Section>

          <Section title={`Difficultés à retravailler · ${s.difficulties.length}`}>
            <Checklist items={s.difficulties} onToggle={items.toggle} onDelete={items.remove} onAdd={items.add(s.student_id, "difficulty")} placeholder="Ajouter une difficulté…" />
            <T v="small" muted style={{ marginTop: 8 }}>Coche une difficulté quand elle est acquise.</T>
          </Section>

          <Section title={`Prévu pour cette séance · ${s.todos.length}`}>
            <Checklist items={s.todos} onToggle={items.toggle} onDelete={items.remove} onAdd={items.add(s.student_id, "todo")} placeholder="Ajouter quelque chose à faire…" />
          </Section>

          <Button title="Terminer la séance" icon="checkmark-circle-outline" style={{ marginTop: 28 }} onPress={() => nav.openSheet("complete", { session: s })} />
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <Button title="Déplacer" icon="calendar-outline" variant="secondary" style={{ flex: 1 }} onPress={() => nav.openSheet("plan", { session: s })} />
            <Button
              title="Annuler"
              icon="close-outline"
              variant="secondary"
              style={{ flex: 1 }}
              onPress={() =>
                confirmAction("Annuler ce cours ?", `${s.student_name} · ${dayShort(s.date)}`, () =>
                  api.deleteSession(s.id).then(() => {
                    nav.back();
                    nav.refresh();
                  }, (e) => showError(e.message))
                )
              }
            />
          </View>
          {s.series_id ? (
            <Button
              title="Annuler ce cours et les suivants de la série"
              icon="repeat"
              variant="danger"
              style={{ marginTop: 8 }}
              onPress={() =>
                confirmAction("Annuler la série ?", `Tous les cours prévus de ${s.student_name} à ce créneau, à partir du ${dayShort(s.date)}.`, () =>
                  api.deleteSession(s.id, "following").then(() => {
                    nav.back();
                    nav.refresh();
                  }, (e) => showError(e.message))
                )
              }
            />
          ) : null}
        </>
      ) : (
        <>
          <Section title="Ce qu'on a fait">
            <Card><T>{s.notes || "Rien de noté."}</T></Card>
          </Section>
          <Section title="Devoirs donnés">
            <Card><T>{s.homework || "Pas de devoirs."}</T></Card>
          </Section>
          <Section title={`Difficultés en cours · ${s.difficulties.length}`}>
            <Checklist items={s.difficulties} onToggle={items.toggle} onDelete={items.remove} emptyText="Aucune difficulté en cours." />
          </Section>
          <Section title={`À faire la prochaine fois · ${s.todos.length}`}>
            <Checklist items={s.todos} onToggle={items.toggle} onDelete={items.remove} emptyText="Rien de noté." />
          </Section>

          <Button title="Modifier le compte-rendu" icon="create-outline" variant="secondary" style={{ marginTop: 28 }} onPress={() => nav.openSheet("complete", { session: s, edit: true })} />
          <Button
            title="Supprimer la séance"
            icon="trash-outline"
            variant="danger"
            style={{ marginTop: 8 }}
            onPress={() =>
              confirmAction("Supprimer cette séance ?", "Les paiements déjà enregistrés sont conservés.", () =>
                api.deleteSession(s.id).then(() => {
                  nav.back();
                  nav.refresh();
                }, (e) => showError(e.message))
              )
            }
          />
        </>
      )}
    </View>
  );
}
