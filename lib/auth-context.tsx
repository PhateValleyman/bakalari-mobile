import * as SecureStore from "expo-secure-store";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Platform } from "react-native";

import {
  clearBakalariTokens,
  getValidAccessToken,
  loginToBakalari,
  normalizeSchoolUrl,
} from "@/lib/bakalari-api";

export type AuthStatus = "loading" | "signed_out" | "signed_in";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  schoolUrl: string;
  isDemo: boolean;
};

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  isAuthenticated: boolean;
  signIn: (input: { schoolUrl: string; email: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
};

const SESSION_KEY = "bakalari-mobile.auth-session.v2";
const AuthContext = createContext<AuthContextValue | null>(null);

// Store only non-sensitive profile metadata separately from the API token pair.
async function readSession(): Promise<AuthUser | null> {
  try {
    const raw = Platform.OS === "web"
      ? window.localStorage.getItem(SESSION_KEY)
      : await SecureStore.getItemAsync(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

async function writeSession(user: AuthUser): Promise<void> {
  const raw = JSON.stringify(user);
  if (Platform.OS === "web") {
    window.localStorage.setItem(SESSION_KEY, raw);
    return;
  }
  await SecureStore.setItemAsync(SESSION_KEY, raw);
}

async function clearSession(): Promise<void> {
  if (Platform.OS === "web") {
    window.localStorage.removeItem(SESSION_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let active = true;
    readSession().then(async (storedUser) => {
      if (!active) return;
      if (!storedUser) {
        setStatus("signed_out");
        return;
      }
      const accessToken = await getValidAccessToken(storedUser.schoolUrl);
      if (!active) return;
      if (accessToken) {
        setUser(storedUser);
        setStatus("signed_in");
      } else {
        await clearSession();
        setStatus("signed_out");
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async ({ schoolUrl, email, password }: { schoolUrl: string; email: string; password: string }) => {
    if (!schoolUrl.trim() || !email.trim() || !password) {
      throw new Error("Vyplňte školní adresu, uživatelské jméno a heslo.");
    }
    const normalizedSchoolUrl = normalizeSchoolUrl(schoolUrl);
    const result = await loginToBakalari(normalizedSchoolUrl, email.trim(), password);
    const name = email.trim().split("@")[0] || "Student";
    const nextUser: AuthUser = {
      id: result.userId || `bakalari-${email.trim().toLowerCase()}`,
      name: name.charAt(0).toUpperCase() + name.slice(1),
      email: email.trim(),
      schoolUrl: normalizedSchoolUrl,
      isDemo: false,
    };
    await writeSession(nextUser);
    setUser(nextUser);
    setStatus("signed_in");
  }, []);

  const signOut = useCallback(async () => {
    if (user?.schoolUrl) {
      await clearBakalariTokens(user.schoolUrl);
    }
    await clearSession();
    setUser(null);
    setStatus("signed_out");
  }, [user?.schoolUrl]);

  const value = useMemo<AuthContextValue>(() => ({
    status,
    user,
    isAuthenticated: status === "signed_in" && Boolean(user),
    signIn,
    signOut,
  }), [status, user, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthState() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthState must be used inside AuthProvider");
  }
  return context;
}
