import { syncService } from "@/lib/services/sync";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => syncService.sync(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["readings"] });
    },
  });
}

export function useLastSyncAt() {
  return useQuery({
    queryKey: ["sync", "lastSyncAt"],
    queryFn: () => syncService.getLastSyncAt(),
  });
}
