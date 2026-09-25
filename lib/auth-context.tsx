import * as SecureStore from "expo-secure-store";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Platform } from "react-native";

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

const SESSION_KEY = "bakalari-mobile.auth-session.v1";
const AuthContext = createContext<AuthContextValue | null>(null);

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
    readSession().then((storedUser) => {
      if (!active) return;
      setUser(storedUser);
      setStatus(storedUser ? "signed_in" : "signed_out");
    });
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async ({ schoolUrl, email, password }: { schoolUrl: string; email: string; password: string }) => {
    if (!schoolUrl.trim() || !email.trim() || !password) {
      throw new Error("Vyplňte školní adresu, e-mail a heslo.");
    }

    // Future API boundary: replace this local demo session with an API request.
    const nextUser: AuthUser = {
      id: `demo-${email.trim().toLowerCase()}`,
      name: email.trim().split("@")[0] || "Student",
      email: email.trim(),
      schoolUrl: schoolUrl.trim(),
      isDemo: true,
    };
    await writeSession(nextUser);
    setUser(nextUser);
    setStatus("signed_in");
  }, []);

  const signOut = useCallback(async () => {
    await clearSession();
    setUser(null);
    setStatus("signed_out");
  }, []);

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
