// apps/web/lib/store/auth.store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AuthUser = {
  id:      string;
  name:    string;
  email:   string;
  role:    string;
  phone:   string | null;
  orgId:   string;
  orgName: string;
  orgPlan: string;
};

type AuthState = {
  user:           AuthUser | null;
  accessToken:    string | null;
  refreshToken:   string | null;
  isLoading:      boolean;
  _hasHydrated:   boolean;
  setAuth:        (user: AuthUser, accessToken: string, refreshToken: string) => void;
  clearAuth:      () => void;
  setLoading:     (v: boolean) => void;
  setHasHydrated: (v: boolean) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user:           null,
      accessToken:    null,
      refreshToken:   null,
      isLoading:      false,
      _hasHydrated:   false,
      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken }),
      clearAuth: () =>
        set({ user: null, accessToken: null, refreshToken: null }),
      setLoading: (v) => set({ isLoading: v }),
      setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: "bos-auth",
      // Called once localStorage has been read and state rehydrated
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (s) => ({
        user:         s.user,
        accessToken:  s.accessToken,
        refreshToken: s.refreshToken,
      }),
    }
  )
);
