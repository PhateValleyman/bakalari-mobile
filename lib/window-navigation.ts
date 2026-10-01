export const WINDOW_PATHS = [
  "/",
  "/schedule",
  "/grades",
  "/homework",
  "/absence",
  "/messages",
  "/settings",
] as const;

export type WindowPath = (typeof WINDOW_PATHS)[number];

export function getWindowPath(pathname: string): WindowPath {
  if (pathname === "/" || pathname === "/index") return "/";
  const match = WINDOW_PATHS.find((path) => path !== "/" && pathname.startsWith(path));
  return match ?? "/";
}

export function getAdjacentWindow(pathname: string, direction: "next" | "previous"): WindowPath | null {
  const current = getWindowPath(pathname);
  const index = WINDOW_PATHS.indexOf(current);
  const nextIndex = direction === "next" ? index + 1 : index - 1;
  return WINDOW_PATHS[nextIndex] ?? null;
}
