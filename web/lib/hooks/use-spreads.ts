"use client";

import * as spreadApi from "@/lib/api/spread-api";
import type { Spread, SpreadCell, SpreadInput } from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * スプレッド一覧を取得・操作するフック
 */
export function useSpreads() {
  const queryClient = useQueryClient();

  // スプレッド一覧を取得するクエリ
  const {
    data: spreads = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ["spreads"],
    queryFn: spreadApi.fetchSpreads,
  });

  // スプレッド作成のミューテーション
  const createMutation = useMutation({
    mutationFn: spreadApi.createSpread,
    onSuccess: (newSpread) => {
      // キャッシュを更新
      queryClient.setQueryData<Spread[]>(["spreads"], (oldData = []) => [
        ...oldData,
        newSpread,
      ]);
    },
  });

  // スプレッド更新のミューテーション
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: SpreadInput }) =>
      spreadApi.updateSpread(id, data),
    onSuccess: (updatedSpread) => {
      // キャッシュを更新
      queryClient.setQueryData<Spread[]>(["spreads"], (oldData = []) =>
        oldData.map((spread) =>
          spread.id === updatedSpread.id ? updatedSpread : spread
        )
      );
      // 個別のスプレッドのキャッシュも更新
      queryClient.setQueryData(["spread", updatedSpread.id], updatedSpread);
    },
  });

  // スプレッド削除のミューテーション
  const deleteMutation = useMutation({
    mutationFn: spreadApi.deleteSpread,
    onSuccess: (_, id) => {
      // キャッシュを更新
      queryClient.setQueryData<Spread[]>(["spreads"], (oldData = []) =>
        oldData.filter((spread) => spread.id !== id)
      );
      // 削除されたスプレッドのキャッシュを削除
      queryClient.removeQueries({ queryKey: ["spread", id] });
    },
  });

  // エラーメッセージの処理
  const error =
    queryError instanceof Error
      ? queryError.message
      : createMutation.error instanceof Error
      ? createMutation.error.message
      : updateMutation.error instanceof Error
      ? updateMutation.error.message
      : deleteMutation.error instanceof Error
      ? deleteMutation.error.message
      : null;

  // API呼び出しの結果をラップして返す
  return {
    spreads,
    loading:
      loading ||
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending,
    error,
    fetchSpreads: () => refetch(),
    createSpread: async (data: SpreadInput) => {
      try {
        return await createMutation.mutateAsync(data);
      } catch (err) {
        console.error("スプレッドの作成エラー:", err);
        return null;
      }
    },
    updateSpread: async (id: string, data: SpreadInput) => {
      try {
        return await updateMutation.mutateAsync({ id, data });
      } catch (err) {
        console.error("スプレッドの更新エラー:", err);
        return null;
      }
    },
    deleteSpread: async (id: string) => {
      try {
        await deleteMutation.mutateAsync(id);
        return true;
      } catch (err) {
        console.error("スプレッドの削除エラー:", err);
        return false;
      }
    },
  };
}

/**
 * 特定のスプレッドを取得するフック
 */
export function useSpread(id: string) {
  return useQuery({
    queryKey: ["spread", id],
    queryFn: () => spreadApi.fetchSpreadById(id),
    enabled: !!id, // idがある場合のみクエリを実行
  });
}

/**
 * カテゴリ別スプレッド一覧を取得するフック
 */
export function useSpreadsByCategory(categoryId: string) {
  return useQuery({
    queryKey: ["spreads", "category", categoryId],
    queryFn: () => spreadApi.fetchSpreadsByCategory(categoryId),
    enabled: !!categoryId, // categoryIdがある場合のみクエリを実行
  });
}

/**
 * 特定スプレッドのセル一覧を取得するフック
 */
export function useSpreadCells(spreadId: string) {
  return useQuery({
    queryKey: ["spread", spreadId, "cells"],
    queryFn: () => spreadApi.fetchSpreadCells(spreadId),
    enabled: !!spreadId, // spreadIdがある場合のみクエリを実行
  });
}

/**
 * 特定セルを取得するフック
 */
export function useSpreadCell(id: string | null) {
  return useQuery({
    queryKey: ["spreadCell", id],
    queryFn: () => spreadApi.fetchSpreadCellById(id!),
    enabled: !!id, // idがある場合のみクエリを実行
  });
}

/**
 * セル操作を行うフック
 */
export function useSpreadCellOperations(spreadId: string) {
  const queryClient = useQueryClient();

  // セル作成のミューテーション
  const createMutation = useMutation({
    mutationFn: (data: Omit<SpreadCell, "id" | "spread">) =>
      spreadApi.createSpreadCell(spreadId, data),
    onSuccess: (newCell) => {
      // キャッシュを更新
      queryClient.setQueryData<SpreadCell[]>(
        ["spread", spreadId, "cells"],
        (oldData = []) => [...oldData, newCell]
      );
    },
  });

  // セル更新のミューテーション
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Omit<SpreadCell, "id" | "spread">;
    }) => spreadApi.updateSpreadCell(id, data),
    onSuccess: (updatedCell) => {
      // キャッシュを更新
      queryClient.setQueryData<SpreadCell[]>(
        ["spread", spreadId, "cells"],
        (oldData = []) =>
          oldData.map((cell) =>
            cell.id === updatedCell.id ? updatedCell : cell
          )
      );
      // 個別のセルのキャッシュも更新
      queryClient.setQueryData(["spreadCell", updatedCell.id], updatedCell);
    },
  });

  // セル削除のミューテーション
  const deleteMutation = useMutation({
    mutationFn: spreadApi.deleteSpreadCell,
    onSuccess: (_, id) => {
      // キャッシュを更新
      queryClient.setQueryData<SpreadCell[]>(
        ["spread", spreadId, "cells"],
        (oldData = []) => oldData.filter((cell) => cell.id !== id)
      );
      // 削除されたセルのキャッシュを削除
      queryClient.removeQueries({ queryKey: ["spreadCell", id] });
    },
  });

  // 複数セル一括更新のミューテーション
  const bulkUpdateMutation = useMutation({
    mutationFn: spreadApi.bulkUpdateSpreadCells,
    onSuccess: () => {
      // キャッシュを更新
      queryClient.invalidateQueries({
        queryKey: ["spread", spreadId, "cells"],
      });
    },
  });

  return {
    createCell: (data: Omit<SpreadCell, "id" | "spread">) =>
      createMutation.mutateAsync(data),
    updateCell: (id: string, data: Omit<SpreadCell, "id" | "spread">) =>
      updateMutation.mutateAsync({ id, data }),
    deleteCell: (id: string) => deleteMutation.mutateAsync(id),
    bulkUpdateCells: (cells: SpreadCell[]) =>
      bulkUpdateMutation.mutateAsync(cells),
    isLoading:
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending ||
      bulkUpdateMutation.isPending,
    error:
      createMutation.error ||
      updateMutation.error ||
      deleteMutation.error ||
      bulkUpdateMutation.error,
  };
}
