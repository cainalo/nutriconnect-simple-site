const user = { id: "u1", name: "Maria Silva", email: "maria@exemplo.com", avatarUrl: undefined, isAdmin: true, role: "member" } as any;
export const useAuth = () => ({ user, hydrated: true });
export const useRequireAuth = () => ({ user, hydrated: true });
