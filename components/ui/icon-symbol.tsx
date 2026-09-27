// Fallback for using MaterialIcons on Android and web.
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * The Material fallback keeps the same icon vocabulary on Android, iOS and web.
 */
const MAPPING = {
  "house.fill": "home",
  "calendar": "calendar-month",
  "chart.bar.fill": "bar-chart",
  "checklist": "assignment",
  "person.crop.circle": "account-circle",
  "bell.fill": "notifications-none",
  "arrow.clockwise": "refresh",
  "chevron.right": "chevron-right",
  "chevron.left": "chevron-left",
  "checkmark.circle.fill": "check-circle",
  "circle": "radio-button-unchecked",
  "plus": "add",
  "link": "link",
  "info.circle": "info-outline",
  "clock": "schedule",
  "location": "room",
  "book.closed": "menu-book",
  "trending.up": "trending-up",
  "trending.down": "trending-down",
  "minus": "remove",
} as const satisfies Record<string, ComponentProps<typeof MaterialIcons>["name"]>;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
