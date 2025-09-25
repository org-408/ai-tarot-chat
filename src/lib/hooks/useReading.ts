import { readingService, type Reading } from "@/lib/services/reading";
import { syncService } from "@/lib/services/sync";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useReadings(limit = 20) {
  return useQuery({
    queryKey: ["readings", { limit }],
    queryFn: () => readingService.getReadings(limit),
  });
}

export function useReading(id: string) {
  return useQuery({
    queryKey: ["readings", id],
    queryFn: () => readingService.getReadingById(id),
    enabled: !!id,
  });
}

export function useSaveReading() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      spreadId,
      cards,
      result,
    }: {
      spreadId: string;
      cards: string[];
      result: Reading["result"];
    }) => readingService.saveReading(spreadId, cards, result),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["readings"] });
      // バックグラウンドで同期
      syncService.sync().catch(console.error);
    },
  });
}

export function useTodayCount() {
  return useQuery({
    queryKey: ["readings", "todayCount"],
    queryFn: () => readingService.getTodayCount(),
  });
}
