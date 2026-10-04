import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export type ParentalRole = "parent" | "student";
export type ParentalControlState = { role: ParentalRole; locked: boolean; lockReason: "homework" | null; lockedAt: string | null };
export type PairingToken = { type: "bakalari-parent-pairing"; deviceId: string; secret: string };
export type UnlockToken = { type: "bakalari-parent-unlock"; deviceId: string; issuedAt: string; expiresAt: string; nonce: string; signature: string };

const STATE_KEY = "bakalari-mobile.parental-control.v1";
const DEVICE_KEY = "bakalari-mobile.parental-device-id.v1";
const SECRET_KEY = "bakalari-mobile.parental-unlock-secret.v1";
const PAIRED_DEVICE_KEY = "bakalari-mobile.parental-paired-device.v1";
const DEFAULT_STATE: ParentalControlState = { role: "student", locked: false, lockReason: null, lockedAt: null };

async function getValue(key: string): Promise<string | null> { return Platform.OS === "web" ? window.localStorage.getItem(key) : SecureStore.getItemAsync(key); }
async function setValue(key: string, value: string): Promise<void> { if (Platform.OS === "web") window.localStorage.setItem(key, value); else await SecureStore.setItemAsync(key, value); }
async function getOrCreate(key: string, create: () => string): Promise<string> { const existing = await getValue(key); if (existing) return existing; const value = create(); await setValue(key, value); return value; }
async function sign(secret: string, payload: string): Promise<string> { return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${secret}|${payload}|${secret}`); }

export async function readParentalState(): Promise<ParentalControlState> {
  const raw = await AsyncStorage.getItem(STATE_KEY);
  if (!raw) return DEFAULT_STATE;
  try { return { ...DEFAULT_STATE, ...(JSON.parse(raw) as Partial<ParentalControlState>) }; } catch { return DEFAULT_STATE; }
}

export async function writeParentalState(next: ParentalControlState): Promise<void> { await AsyncStorage.setItem(STATE_KEY, JSON.stringify(next)); }
export async function setParentalRole(role: ParentalRole): Promise<ParentalControlState> { const next = { ...(await readParentalState()), role }; await writeParentalState(next); return next; }
export async function lockForHomework(): Promise<ParentalControlState> { const next: ParentalControlState = { role: "student", locked: true, lockReason: "homework", lockedAt: new Date().toISOString() }; await writeParentalState(next); return next; }
export async function unlockLocally(): Promise<ParentalControlState> { const next = { ...(await readParentalState()), locked: false, lockReason: null }; await writeParentalState(next); return next; }

export async function createPairingCode(): Promise<string> {
  const deviceId = await getOrCreate(DEVICE_KEY, () => Crypto.randomUUID());
  const secret = await getOrCreate(SECRET_KEY, () => Crypto.randomUUID() + Crypto.randomUUID());
  return JSON.stringify({ type: "bakalari-parent-pairing", deviceId, secret } satisfies PairingToken);
}

export async function importPairingCode(raw: string): Promise<boolean> {
  try {
    const token = JSON.parse(raw) as PairingToken;
    if (token.type !== "bakalari-parent-pairing" || !token.deviceId || !token.secret) return false;
    await setValue(PAIRED_DEVICE_KEY, JSON.stringify(token));
    return true;
  } catch { return false; }
}

export async function createOfflineUnlockToken(validMinutes = 15): Promise<string> {
  const pairedRaw = await getValue(PAIRED_DEVICE_KEY);
  if (!pairedRaw) throw new Error("Nejprve spáruj rodičovské zařízení s tabletem pomocí QR kódu.");
  const paired = JSON.parse(pairedRaw) as PairingToken;
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + validMinutes * 60_000);
  const unsigned = { type: "bakalari-parent-unlock" as const, deviceId: paired.deviceId, issuedAt: issuedAt.toISOString(), expiresAt: expiresAt.toISOString(), nonce: Crypto.randomUUID() };
  const signature = await sign(paired.secret, JSON.stringify(unsigned));
  return JSON.stringify({ ...unsigned, signature } satisfies UnlockToken);
}

export async function verifyOfflineUnlockToken(raw: string): Promise<boolean> {
  try {
    const token = JSON.parse(raw) as UnlockToken;
    if (token.type !== "bakalari-parent-unlock" || new Date(token.expiresAt).getTime() < Date.now()) return false;
    const deviceId = await getOrCreate(DEVICE_KEY, () => Crypto.randomUUID());
    const secret = await getValue(SECRET_KEY);
    if (!secret || token.deviceId !== deviceId) return false;
    const unsigned = { type: token.type, deviceId: token.deviceId, issuedAt: token.issuedAt, expiresAt: token.expiresAt, nonce: token.nonce };
    return (await sign(secret, JSON.stringify(unsigned))) === token.signature;
  } catch { return false; }
}
