// Modo criança: com um perfil infantil ativo, o site fica só na Trilha (/desafios). Qualquer outra
// página volta para lá; sair do perfil infantil pede o PIN do responsável (ProfileSwitcher).
import { useEffect, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { ADULT_PROFILE_ID, PROFILES_EVENT, getActiveProfileId } from "@/lib/trail-profiles";

const ALLOWED = ["/desafios", "/login", "/recuperar-senha"];

export function useKidMode() {
  const { user } = useAuth();
  const [kid, setKid] = useState(false);
  useEffect(() => {
    if (!user) return setKid(false);
    const sync = () => setKid(getActiveProfileId(user.id) !== ADULT_PROFILE_ID);
    sync();
    window.addEventListener(PROFILES_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(PROFILES_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [user]);
  return kid;
}

export function KidModeGate() {
  const kid = useKidMode();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  useEffect(() => {
    if (kid && !ALLOWED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      void navigate({ to: "/desafios", replace: true });
    }
  }, [kid, pathname, navigate]);
  return null;
}
