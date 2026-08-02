import AsyncStorage from "@react-native-async-storage/async-storage";

import type { AuthAdapter, AuthSession } from "./types";

const STORAGE_KEY = "imokay.fixture.auth-session.v1";
const listeners = new Set<(session: AuthSession | null) => void>();

const createSession = (email: string): AuthSession => ({
  accessToken: "local-fixture-access-token",
  user: { id: "local-fixture-user", email },
});

const persist = async (session: AuthSession | null) => {
  if (session) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } else {
    await AsyncStorage.removeItem(STORAGE_KEY);
  }
  listeners.forEach((listener) => listener(session));
};

export const fixtureAuthAdapter: AuthAdapter = {
  async getSession() {
    const value = await AsyncStorage.getItem(STORAGE_KEY);
    return value ? (JSON.parse(value) as AuthSession) : null;
  },
  onSessionChange(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  async signInWithEmail(email) {
    await persist(createSession(email));
    return { status: "signed-in" };
  },
  async signInWithGoogle() {
    await persist(createSession("demo@imokay.local"));
  },
  async handleCallbackUrl() {},
  async signOut() {
    await persist(null);
  },
};
