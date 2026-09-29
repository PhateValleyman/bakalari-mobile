import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export type BakalariTokenSet = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

export type BakalariLoginResult = {
  tokenSet: BakalariTokenSet;
  userId: string;
  apiVersion?: string;
};

export class BakalariApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "BakalariApiError";
    this.status = status;
    this.code = code;
  }
}

const TOKEN_KEY_PREFIX = "bakalari-mobile.tokens.v2.";
const TOKEN_SKEW_MS = 60_000;
const REQUEST_TIMEOUT_MS = 20_000;
const SECRET_CHUNK_SIZE = 1_700;
const refreshInFlight = new Map<string, Promise<BakalariLoginResult>>();

type TokenMeta = {
  accessCount: number;
  refreshCount: number;
  expiresAt: number;
};

// Normalize the school host once so all API requests use the same origin.
export function normalizeSchoolUrl(input: string): string {
  const candidate = input.trim().replace(/\/+$/, "");
  if (!candidate) throw new BakalariApiError("Zadejte adresu školy.", 0);
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(candidate) && !/^https?:\/\//i.test(candidate)) {
    throw new BakalariApiError("Adresa školy musí začínat http:// nebo https://.", 0);
  }
  const withScheme = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;
  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    throw new BakalariApiError("Adresa školy není platná.", 0);
  }
  if (!/^https?:$/.test(parsed.protocol) || !parsed.hostname) {
    throw new BakalariApiError("Adresa školy musí začínat http:// nebo https://.", 0);
  }
  return parsed.toString().replace(/\/+$/, "");
}

function tokenKey(schoolUrl: string): string {
  const normalized = normalizeSchoolUrl(schoolUrl);
  // SecureStore keys allow only alphanumeric characters, dots, dashes, and underscores.
  const safeSchoolId = Array.from(normalized)
    .map((character) => character.charCodeAt(0).toString(16).padStart(4, "0"))
    .join("");
  return `${TOKEN_KEY_PREFIX}${safeSchoolId}`;
}

