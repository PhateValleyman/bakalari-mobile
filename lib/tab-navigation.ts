export const TAB_PATHS = ["/", "/schedule", "/grades", "/homework", "/messages", "/settings"] as const;

export type TabPath = (typeof TAB_PATHS)[number];

export function tabIndex(pathname: string): number {
  if (pathname.endsWith("/schedule")) return 1;
  if (pathname.endsWith("/grades")) return 2;
  if (pathname.endsWith("/homework")) return 3;
  if (pathname.endsWith("/messages")) return 4;
  if (pathname.endsWith("/settings")) return 5;
  return pathname === "/" || pathname.endsWith("/(tabs)") ? 0 : -1;
}

export function nextTabPath(pathname: string, translationX: number): TabPath | null {
  if (Math.abs(translationX) < 60) return null;
  const currentIndex = tabIndex(pathname);
  if (currentIndex < 0) return null;
  const nextIndex = translationX < 0 ? currentIndex + 1 : currentIndex - 1;
  return TAB_PATHS[nextIndex] ?? null;
}
