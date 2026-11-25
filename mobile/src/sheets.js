import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { useTheme, radius } from "./theme";
import { useNav, useLoad } from "./nav";
import { api } from "./api";
import { T, Button, Field, Chips, Toggle, DayPicker, TimePicker, DURATIONS, ListInput, ErrorText, Loading, Empty } from "./ui";
import { euro, todayISO, toNumber, addDays, dayLong } from "./format";

// Gère l'envoi d'un formulaire : chargement, erreur, rafraîchissement
function useSubmit() {
  const nav = useNav();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const submit = async (action) => {
    setError(null);
    setLoading(true);
    try {
      await action();
      nav.closeSheet();
      nav.refresh();
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };
  return { error, loading, submit };
}

const studentOptions = (students) => students.map((s) => ({ value: s.id, label: s.name }));

// ---------------------------------------------------------------------------
// Profil élève (création / modification)
// ---------------------------------------------------------------------------

export function StudentSheet({ student }) {
  const [v, setV] = useState({
    name: student?.name || "",
    level: student?.level || "",
    subject: student?.subject || "",
    hourly_rate: student ? String(student.hourly_rate).replace(".", ",") : "",
    via_progretudes: !!student?.via_progretudes,
  });
  const set = (k) => (x) => setV((o) => ({ ...o, [k]: x }));
  const { error, loading, submit } = useSubmit();
  const save = () => {
    const data = { ...v, hourly_rate: toNumber(v.hourly_rate) };
    return submit(() => (student ? api.updateStudent(student.id, data) : api.addStudent(data)));
  };
  return (
    <View>
      <Field label="Prénom et nom" placeholder="Ex : Inès Martin" value={v.name} onChangeText={set("name")} />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Field label="Niveau" placeholder="Ex : Terminale" value={v.level} onChangeText={set("level")} style={{ flex: 1 }} />
        <Field label="Matière" placeholder="Ex : Maths" value={v.subject} onChangeText={set("subject")} style={{ flex: 1 }} />
      </View>
      <Field label="Tarif horaire (€)" placeholder="Ex : 20" keyboardType="decimal-pad" value={v.hourly_rate} onChangeText={set("hourly_rate")} hint={v.via_progretudes ? "Mets le montant que Progrétudes te verse par heure." : null} />
      <Toggle label="Via Progrétudes" hint="Payé par l'agence, plus tard" value={v.via_progretudes} onChange={set("via_progretudes")} />
      <ErrorText message={error} />
      <Button title={student ? "Enregistrer" : "Créer le profil"} loading={loading} onPress={save} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Planifier / déplacer un cours
// ---------------------------------------------------------------------------

export function PlanSheet({ session, studentId }) {
  const { data: students } = useLoad(api.students);
  const [v, setV] = useState({
    student_id: session?.student_id ?? studentId ?? null,
    date: session?.date || todayISO(),
    time: session?.time || "17:00",
    duration_hours: session?.duration_hours || 1,
    subject: session?.subject || "",
    recurring: false,
    every_weeks: 1,
    repeat: 8,
  });
  const set = (k) => (x) => setV((o) => ({ ...o, [k]: x }));
  const { error, loading, submit } = useSubmit();

  // Choisit le premier élève par défaut et reprend sa matière
  useEffect(() => {
    if (students && students.length && v.student_id == null) set("student_id")(students[0].id);
  }, [students]);
  const student = students?.find((s) => s.id === v.student_id);

  if (!students) return <Loading />;
  if (!students.length) return <Empty icon="people-outline" text="Crée d'abord le profil d'un élève." />;

  const save = () =>
    submit(() =>
      session
        ? api.updateSession(session.id, { date: v.date, time: v.time, duration_hours: v.duration_hours, subject: v.subject })
        : api.planSession({
            student_id: v.student_id,
            date: v.date,
            time: v.time,
            duration_hours: v.duration_hours,
            subject: v.subject || student?.subject || "",
            repeat: v.recurring ? v.repeat : 1,
            every_weeks: v.every_weeks,
          })
    );
  const lastDate = addDays(v.date, 7 * v.every_weeks * (v.repeat - 1));

  return (
    <View>
      {!session && <Chips label="Élève" options={studentOptions(students)} value={v.student_id} onChange={set("student_id")} />}
      <DayPicker label="Date" value={v.date} onChange={set("date")} />
      <TimePicker value={v.time} onChange={set("time")} />
      <Chips label="Durée" options={DURATIONS} value={v.duration_hours} onChange={set("duration_hours")} />
      <Field label="Matière" placeholder={student?.subject || "Ex : Maths"} value={v.subject} onChangeText={set("subject")} />
      {!session && (
        <Toggle label="Cours récurrent" hint="Même créneau, plusieurs semaines" value={v.recurring} onChange={set("recurring")} />
      )}
      {!session && v.recurring && (
        <>
          <Chips label="Fréquence" options={[{ value: 1, label: "Chaque semaine" }, { value: 2, label: "Toutes les 2 semaines" }]} value={v.every_weeks} onChange={set("every_weeks")} />
          <Chips label="Nombre de cours" options={[4, 6, 8, 10, 12, 16, 20, 30].map((n) => ({ value: n, label: String(n) }))} value={v.repeat} onChange={set("repeat")} />
          <T v="small" muted style={{ marginTop: -6, marginBottom: 14 }}>
            Du {dayLong(v.date).toLowerCase()} au {dayLong(lastDate).toLowerCase()}. Tu pourras déplacer ou annuler un cours, ou toute la série.
          </T>
        </>
      )}
      {student ? (
        <T v="small" muted style={{ marginBottom: 14 }}>
          {euro(v.duration_hours * student.hourly_rate)} par cours{student.via_progretudes ? " · payé par Progrétudes" : ""}
        </T>
      ) : null}
      <ErrorText message={error} />
      <Button title={session ? "Enregistrer" : v.recurring ? `Planifier ${v.repeat} cours` : "Planifier le cours"} loading={loading} onPress={save} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Terminer une séance (compte-rendu)
// ---------------------------------------------------------------------------

export function CompleteSheet({ session, edit }) {
  const t = useTheme();
  const { data: student } = useLoad(() => api.student(session.student_id), [session.student_id]);
  const [v, setV] = useState({
    duration_hours: session.duration_hours,
    notes: session.notes || "",
    homework: session.homework || "",
    difficulties: [],
    todos: [],
    payment: "",
  });
  const [paymentTouched, setPaymentTouched] = useState(false);
  const set = (k) => (x) => setV((o) => ({ ...o, [k]: x }));
  const { error, loading, submit } = useSubmit();

  const agency = student ? student.via_progretudes : session.via_agency;
  const amount = student ? v.duration_hours * student.hourly_rate : session.amount;

  // Propose le montant de la séance tant qu'on n'a pas tapé autre chose
  useEffect(() => {
    if (student && !paymentTouched && !edit && !agency) set("payment")((Number.isInteger(amount) ? String(amount) : amount.toFixed(2)).replace(".", ","));
  }, [student, v.duration_hours]);

  const save = () =>
    submit(() =>
      edit
        ? api.updateSession(session.id, { duration_hours: v.duration_hours, notes: v.notes, homework: v.homework })
        : api.completeSession(session.id, {
            duration_hours: v.duration_hours,
            notes: v.notes,
            homework: v.homework,
            difficulties: v.difficulties,
            todos: v.todos,
            payment_amount: !agency && v.payment ? toNumber(v.payment) : null,
            payment_date: todayISO(),
          })
    );

  return (
    <View>
      <Chips label="Durée réelle" options={DURATIONS} value={v.duration_hours} onChange={set("duration_hours")} />
      <Field label="Ce qu'on a fait" placeholder="Notions vues, exercices…" multiline value={v.notes} onChangeText={set("notes")} />
      <Field label="Devoirs pour la prochaine fois" placeholder="Ex : exercices 12 et 13 p. 45" multiline value={v.homework} onChangeText={set("homework")} />
      {!edit && (
        <>
          <ListInput label="Nouvelles difficultés" values={v.difficulties} onChange={set("difficulties")} placeholder="Ex : signe d'une dérivée" />
          <ListInput label="À faire la prochaine séance" values={v.todos} onChange={set("todos")} placeholder="Ex : corriger le DM" />
          {agency ? (
            <View style={{ backgroundColor: t.warningSoft, borderRadius: radius.sm, padding: 14, marginBottom: 16 }}>
              <T v="strong" color={t.warning}>{euro(amount)} à recevoir de Progrétudes</T>
              <T v="small" color={t.warning} style={{ marginTop: 2 }}>Tu pourras le marquer comme reçu dans l'onglet Argent.</T>
            </View>
          ) : (
            <Field
              label="Argent reçu aujourd'hui (€)"
              keyboardType="decimal-pad"
              placeholder="0"
              value={v.payment}
              onChangeText={(x) => {
                setPaymentTouched(true);
                set("payment")(x);
              }}
              hint={
                student
                  ? `Séance : ${euro(amount)}. ${student.balance > 0 ? `Il restait ${euro(student.balance)} à payer.` : student.balance < 0 ? `Avance déjà versée : ${euro(-student.balance)}.` : ""} Si l'élève paie plus, le reste compte comme une avance.`
                  : null
              }
            />
          )}
        </>
      )}
      <ErrorText message={error} />
      <Button title={edit ? "Enregistrer" : "Terminer la séance"} loading={loading} onPress={save} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Paiement direct (y compris d'avance)
// ---------------------------------------------------------------------------

export function PaymentSheet({ studentId }) {
  const { data } = useLoad(api.students);
  const students = (data || []).filter((s) => !s.via_progretudes);
  const [v, setV] = useState({ student_id: studentId ?? null, date: todayISO(), amount: "", note: "" });
  const set = (k) => (x) => setV((o) => ({ ...o, [k]: x }));
  const { error, loading, submit } = useSubmit();

  useEffect(() => {
    if (students.length && v.student_id == null) set("student_id")(students[0].id);
  }, [data]);

  if (!data) return <Loading />;
  if (!students.length) return <Empty icon="people-outline" text="Aucun élève payé en direct pour l'instant." />;
  const student = students.find((s) => s.id === v.student_id);

  return (
    <View>
      <Chips label="Élève" options={studentOptions(students)} value={v.student_id} onChange={set("student_id")} />
      {student ? (
        <T v="small" muted style={{ marginTop: -8, marginBottom: 14 }}>
          {student.balance > 0 ? `Doit actuellement ${euro(student.balance)}.` : student.balance < 0 ? `A déjà ${euro(-student.balance)} d'avance.` : "À jour."}
        </T>
      ) : null}
      <DayPicker label="Date" value={v.date} onChange={set("date")} />
      <Field label="Montant (€)" placeholder="Ex : 40" keyboardType="decimal-pad" value={v.amount} onChangeText={set("amount")} hint="Un montant supérieur à ce qui est dû compte comme une avance pour les prochains cours." />
      <Field label="Note (facultatif)" placeholder="Ex : espèces, pour 2 séances" value={v.note} onChangeText={set("note")} />
      <ErrorText message={error} />
      <Button title="Enregistrer le paiement" loading={loading} onPress={() => submit(() => api.addPayment({ ...v, amount: toNumber(v.amount) }))} />
    </View>
  );
}
