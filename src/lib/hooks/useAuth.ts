import { authService } from "@/lib/services/auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useDeviceId() {
  return useQuery({
    queryKey: ["deviceId"],
    queryFn: () => authService.getDeviceId(),
    staleTime: Infinity, // デバイスIDは変わらない
  });
}

export function useAuth() {
  return useQuery({
    queryKey: ["auth", "status"],
    queryFn: () => authService.isAuthenticated(),
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      accessToken,
      refreshToken,
      userId,
    }: {
      accessToken: string;
      refreshToken: string;
      userId: string;
    }) => {
      await authService.setTokens(accessToken, refreshToken);
      await authService.setUserId(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth"] });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth"] });
      queryClient.removeQueries({ queryKey: ["readings"] });
    },
  });
}
