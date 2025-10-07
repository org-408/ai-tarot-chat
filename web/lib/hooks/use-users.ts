"use client";

import type { Client, ClientInput } from "@/../shared/lib/types";
import * as userApi from "@/lib/api/client-api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * ユーザー一覧を取得・操作するフック
 */
export function useClients() {
  const queryClient = useQueryClient();

  // ユーザー一覧を取得するクエリ
  const {
    data: users = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ["users"],
    queryFn: userApi.fetchClients,
  });

  // ユーザー作成のミューテーション
  const createMutation = useMutation({
    mutationFn: userApi.createClient,
    onSuccess: (newClient) => {
      // キャッシュを更新
      queryClient.setQueryData<Client[]>(["users"], (oldData = []) => [
        ...oldData,
        newClient,
      ]);
    },
  });

  // ユーザー更新のミューテーション
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ClientInput> }) =>
      userApi.updateClient(id, data),
    onSuccess: (updatedClient) => {
      // キャッシュを更新
      queryClient.setQueryData<Client[]>(["users"], (oldData = []) =>
        oldData.map((user) =>
          user.id === updatedClient.id ? updatedClient : user
        )
      );
      // 個別のユーザーのキャッシュも更新
      queryClient.setQueryData(["user", updatedClient.id], updatedClient);
    },
  });

  // ユーザー削除のミューテーション
  const deleteMutation = useMutation({
    mutationFn: userApi.deleteClient,
    onSuccess: (_, id) => {
      // キャッシュを更新
      queryClient.setQueryData<Client[]>(["users"], (oldData = []) =>
        oldData.filter((user) => user.id !== id)
      );
      // 削除されたユーザーのキャッシュを削除
      queryClient.removeQueries({ queryKey: ["user", id] });
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
    users,
    loading:
      loading ||
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending,
    error,
    fetchClients: () => refetch(),
    createClient: async (data: ClientInput) => {
      try {
        return await createMutation.mutateAsync(data);
      } catch (err) {
        console.error("error", "ユーザーの作成エラー:", { err });
        return null;
      }
    },
    updateClient: async (id: string, data: Partial<ClientInput>) => {
      try {
        return await updateMutation.mutateAsync({ id, data });
      } catch (err) {
        console.error("error", "ユーザーの更新エラー:", { err });
        return null;
      }
    },
    deleteClient: async (id: string) => {
      try {
        await deleteMutation.mutateAsync(id);
        return true;
      } catch (err) {
        console.error("error", "ユーザーの削除エラー:", { err });
        return false;
      }
    },
  };
}

/**
 * 特定のユーザーを取得するフック
 */
export function useClient(id: string) {
  return useQuery({
    queryKey: ["user", id],
    queryFn: () => userApi.fetchClientById(id),
    enabled: !!id, // idがある場合のみクエリを実行
  });
}

/**
 * メールアドレスでユーザーを取得するフック
 */
export function useClientByEmail(email: string | null) {
  return useQuery({
    queryKey: ["user", "email", email],
    queryFn: () => userApi.fetchClientByEmail(email!),
    enabled: !!email, // emailがある場合のみクエリを実行
  });
}

/**
 * デバイスIDでユーザーを取得するフック
 */
export function useClientByDeviceId(deviceId: string | null) {
  return useQuery({
    queryKey: ["user", "device", deviceId],
    queryFn: () => userApi.fetchClientByDeviceId(deviceId!),
    enabled: !!deviceId, // deviceIdがある場合のみクエリを実行
  });
}

/**
 * 現在のログインユーザーを取得するフック
 */
export function useCurrentClient() {
  return useQuery({
    queryKey: ["currentClient"],
    queryFn: userApi.fetchCurrentClient,
  });
}

/**
 * 匿名ユーザーを作成するフック
 */
export function useCreateAnonymousClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userApi.createAnonymousClient,
    onSuccess: (newClient) => {
      // キャッシュを更新
      queryClient.setQueryData<Client[]>(["users"], (oldData = []) => [
        ...oldData,
        newClient,
      ]);
      // 現在のユーザーをこの匿名ユーザーに設定
      queryClient.setQueryData(["currentClient"], newClient);
    },
  });
}

/**
 * ユーザーを登録ユーザーにアップグレードするフック
 */
export function useUpgradeToRegisteredClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, email }: { id: string; email: string }) =>
      userApi.upgradeToRegisteredClient(id, email),
    onSuccess: (updatedClient) => {
      // キャッシュを更新
      queryClient.setQueryData<Client[]>(["users"], (oldData = []) =>
        oldData.map((user) =>
          user.id === updatedClient.id ? updatedClient : user
        )
      );
      // 個別のユーザーのキャッシュも更新
      queryClient.setQueryData(["user", updatedClient.id], updatedClient);
      // 現在のユーザーも更新
      queryClient.setQueryData(["currentClient"], updatedClient);
    },
  });
}

