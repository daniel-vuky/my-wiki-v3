import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import type { User } from "../types";

interface Ctx { user: User | null; loading: boolean }
const AuthCtx = createContext<Ctx>({ user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, isLoading } = useQuery({ queryKey: ["me"], queryFn: api.me, retry: false });
  return <AuthCtx.Provider value={{ user: data?.user ?? null, loading: isLoading }}>{children}</AuthCtx.Provider>;
}
export const useAuth = () => useContext(AuthCtx);
