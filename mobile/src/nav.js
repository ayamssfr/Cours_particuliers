import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Alert, Platform } from "react-native";

// Navigation maison : une pile de pages (élève, séance) + une fenêtre de formulaire.
// `version` augmente après chaque modification pour que les écrans se rechargent.
export const NavContext = createContext(null);
export const useNav = () => useContext(NavContext);

// Charge des données et les recharge à chaque modification
export function useLoad(loader, deps = []) {
  const { version } = useNav();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    loader()
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e) => setError(e.message));
  }, deps);

  useEffect(() => {
    load();
  }, [load, version]);

  return { data, error, reload: load };
}

// Demande de confirmation qui marche aussi dans la version web
export function confirmAction(title, message, onConfirm) {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: "Annuler", style: "cancel" },
    { text: "Supprimer", style: "destructive", onPress: onConfirm },
  ]);
}

export function showError(message) {
  if (Platform.OS === "web") window.alert(message);
  else Alert.alert("Erreur", message);
}