/**
 * ユーザープランを更新するフック
 */
export function useUpdateClientPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      planType,
      subscriptionStatus,
      subscriptionEndDate,
    }: {
      id: string;
      planType: "FREE" | "STANDARD" | "PREMIUM";
      subscriptionStatus: "ACTIVE" | "INACTIVE" | "CANCELED" | "EXPIRED";
      subscriptionEndDate?: Date;
    }) =>
      userApi.updateClientPlan(
        id,
        planType,
        subscriptionStatus,
        subscriptionEndDate
      ),
    onSuccess: (updatedClient) => {
      // キャッシュを更新
      queryClient.setQueryData<Client[]>(["users"], (oldData = []) =>
        oldData.map((user) =>
          user.id === updatedClient.id ? updatedClient : user
        )
      );
      // 個別のユーザーのキャッシュも更新
      queryClient.setQueryData(["user", updatedClient.id], updatedClient);
      // 現在のユーザーも更新
      queryClient.setQueryData(["currentClient"], updatedClient);
    },
  });
}

/**
 * リーディングカウントを増加させるフック
 */
export function useIncrementReadingCount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userApi.incrementReadingCount,
    onSuccess: (result) => {
      // 現在のユーザーを取得
      const currentClient = queryClient.getQueryData<Client>(["currentClient"]);

      if (currentClient && currentClient.id === result.id) {
        // 現在のユーザーのカウンターを更新
        queryClient.setQueryData<Client>(["currentClient"], {
          ...currentClient,
          dailyReadingsCount: result.dailyReadingsCount,
          lastReadingDate: result.lastReadingDate,
        });
      }

      // 個別のユーザーのキャッシュも更新
      queryClient.invalidateQueries({ queryKey: ["user", result.id] });
    },
  });
}

/**
 * セルティックスプレッドカウントを増加させるフック
 */
// export function useIncrementCelticCount() {
//   const queryClient = useQueryClient();

//   return useMutation({
//     mutationFn: userApi.incrementCelticCount,
//     onSuccess: (result) => {
//       // 現在のユーザーを取得
//       const currentClient = queryClient.getQueryData<Client>(["currentClient"]);

//       if (currentClient && currentClient.id === result.id) {
//         // 現在のユーザーのカウンターを更新
//         queryClient.setQueryData<Client>(["currentClient"], {
//           ...currentClient,
//           dailyCelticsCount: result.dailyCelticsCount,
//           lastCelticReadingDate: result.lastCelticReadingDate,
//         });
//       }

//       // 個別のユーザーのキャッシュも更新
//       queryClient.invalidateQueries({ queryKey: ["user", result.id] });
//     },
//   });
// }

/**
 * パーソナルリーディングカウントを増加させるフック
 */
// export function useIncrementPersonalCount() {
//   const queryClient = useQueryClient();

//   return useMutation({
//     mutationFn: userApi.incrementPersonalCount,
//     onSuccess: (result) => {
//       // 現在のユーザーを取得
//       const currentClient = queryClient.getQueryData<Client>(["currentClient"]);

//       if (currentClient && currentClient.id === result.id) {
//         // 現在のユーザーのカウンターを更新
//         queryClient.setQueryData<Client>(["currentClient"], {
//           ...currentClient,
//           dailyPersonalCount: result.dailyPersonalCount,
//           lastPersonalReadingDate: result.lastPersonalReadingDate,
//         });
//       }

//       // 個別のユーザーのキャッシュも更新
//       queryClient.invalidateQueries({ queryKey: ["user", result.id] });
//     },
//   });
// }

/**
 * リーディング利用制限をチェックするフック
 */
// export function useCheckReadingLimit(userId: string | null) {
//   return useQuery({
//     queryKey: ["user", userId, "readingLimit"],
//     queryFn: () => userApi.checkReadingLimit(userId!),
//     enabled: !!userId, // userIdがある場合のみクエリを実行
//   });
// }

/**
 * セルティックスプレッド利用制限をチェックするフック
 */
// export function useCheckCelticLimit(userId: string | null) {
//   return useQuery({
//     queryKey: ["user", userId, "celticLimit"],
//     queryFn: () => userApi.checkCelticLimit(userId!),
//     enabled: !!userId, // userIdがある場合のみクエリを実行
//   });
// }

/**
 * パーソナルリーディング利用制限をチェックするフック
 */
// export function useCheckPersonalLimit(userId: string | null) {
//   return useQuery({
//     queryKey: ["user", userId, "personalLimit"],
//     queryFn: () => userApi.checkPersonalLimit(userId!),
//     enabled: !!userId, // userIdがある場合のみクエリを実行
//   });
// }
