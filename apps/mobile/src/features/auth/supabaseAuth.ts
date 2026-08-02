import "react-native-url-polyfill/auto";

import { createClient, type Session } from "@supabase/supabase-js";
import { makeRedirectUri } from "expo-auth-session";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import * as WebBrowser from "expo-web-browser";
import { AppState, Platform } from "react-native";

import { requireSupabaseConfig } from "@/config/env";
import { secureAuthStorage } from "@/lib/storage/secureAuthStorage";

import type { AuthAdapter, AuthSession } from "./types";

WebBrowser.maybeCompleteAuthSession();

const toAuthSession = (session: Session | null): AuthSession | null => {
  const email = session?.user.email;
  if (!session || !email) return null;

  return {
    accessToken: session.access_token,
    expiresAt: session.expires_at,
    user: { id: session.user.id, email },
  };
};

export const createSupabaseAuthAdapter = (): AuthAdapter => {
  const config = requireSupabaseConfig();
  const redirectTo = makeRedirectUri({
    scheme: "imokay",
    path: "auth/callback",
  });
  const supabase = createClient(config.url, config.publishableKey, {
    auth: {
      storage: secureAuthStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  if (Platform.OS !== "web") {
    AppState.addEventListener("change", (state) => {
      if (state === "active") supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
  }

  const establishSessionFromUrl = async (url: string) => {
    const { params, errorCode } = QueryParams.getQueryParams(url);
    if (errorCode) throw new Error(`Đăng nhập không thành công: ${errorCode}`);

    if (typeof params.code === "string") {
      const { error } = await supabase.auth.exchangeCodeForSession(params.code);
      if (error) throw error;
      return;
    }

    if (
      typeof params.access_token === "string" &&
      typeof params.refresh_token === "string"
    ) {
      const { error } = await supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token,
      });
      if (error) throw error;
    }
  };

  return {
    async getSession() {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return toAuthSession(data.session);
    },
    onSessionChange(listener) {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        listener(toAuthSession(session));
      });
      return () => data.subscription.unsubscribe();
    },
    async signInWithEmail(email) {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) throw error;
      return { status: "link-sent", email };
    },
    async signInWithGoogle() {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) throw error;

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectTo,
      );
      if (result.type === "success") await establishSessionFromUrl(result.url);
    },
    handleCallbackUrl: establishSessionFromUrl,
    async signOut() {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
  };
};
