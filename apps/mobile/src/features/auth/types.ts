export type AuthUser = {
  id: string;
  email: string;
};

export type AuthSession = {
  accessToken: string;
  expiresAt?: number;
  user: AuthUser;
};

export type SignInResult =
  { status: "link-sent"; email: string } | { status: "signed-in" };

export type AuthAdapter = {
  getSession: () => Promise<AuthSession | null>;
  onSessionChange: (
    listener: (session: AuthSession | null) => void,
  ) => () => void;
  signInWithEmail: (email: string) => Promise<SignInResult>;
  signInWithGoogle: () => Promise<void>;
  handleCallbackUrl: (url: string) => Promise<void>;
  signOut: () => Promise<void>;
};
