import { useEffect, useSyncExternalStore } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AUTH_EVENT, getUser, initAuth, isAuthReady, type AuthUser } from "@/lib/auth";

function subscribe(onChange: () => void) {
  window.addEventListener(AUTH_EVENT, onChange);
  return () => window.removeEventListener(AUTH_EVENT, onChange);
}

// Durante a hidratação o React usa o valor do servidor (sem sessão, ainda carregando), então o
// HTML confere mesmo que a sessão já tenha sido lida antes de o trecho da página chegar.
const serverUser = (): AuthUser | null => null;
const serverReady = () => false;

export function useAuth() {
  const user = useSyncExternalStore(subscribe, getUser, serverUser);
  const hydrated = useSyncExternalStore(subscribe, isAuthReady, serverReady);

  useEffect(() => {
    void initAuth();
  }, []);

  return { user, hydrated };
}

/**
 * Gate for pages that belong to the social network: the whole app is only
 * reachable after login, so this redirects to /login as soon as we know
 * (post-hydration) that there is no signed-in user.
 */
export function useRequireAuth() {
  const { user, hydrated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (hydrated && !user) {
      navigate({ to: "/login" });
    }
  }, [hydrated, user, navigate]);

  return { user, hydrated };
}
