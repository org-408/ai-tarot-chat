"use client";

import * as userApi from "@/lib/api/user-api";
import type { User, UserInput } from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * ユーザー一覧を取得・操作するフック
 */
export function useUsers() {
  const queryClient = useQueryClient();

  // ユーザー一覧を取得するクエリ
  const {
    data: users = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ["users"],
    queryFn: userApi.fetchUsers,
  });

  // ユーザー作成のミューテーション
  const createMutation = useMutation({
    mutationFn: userApi.createUser,
    onSuccess: (newUser) => {
      // キャッシュを更新
      queryClient.setQueryData<User[]>(["users"], (oldData = []) => [
        ...oldData,
        newUser,
      ]);
    },
  });

  // ユーザー更新のミューテーション
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<UserInput> }) =>
      userApi.updateUser(id, data),
    onSuccess: (updatedUser) => {
      // キャッシュを更新
      queryClient.setQueryData<User[]>(["users"], (oldData = []) =>
        oldData.map((user) => (user.id === updatedUser.id ? updatedUser : user))
      );
      // 個別のユーザーのキャッシュも更新
      queryClient.setQueryData(["user", updatedUser.id], updatedUser);
    },
  });

  // ユーザー削除のミューテーション
  const deleteMutation = useMutation({
    mutationFn: userApi.deleteUser,
    onSuccess: (_, id) => {
      // キャッシュを更新
      queryClient.setQueryData<User[]>(["users"], (oldData = []) =>
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
    fetchUsers: () => refetch(),
    createUser: async (data: UserInput) => {
      try {
        return await createMutation.mutateAsync(data);
      } catch (err) {
        console.error("ユーザーの作成エラー:", err);
        return null;
      }
    },
    updateUser: async (id: string, data: Partial<UserInput>) => {
      try {
        return await updateMutation.mutateAsync({ id, data });
      } catch (err) {
        console.error("ユーザーの更新エラー:", err);
        return null;
      }
    },
    deleteUser: async (id: string) => {
      try {
        await deleteMutation.mutateAsync(id);
        return true;
      } catch (err) {
        console.error("ユーザーの削除エラー:", err);
        return false;
      }
    },
  };
}

/**
 * 特定のユーザーを取得するフック
 */
export function useUser(id: string) {
  return useQuery({
    queryKey: ["user", id],
    queryFn: () => userApi.fetchUserById(id),
    enabled: !!id, // idがある場合のみクエリを実行
  });
}

/**
 * メールアドレスでユーザーを取得するフック
 */
export function useUserByEmail(email: string | null) {
  return useQuery({
    queryKey: ["user", "email", email],
    queryFn: () => userApi.fetchUserByEmail(email!),
    enabled: !!email, // emailがある場合のみクエリを実行
  });
}

/**
 * デバイスIDでユーザーを取得するフック
 */
export function useUserByDeviceId(deviceId: string | null) {
  return useQuery({
    queryKey: ["user", "device", deviceId],
    queryFn: () => userApi.fetchUserByDeviceId(deviceId!),
    enabled: !!deviceId, // deviceIdがある場合のみクエリを実行
  });
}

/**
 * 現在のログインユーザーを取得するフック
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: ["currentUser"],
    queryFn: userApi.fetchCurrentUser,
  });
}

/**
 * 匿名ユーザーを作成するフック
 */
export function useCreateAnonymousUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userApi.createAnonymousUser,
    onSuccess: (newUser) => {
      // キャッシュを更新
      queryClient.setQueryData<User[]>(["users"], (oldData = []) => [
        ...oldData,
        newUser,
      ]);
      // 現在のユーザーをこの匿名ユーザーに設定
      queryClient.setQueryData(["currentUser"], newUser);
    },
  });
}

/**
 * ユーザーを登録ユーザーにアップグレードするフック
 */
export function useUpgradeToRegisteredUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, email }: { id: string; email: string }) =>
      userApi.upgradeToRegisteredUser(id, email),
    onSuccess: (updatedUser) => {
      // キャッシュを更新
      queryClient.setQueryData<User[]>(["users"], (oldData = []) =>
        oldData.map((user) => (user.id === updatedUser.id ? updatedUser : user))
      );
      // 個別のユーザーのキャッシュも更新
      queryClient.setQueryData(["user", updatedUser.id], updatedUser);
      // 現在のユーザーも更新
      queryClient.setQueryData(["currentUser"], updatedUser);
    },
  });
}

/**
 * ユーザープランを更新するフック
 */
export function useUpdateUserPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      planType,
      subscriptionStatus,
      subscriptionEndDate,
    }: {
      id: string;
      planType: "FREE_REGISTERED" | "STANDARD" | "PREMIUM";
      subscriptionStatus: "ACTIVE" | "INACTIVE" | "CANCELED" | "EXPIRED";
      subscriptionEndDate?: Date;
    }) =>
      userApi.updateUserPlan(
        id,
        planType,
        subscriptionStatus,
        subscriptionEndDate
      ),
    onSuccess: (updatedUser) => {
      // キャッシュを更新
      queryClient.setQueryData<User[]>(["users"], (oldData = []) =>
        oldData.map((user) => (user.id === updatedUser.id ? updatedUser : user))
      );
      // 個別のユーザーのキャッシュも更新
      queryClient.setQueryData(["user", updatedUser.id], updatedUser);
      // 現在のユーザーも更新
      queryClient.setQueryData(["currentUser"], updatedUser);
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
      const currentUser = queryClient.getQueryData<User>(["currentUser"]);

      if (currentUser && currentUser.id === result.id) {
        // 現在のユーザーのカウンターを更新
        queryClient.setQueryData<User>(["currentUser"], {
          ...currentUser,
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
 * AIチャットカウントを増加させるフック
 */
export function useIncrementAiChatCount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userApi.incrementAiChatCount,
    onSuccess: (result) => {
      // 現在のユーザーを取得
      const currentUser = queryClient.getQueryData<User>(["currentUser"]);

      if (currentUser && currentUser.id === result.id) {
        // 現在のユーザーのカウンターを更新
        queryClient.setQueryData<User>(["currentUser"], {
          ...currentUser,
          dailyAiChatCount: result.dailyAiChatCount,
          lastAiChatDate: result.lastAiChatDate,
        });
      }

      // 個別のユーザーのキャッシュも更新
      queryClient.invalidateQueries({ queryKey: ["user", result.id] });
    },
  });
}

/**
 * リーディング利用制限をチェックするフック
 */
export function useCheckReadingLimit(userId: string | null) {
  return useQuery({
    queryKey: ["user", userId, "readingLimit"],
    queryFn: () => userApi.checkReadingLimit(userId!),
    enabled: !!userId, // userIdがある場合のみクエリを実行
  });
}

/**
 * AIチャット利用制限をチェックするフック
 */
export function useCheckAiChatLimit(userId: string | null) {
  return useQuery({
    queryKey: ["user", userId, "aiChatLimit"],
    queryFn: () => userApi.checkAiChatLimit(userId!),
    enabled: !!userId, // userIdがある場合のみクエリを実行
  });
}
