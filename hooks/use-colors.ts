import { Colors, type ColorScheme, type ThemeColorPalette } from "@/constants/theme";
import { useThemeContext } from "@/lib/theme-provider";

/** Return the active palette, including custom accent and preset overrides. */
export function useColors(colorSchemeOverride?: ColorScheme): ThemeColorPalette {
  const { colors } = useThemeContext();
  return colorSchemeOverride ? Colors[colorSchemeOverride] : colors;
}
