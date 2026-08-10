import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as Linking from "expo-linking";

import { env } from "@/config/env";
import { captureException } from "@/lib/observability/sentry";

import { fixtureAuthAdapter } from "./fixtureAuth";
import { toFriendlyAuthError } from "./authErrors";
import { createSupabaseAuthAdapter } from "./supabaseAuth";
import type { AuthAdapter, AuthSession, SignInResult } from "./types";

type AuthContextValue = {
  error: string | null;
  loading: boolean;
  session: AuthSession | null;
  clearError: () => void;
  signInWithEmail: (email: string) => Promise<SignInResult>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const getAdapter = (): AuthAdapter => {
  if (env.dataMode === "fixture") return fixtureAuthAdapter;
  return createSupabaseAuthAdapter();
};

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [adapter] = useState(getAdapter);
  const [session, setSession] = useState<AuthSession | null>(null);
  const sessionRef = useRef<AuthSession | null>(null);
  const explicitSignOut = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const url = Linking.useURL();

  useEffect(() => {
    let mounted = true;
    void adapter
      .getSession()
      .then((restored) => {
        if (!mounted) return;
        sessionRef.current = restored;
        setSession(restored);
      })
      .catch((cause) => {
        captureException(cause);
        if (mounted) setError("Phiên đăng nhập không thể khôi phục.");
      })
      .finally(() => mounted && setLoading(false));

    const unsubscribe = adapter.onSessionChange((nextSession) => {
      if (!nextSession && sessionRef.current && !explicitSignOut.current) {
        setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      }
      sessionRef.current = nextSession;
      setSession(nextSession);
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [adapter]);

  useEffect(() => {
    if (!url?.includes("auth/callback")) return;
    void adapter
      .handleCallbackUrl(url)
      .catch((cause) => {
        captureException(cause);
        setError(toFriendlyAuthError(cause));
      })
      .finally(() => undefined);
  }, [adapter, url]);

  const run = useCallback(async <T,>(action: () => Promise<T>) => {
    setError(null);
    setLoading(true);
    try {
      return await action();
    } catch (cause) {
      captureException(cause);
      setError(toFriendlyAuthError(cause));
      throw cause;
    } finally {
      setLoading(false);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      error,
      loading,
      session,
      clearError: () => setError(null),
      signInWithEmail: (email) => run(() => adapter.signInWithEmail(email)),
      signInWithGoogle: () => run(() => adapter.signInWithGoogle()),
      signOut: () =>
        run(async () => {
          explicitSignOut.current = true;
          try {
            await adapter.signOut();
          } finally {
            explicitSignOut.current = false;
          }
        }),
    }),
    [adapter, error, loading, run, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth phải được dùng trong AuthProvider.");
  return value;
};
