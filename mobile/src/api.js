import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../config";

// En version web, l'app est servie par Flask lui-même : même adresse
const BASE = Platform.OS === "web" ? "" : API_URL;

// Jeton de connexion (mot de passe), gardé sur l'appareil
let token = null;
let onLoggedOut = () => {};
export const auth = {
  load: async () => {
    token = await AsyncStorage.getItem("token").catch(() => null);
  },
  save: async (t) => {
    token = t;
    await AsyncStorage.setItem("token", t).catch(() => {});
  },
  clear: () => {
    token = null;
    AsyncStorage.removeItem("token").catch(() => {});
  },
  onLoggedOut: (fn) => {
    onLoggedOut = fn;
  },
};

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${BASE}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...options,
    });
  } catch (e) {
    throw new Error(
      "Impossible de joindre le serveur. Vérifie que Flask tourne et que l'adresse dans config.js est la bonne."
    );
  }
  if (response.status === 401 && path !== "/api/login") {
    auth.clear();
    onLoggedOut();
    throw new Error("Connexion requise");
  }
  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error((data && data.error) || `Erreur ${response.status}`);
  return data;
}

const send = (method) => (path, body) =>
  request(path, { method, body: body === undefined ? undefined : JSON.stringify(body) });
const post = send("POST");
const put = send("PUT");
const patch = send("PATCH");
const del = send("DELETE");

export const api = {
  login: (password) => post("/api/login", { password }),
  dashboard: () => request("/api/dashboard"),

  students: () => request("/api/students"),
  student: (id) => request(`/api/students/${id}`),
  addStudent: (s) => post("/api/students", s),
  updateStudent: (id, s) => put(`/api/students/${id}`, s),
  deleteStudent: (id) => del(`/api/students/${id}`),

  addItem: (studentId, kind, text) => post(`/api/students/${studentId}/items`, { kind, text }),
  setItemDone: (id, done) => patch(`/api/items/${id}`, { done }),
  deleteItem: (id) => del(`/api/items/${id}`),

  sessions: (status) => request(`/api/sessions${status ? `?status=${status}` : ""}`),
  session: (id) => request(`/api/sessions/${id}`),
  planSession: (s) => post("/api/sessions", s),
  updateSession: (id, s) => put(`/api/sessions/${id}`, s),
  completeSession: (id, s) => post(`/api/sessions/${id}/complete`, s),
  deleteSession: (id, scope) => del(`/api/sessions/${id}${scope ? `?scope=${scope}` : ""}`),

  payments: () => request("/api/payments"),
  addPayment: (p) => post("/api/payments", p),
  deletePayment: (id) => del(`/api/payments/${id}`),

  progretudes: () => request("/api/progretudes"),
  markProgretudesPaid: (sessionIds) => post("/api/progretudes/paid", { session_ids: sessionIds }),
};
