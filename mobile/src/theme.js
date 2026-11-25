import { createContext, useContext } from "react";

// Palette bordeaux / rose
const light = {
  mode: "light",
  bg: "#FBF5F7",
  surface: "#FFFFFF",
  surfaceAlt: "#F7EBEF",
  text: "#2A0B16",
  muted: "#8A6672",
  border: "#EFDCE2",
  primary: "#8C2B48",
  onPrimary: "#FFFFFF",
  accent: "#C4627A",
  soft: "#F6E1E8",
  success: "#3F7D5C",
  successSoft: "#E3F1E9",
  warning: "#A2650F",
  warningSoft: "#FBEFD9",
  danger: "#B3364A",
  hero: ["#4E1428", "#7A2440", "#AE4A66"],
  heroText: "#FFF5F7",
  heroMuted: "#F0C3D0",
  shadow: "#4E1428",
};

const dark = {
  mode: "dark",
  bg: "#16060C",
  surface: "#250C16",
  surfaceAlt: "#341220",
  text: "#FBE9EE",
  muted: "#C29AA7",
  border: "#45182A",
  primary: "#EFA3B6",
  onPrimary: "#2A0B16",
  accent: "#DB8DA0",
  soft: "#3E1526",
  success: "#8FD0AB",
  successSoft: "#1C3529",
  warning: "#F2C27B",
  warningSoft: "#3A2812",
  danger: "#F28C9C",
  hero: ["#3A0F1F", "#6E1F35", "#9C3A57"],
  heroText: "#FFF0F4",
  heroMuted: "#E7AFC0",
  shadow: "#000000",
};

export const themes = { light, dark };

export const fonts = {
  serif: "PlayfairDisplay_600SemiBold",
  serifBold: "PlayfairDisplay_700Bold",
  regular: "DMSans_400Regular",
  medium: "DMSans_500Medium",
  bold: "DMSans_700Bold",
};

// Angles volontairement peu arrondis
export const radius = { sm: 6, md: 10, lg: 14 };

export const ThemeContext = createContext({ theme: light, toggleTheme: () => {} });
export const useTheme = () => useContext(ThemeContext).theme;
