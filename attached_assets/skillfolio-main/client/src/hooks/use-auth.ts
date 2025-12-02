import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { getAuthToken, setAuthToken, removeAuthToken, getAuthHeaders } from "@/lib/auth";
import type { User, LoginUser, InsertUser } from "@shared/schema";

export function useAuth() {
  const queryClient = useQueryClient();
  
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const token = getAuthToken();
      if (!token) return null;
      
      const response = await fetch("/api/auth/me", {
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          removeAuthToken();
          return null;
        }
        throw new Error("Failed to fetch user");
      }
      
      return response.json();
    },
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginUser) => {
      const response = await apiRequest("POST", "/api/auth/login", credentials);
      return response.json();
    },
    onSuccess: (data) => {
      setAuthToken(data.token);
      queryClient.setQueryData(["/api/auth/me"], data.user);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: InsertUser) => {
      const response = await apiRequest("POST", "/api/auth/register", userData);
      return response.json();
    },
    onSuccess: (data) => {
      setAuthToken(data.token);
      queryClient.setQueryData(["/api/auth/me"], data.user);
    },
  });

  const logout = () => {
    removeAuthToken();
    queryClient.setQueryData(["/api/auth/me"], null);
    queryClient.clear();
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout,
    loginError: loginMutation.error,
    registerError: registerMutation.error,
    isLoginPending: loginMutation.isPending,
    isRegisterPending: registerMutation.isPending,
  };
}
