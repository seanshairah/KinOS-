import * as SecureStore from "expo-secure-store";
import { createContext, useContext, useEffect, useState } from "react";

/**
 * The device's key to the family space — one bearer token in the
 * system keychain, nothing else stored on the phone.
 */

const KEY = "kinos.session";

interface SessionState {
  token: string | null;
  ready: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionState>({
  token: null,
  ready: false,
  signIn: async () => {},
  signOut: async () => {},
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(KEY)
      .then((t) => setToken(t))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const signIn = async (t: string) => {
    await SecureStore.setItemAsync(KEY, t);
    setToken(t);
  };
  const signOut = async () => {
    await SecureStore.deleteItemAsync(KEY).catch(() => {});
    setToken(null);
  };

  return (
    <SessionContext.Provider value={{ token, ready, signIn, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);
