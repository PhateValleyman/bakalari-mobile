import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Appearance, View, useColorScheme as useSystemColorScheme } from "react-native";
import { colorScheme as nativewindColorScheme, vars } from "nativewind";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { buildRuntimePalette, type ColorScheme, type ThemeColorPalette } from "@/constants/theme";

export type ThemeVariant = "system" | "light" | "dark" | "black";

const THEME_KEY = "bakalari-mobile.theme";
const THEME_VARIANT_KEY = "bakalari-mobile.theme-variant";
const ACCENT_KEY = "bakalari-mobile.theme-accent";
const DEFAULT_ACCENT = "#2F7DF6";

const BLACK_OVERRIDES = {
  background: "#050608",
  surface: "#11151C",
  foreground: "#F6F7F9",
  muted: "#A5AFBF",
  border: "#283244",
  primary: "#F9A825",
  success: "#5BD69A",
  warning: "#FFD166",
  error: "#FF8B94",
};

type ThemeContextValue = {
  colorScheme: ColorScheme;
  themeVariant: ThemeVariant;
  accentColor: string;
  colors: ThemeColorPalette;
  setColorScheme: (scheme: ColorScheme) => void;
  setThemeVariant: (variant: ThemeVariant) => void;
  setAccentColor: (color: string) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme() ?? "light";
  const [themeVariant, setThemeVariantState] = useState<ThemeVariant>("system");
  const [accentColor, setAccentColorState] = useState(DEFAULT_ACCENT);
  const colorScheme: ColorScheme = themeVariant === "system" ? systemScheme : themeVariant === "light" ? "light" : "dark";
  const colors = useMemo(
    () => buildRuntimePalette(colorScheme, {
      ...(themeVariant === "black" ? BLACK_OVERRIDES : {}),
      ...(themeVariant === "black" ? {} : { primary: accentColor }),
    }),
    [accentColor, colorScheme, themeVariant],
  );

  useEffect(() => {
    void Promise.all([AsyncStorage.getItem(THEME_VARIANT_KEY), AsyncStorage.getItem(THEME_KEY), AsyncStorage.getItem(ACCENT_KEY)]).then(([variant, legacyScheme, accent]) => {
      if (variant === "system" || variant === "light" || variant === "dark" || variant === "black") setThemeVariantState(variant);
      else if (legacyScheme === "light" || legacyScheme === "dark") setThemeVariantState(legacyScheme);
      if (accent) setAccentColorState(accent);
    });
  }, []);

  const applyScheme = useCallback((scheme: ColorScheme, palette: ThemeColorPalette) => {
    nativewindColorScheme.set(scheme);
    Appearance.setColorScheme?.(scheme);
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.dataset.theme = scheme;
      root.classList.toggle("dark", scheme === "dark");
      Object.entries(palette).forEach(([token, value]) => {
        if (typeof value === "string") root.style.setProperty(`--color-${token}`, value);
      });
    }
  }, []);

  useEffect(() => {
    applyScheme(colorScheme, colors);
  }, [applyScheme, colorScheme, colors]);

  const setThemeVariant = useCallback((variant: ThemeVariant) => {
    setThemeVariantState(variant);
    void AsyncStorage.setItem(THEME_VARIANT_KEY, variant);
    if (variant === "light" || variant === "dark") void AsyncStorage.setItem(THEME_KEY, variant);
  }, []);

  const setColorScheme = useCallback((scheme: ColorScheme) => setThemeVariant(scheme), [setThemeVariant]);
  const setAccentColor = useCallback((color: string) => {
    setAccentColorState(color);
    void AsyncStorage.setItem(ACCENT_KEY, color);
  }, []);

  const themeVariables = useMemo(() => vars({
    "color-primary": colors.primary,
    "color-background": colors.background,
    "color-surface": colors.surface,
    "color-foreground": colors.foreground,
    "color-muted": colors.muted,
    "color-border": colors.border,
    "color-success": colors.success,
    "color-warning": colors.warning,
    "color-error": colors.error,
  }), [colors]);

  const value = useMemo(() => ({ colorScheme, themeVariant, accentColor, colors, setColorScheme, setThemeVariant, setAccentColor }), [accentColor, colorScheme, colors, setAccentColor, setColorScheme, setThemeVariant, themeVariant]);
  return (
    <ThemeContext.Provider value={value}>
      <View style={[{ flex: 1 }, themeVariables]}>{children}</View>
    </ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeContext must be used within ThemeProvider");
  return ctx;
}