async function getStoredValue(key: string): Promise<string | null> {
  try {
    return Platform.OS === "web" ? window.localStorage.getItem(key) : await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function setStoredValue(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    window.localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function deleteStoredValue(key: string): Promise<void> {
  if (Platform.OS === "web") {
    window.localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

// Split tokens below platform value limits while keeping every fragment encrypted on native.
function splitSecret(value: string): string[] {
  const chunks: string[] = [];
  for (let offset = 0; offset < value.length; offset += SECRET_CHUNK_SIZE) {
    chunks.push(value.slice(offset, offset + SECRET_CHUNK_SIZE));
  }
  return chunks;
}

async function readChunks(prefix: string, count: number): Promise<string | null> {
  const chunks = await Promise.all(Array.from({ length: count }, (_, index) => getStoredValue(`${prefix}.${index}`)));
  return chunks.every((chunk): chunk is string => Boolean(chunk)) ? chunks.join("") : null;
}

async function deleteChunks(prefix: string, count: number): Promise<void> {
  await Promise.all(Array.from({ length: count }, (_, index) => deleteStoredValue(`${prefix}.${index}`)));
}

async function readMeta(baseKey: string): Promise<TokenMeta | null> {
  const raw = await getStoredValue(`${baseKey}.meta`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<TokenMeta>;
    if (
      !Number.isInteger(parsed.accessCount) || typeof parsed.accessCount !== "number" || parsed.accessCount <= 0 ||
      !Number.isInteger(parsed.refreshCount) || typeof parsed.refreshCount !== "number" || parsed.refreshCount <= 0 ||
      typeof parsed.expiresAt !== "number" || !Number.isFinite(parsed.expiresAt) || parsed.expiresAt <= 0
    ) {
      return null;
    }
    return parsed as TokenMeta;
  } catch {
    return null;
  }
}

// Keep refresh credentials in the platform secure store; never persist the password.
async function readTokens(schoolUrl: string): Promise<BakalariTokenSet | null> {
  const baseKey = tokenKey(schoolUrl);
  const meta = await readMeta(baseKey);
  if (!meta) return null;
  const [accessToken, refreshToken] = await Promise.all([
    readChunks(`${baseKey}.access`, meta.accessCount),
    readChunks(`${baseKey}.refresh`, meta.refreshCount),
  ]);
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken, expiresAt: meta.expiresAt };
}

async function writeTokens(schoolUrl: string, tokenSet: BakalariTokenSet): Promise<void> {
  const baseKey = tokenKey(schoolUrl);
  const oldMeta = await readMeta(baseKey);
  const accessChunks = splitSecret(tokenSet.accessToken);
  const refreshChunks = splitSecret(tokenSet.refreshToken);
  await Promise.all([
    ...accessChunks.map((chunk, index) => setStoredValue(`${baseKey}.access.${index}`, chunk)),
    ...refreshChunks.map((chunk, index) => setStoredValue(`${baseKey}.refresh.${index}`, chunk)),
  ]);
  if (oldMeta) {
    await Promise.all([
      ...Array.from({ length: Math.max(0, oldMeta.accessCount - accessChunks.length) }, (_, index) => deleteStoredValue(`${baseKey}.access.${accessChunks.length + index}`)),
      ...Array.from({ length: Math.max(0, oldMeta.refreshCount - refreshChunks.length) }, (_, index) => deleteStoredValue(`${baseKey}.refresh.${refreshChunks.length + index}`)),
    ]);
  }
  // Write metadata last so incomplete token writes are never considered a valid session.
  await setStoredValue(`${baseKey}.meta`, JSON.stringify({
    accessCount: accessChunks.length,
    refreshCount: refreshChunks.length,
    expiresAt: tokenSet.expiresAt,
  } satisfies TokenMeta));
}

export async function clearBakalariTokens(schoolUrl: string): Promise<void> {
  const baseKey = tokenKey(schoolUrl);
  const meta = await readMeta(baseKey);
  if (meta) {
    await Promise.all([
      deleteChunks(`${baseKey}.access`, meta.accessCount),
      deleteChunks(`${baseKey}.refresh`, meta.refreshCount),
    ]);
  }
  await deleteStoredValue(`${baseKey}.meta`);
}

function formBody(values: Record<string, string>): string {
  return Object.entries(values)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
}

async function parseResponse(response: Response): Promise<Record<string, unknown>> {
  let body: Record<string, unknown> = {};
  try {
    const parsed: unknown = await response.json();
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      body = parsed as Record<string, unknown>;
    }
  } catch {
    // Keep a stable error below when the school returns a non-JSON response.
  }
  if (!response.ok) {
    const description = typeof body.error_description === "string" ? body.error_description : undefined;
    const code = typeof body.error === "string" ? body.error : undefined;
    const message = response.status === 401 || code === "invalid_grant"
      ? "Přihlášení se nezdařilo. Zkontrolujte školu, uživatelské jméno a heslo."
      : description ?? `Server školy odpověděl chybou (${response.status}).`;
    throw new BakalariApiError(message, response.status, code);
  }
  return body;
}

// Apply a bounded timeout to requests that otherwise could leave the mobile UI waiting indefinitely.
async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (init?.signal) return fetch(input, init);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function postTokenRequest(schoolUrl: string, body: Record<string, string>): Promise<BakalariLoginResult> {
  try {
    const response = await fetchWithTimeout(`${normalizeSchoolUrl(schoolUrl)}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: formBody({ client_id: "ANDR", ...body }),
    });
    const payload = await parseResponse(response);
    const accessToken = typeof payload.access_token === "string" ? payload.access_token : "";
    const refreshToken = typeof payload.refresh_token === "string" ? payload.refresh_token : "";
    const expiresIn = typeof payload.expires_in === "number" ? payload.expires_in : 600;
    if (!accessToken || !refreshToken) {
      throw new BakalariApiError("Odpověď školy neobsahuje platné tokeny.", 502);
    }
    const tokenSet: BakalariTokenSet = {
      accessToken,
      refreshToken,
      expiresAt: Date.now() + Math.max(expiresIn, 60) * 1000,
    };
    await writeTokens(schoolUrl, tokenSet);
    return {
      tokenSet,
      userId: typeof payload["bak:UserId"] === "string" ? payload["bak:UserId"] : "",
      apiVersion: typeof payload["bak:ApiVersion"] === "string" ? payload["bak:ApiVersion"] : undefined,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new BakalariApiError("Připojení ke škole vypršelo. Zkontrolujte adresu a síť.", 408);
    }
    if (error instanceof TypeError) {
      throw new BakalariApiError("Školní server není dostupný nebo blokuje připojení z této aplikace.", 0);
    }
    throw error;
  }
}

// Exchange the user's credentials for the first access/refresh token pair.
export async function loginToBakalari(schoolUrl: string, username: string, password: string): Promise<BakalariLoginResult> {
  return postTokenRequest(schoolUrl, {
    grant_type: "password",
    username,
    password,
  });
}

// Rotate both tokens before expiry; Bakaláři expects the latest refresh token to be retained.
export async function refreshBakalariSession(schoolUrl: string, refreshToken: string): Promise<BakalariLoginResult> {
  return postTokenRequest(schoolUrl, {
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
}

// Return a valid access token and transparently refresh it when it is close to expiry.
async function refreshStoredAccessToken(schoolUrl: string, tokens: BakalariTokenSet): Promise<string | null> {
  const normalizedSchoolUrl = normalizeSchoolUrl(schoolUrl);
  const existingRefresh = refreshInFlight.get(normalizedSchoolUrl);
  if (existingRefresh) {
    try {
      return (await existingRefresh).tokenSet.accessToken;
    } catch {
      return null;
    }
  }
  const refreshPromise = refreshBakalariSession(normalizedSchoolUrl, tokens.refreshToken);
  refreshInFlight.set(normalizedSchoolUrl, refreshPromise);
  try {
    const refreshed = await refreshPromise;
    return refreshed.tokenSet.accessToken;
  } catch {
    await clearBakalariTokens(normalizedSchoolUrl);
    return null;
  } finally {
    refreshInFlight.delete(normalizedSchoolUrl);
  }
}

export async function getValidAccessToken(schoolUrl: string): Promise<string | null> {
  const tokens = await readTokens(schoolUrl);
  if (!tokens) return null;
  if (tokens.expiresAt - Date.now() > TOKEN_SKEW_MS) return tokens.accessToken;
  return refreshStoredAccessToken(schoolUrl, tokens);
}

// Force rotation when the school rejects an otherwise unexpired access token.
export async function forceRefreshBakalariSession(schoolUrl: string): Promise<string | null> {
  const tokens = await readTokens(schoolUrl);
  return tokens ? refreshStoredAccessToken(schoolUrl, tokens) : null;
}

// Make an authenticated API request and retry once after a token refresh on HTTP 401.
export async function bakalariFetch<T>(schoolUrl: string, path: string, init?: RequestInit): Promise<T> {
  const accessToken = await getValidAccessToken(schoolUrl);
  if (!accessToken) throw new BakalariApiError("Session školy vypršela. Přihlaste se znovu.", 401);
  const url = `${normalizeSchoolUrl(schoolUrl)}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  headers.set("Accept", "application/json");
  try {
    const response = await fetchWithTimeout(url, { ...init, headers });
    if (response.status === 401) {
      const latestToken = await forceRefreshBakalariSession(schoolUrl);
      if (!latestToken) throw new BakalariApiError("Session školy vypršela. Přihlaste se znovu.", 401);
      const retryHeaders = new Headers(init?.headers);
      retryHeaders.set("Authorization", `Bearer ${latestToken}`);
      retryHeaders.set("Accept", "application/json");
      const retryResponse = await fetchWithTimeout(response.url, { ...init, headers: retryHeaders });
      if (!retryResponse.ok) throw new BakalariApiError(`Autorizovaný požadavek selhal (${retryResponse.status}).`, retryResponse.status);
      return (await retryResponse.json()) as T;
    }
    if (!response.ok) throw new BakalariApiError(`Požadavek na Bakaláře selhal (${response.status}).`, response.status);
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new BakalariApiError("Požadavek na školu vypršel. Zkontrolujte připojení k síti.", 408);
    }
    throw error;
  }
}
