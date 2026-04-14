import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import React, {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import type {
  DrawnCard,
  ReadingCategory,
  ReadingErrorCode,
  SaveReadingInput,
  Spread,
  Tarotist,
} from "../lib/types";

// ─────────────────────────────────────────────────────────────
// エラー型
// ─────────────────────────────────────────────────────────────

export interface ChatError {
  message: string;
  retryable?: boolean;
  isInputError?: boolean;
  code?: string;
}

// ─────────────────────────────────────────────────────────────
// 入力型
// ─────────────────────────────────────────────────────────────

export interface UseChatSessionConfig {
  /** API エンドポイント (絶対 URL) */
  api: string;
  /** JWT トークン */
  token: string | null | undefined;
  isPersonal: boolean;
  /** Phase2 かどうか (initialMessages.length > 0 && isPersonal) */
  isPhase2: boolean;
  /** Phase2 初期メッセージ (Phase1 → Phase2 引き継ぎ) */
  initialMessages?: UIMessage[];
  tarotist: Tarotist;
  spread: Spread;
  category?: ReadingCategory | null;
  drawnCards: DrawnCard[];
  isRevealingCompleted: boolean;
  customQuestion?: string;
}

export interface UseChatSessionCallbacks {
  /**
   * リーディング保存。モバイルなら useClient().saveReading、
   * Web なら fetch ベースの実装を渡す。
   */
  onSave: (input: SaveReadingInput) => Promise<{ reading: { id: string } }>;
  /** 利用回数を最新状態に更新 */
  onRefreshUsage?: () => Promise<void>;
  /**
   * JWT 401 時にトークンをリフレッシュして新しいトークンを返す。
   * 失敗した場合は null を返すか例外を投げる。
   */
  onRefreshToken?: () => Promise<string | null>;
  /**
   * AI 課金終了 (戻るボタン表示可能) タイミングで呼ばれる。
   * ナビゲーションロック解除などに使う。
   */
  onUnlock?: () => void;
  /** messages が変わるたびに呼ばれる (Phase1 → Phase2 引き継ぎ用) */
  onMessagesChange?: (messages: UIMessage[]) => void;
}

// ─────────────────────────────────────────────────────────────
// 戻り値型
// ─────────────────────────────────────────────────────────────

export interface UseChatSessionReturn {
  messages: UIMessage[];
  status: "idle" | "submitted" | "streaming" | "error";
  phase2Stage: "chatting" | "saving" | "done";
  /** Phase2 残り質問数 */
  questionsRemaining: number;
  inputValue: string;
  isFocused: boolean;
  inputDisabled: boolean;
  isMessageComplete: boolean;
  isSaving: boolean;
  shouldShowBackButton: boolean;
  error: ChatError | null;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handleSend: () => void;
  /** Phase2「占いを終わる」ボタンから呼ぶ */
  handleSessionClose: () => void;
  handleFocus: () => void;
  handleBlur: () => void;
  handleRetry: () => void;
  /**
   * アプリがバックグラウンドに移行したときに呼ぶ。
   * プラットフォーム固有のイベントリスナー (CapacitorApp / visibilitychange)
   * から呼び出すこと。
   */
  handleBackground: () => void;
}

// ─────────────────────────────────────────────────────────────
// 定数
// ─────────────────────────────────────────────────────────────

const MAX_PHASE2_QUESTIONS = 3;

const INPUT_ERROR_CODES: ReadingErrorCode[] = [
  "QUESTION_TOO_SHORT",
  "QUESTION_TOO_LONG",
  "MODERATION_BLOCKED",
];

// ─────────────────────────────────────────────────────────────
// エラーパーサー
// ─────────────────────────────────────────────────────────────

interface RawReadingError {
  code?: string;
  message?: string;
  retryable?: boolean;
}

function isRawReadingError(v: unknown): v is RawReadingError {
  return typeof v === "object" && v !== null && "code" in v;
}

async function parseResponseError(response: Response): Promise<ChatError> {
  try {
    const body: unknown = await response.json();
    if (isRawReadingError(body)) {
      return {
        message:
          body.message ?? "エラーが発生しました。もう一度お試しください。",
        code: body.code,
        retryable: body.retryable ?? false,
        isInputError: INPUT_ERROR_CODES.includes(
          body.code as ReadingErrorCode,
        ),
      };
    }
  } catch {
    // JSON パース失敗はフォールスルー
  }
  return {
    message: "エラーが発生しました。もう一度お試しください。",
    retryable: true,
  };
}

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

export function useChatSession(
  config: UseChatSessionConfig,
  callbacks: UseChatSessionCallbacks,
): UseChatSessionReturn {
  const {
    api,
    token,
    isPersonal,
    isPhase2,
    initialMessages,
    tarotist,
    spread,
    category,
    drawnCards,
    isRevealingCompleted,
    customQuestion,
  } = config;

  const { onSave, onRefreshUsage, onRefreshToken, onUnlock, onMessagesChange } =
    callbacks;

  const initialLen = initialMessages?.length ?? 0;

  // ─── 状態 ───────────────────────────────────────────────────
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [inputDisabled, setInputDisabled] = useState(false);
  const [chatError, setChatError] = useState<ChatError | null>(null);
  const [isMessageComplete, setIsMessageComplete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  type Phase2Stage = "chatting" | "saving" | "done";
  const [phase2Stage, setPhase2Stage] = useState<Phase2Stage>("chatting");
  const [isClosingComplete, setIsClosingComplete] = useState(false);

  // ─── Refs ────────────────────────────────────────────────────
  const hasSentInitialMessage = useRef(false);
  const isEndingEarlyRef = useRef(false);
  const handleSessionCloseRef = useRef<() => void>(() => {});
  const isClosingCompleteRef = useRef(false);
  const saveStartedRef = useRef(false);
  const pendingSaveRef = useRef(false);
  const lastPersistedSignatureRef = useRef<string | null>(null);
  const savedReadingIdRef = useRef<string | null>(null);
  const hasUnlockedRef = useRef(false);
  const onUnlockRef = useRef(onUnlock);
  const currentTokenRef = useRef(token);

  // token / onUnlock の最新値を ref に同期
  useEffect(() => {
    currentTokenRef.current = token;
  }, [token]);
  useEffect(() => {
    onUnlockRef.current = onUnlock;
  }, [onUnlock]);

  // ─── transportFetch (JWT 401 リトライ) ──────────────────────
  const transportFetch: typeof fetch = async (input, init) => {
    let response: Response;
    try {
      response = await fetch(input, init);
    } catch {
      const err = new Error(
        "通信に失敗しました。電波の良い場所で再度お試しください。",
      ) as Error & { code?: string; retryable?: boolean };
      err.code = "NETWORK_OR_STREAM_FAILURE";
      err.retryable = true;
      throw err;
    }

    if (response.status === 401 && onRefreshToken) {
      try {
        const newToken = await onRefreshToken();
        if (newToken) {
          currentTokenRef.current = newToken;
          const retryInit = {
            ...init,
            headers: {
              ...(init?.headers as Record<string, string>),
              Authorization: `Bearer ${newToken}`,
            },
          };
          response = await fetch(input, retryInit);
        }
      } catch {
        // リフレッシュ失敗はそのまま落とす
      }
    }

    if (!response.ok) {
      const chatErr = await parseResponseError(response);
      const err = new Error(chatErr.message) as Error & {
        code?: string;
        retryable?: boolean;
      };
      err.code = chatErr.code;
      err.retryable = chatErr.retryable;
      throw err;
    }

    return response;
  };

  // ─── useChat ────────────────────────────────────────────────
  const {
    messages,
    sendMessage,
    status,
    stop,
    clearError,
    setMessages,
  } = useChat({
    ...(initialMessages && { messages: initialMessages }),
    transport: new DefaultChatTransport({
      api,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${currentTokenRef.current ?? ""}`,
      },
      body: {
        tarotist,
        spread,
        category,
        drawnCards,
      },
      fetch: transportFetch,
    }),
    onError: (err) => {
      const rawCode = (err as { code?: string }).code;
      const rawRetryable = (err as { retryable?: boolean }).retryable;
      const isInputErr = INPUT_ERROR_CODES.includes(
        rawCode as ReadingErrorCode,
      );

      const resolvedError: ChatError = {
        message:
          err.message ||
          "通信に失敗しました。電波の良い場所で再度お試しください。",
        code: rawCode,
        retryable: rawRetryable ?? true,
        isInputError: isInputErr,
      };

      // 入力エラー: 送信したユーザーメッセージを input に戻す
      if (!isPhase2 && isInputErr) {
        const lastMessage = messages[messages.length - 1];
        const failedInput =
          lastMessage?.role === "user"
            ? lastMessage.parts
                .filter((p) => p.type === "text")
                .map((p) => (p as { text: string }).text)
                .join("")
            : "";
        if (failedInput) {
          setInputValue(failedInput);
          setMessages((cur) => cur.slice(0, -1));
        }
      }

      if (rawCode === "LIMIT_REACHED" && onRefreshUsage) {
        void onRefreshUsage();
      }

      setChatError(resolvedError);
    },
    onFinish: async () => {
      // Phase1 での空 AI レスポンス対策
      if (isPersonal && !isPhase2) {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg?.role === "assistant") {
          const text = lastMsg.parts
            .filter((p) => p.type === "text")
            .map((p) => (p as { text: string }).text)
            .join("");
          if (!text.trim()) {
            setMessages((prev) => prev.slice(0, -1));
            setChatError({
              message:
                "占い師からの応答を受信できませんでした。もう一度お試しください。",
              code: "NETWORK_OR_STREAM_FAILURE",
              retryable: true,
            });
            return;
          }
        }
      }

      setChatError(null);

      if (isEndingEarlyRef.current) {
        isEndingEarlyRef.current = false;
        isClosingCompleteRef.current = true;
        setIsClosingComplete(true);
        setPhase2Stage("saving");
      } else if (isPhase2) {
        const phase2UserCount = messages.filter(
          (m, i) => m.role === "user" && i > initialLen,
        ).length;
        if (phase2UserCount >= MAX_PHASE2_QUESTIONS) {
          handleSessionCloseRef.current();
        }
      }

      if (!isPersonal && onRefreshUsage) {
        try {
          await onRefreshUsage();
        } catch {
          // 次回起動時に補正されるため無視
        }
      }
    },
  });

  // ─── handleSessionClose ─────────────────────────────────────
  const handleSessionClose = useCallback(() => {
    isEndingEarlyRef.current = true;
    sendMessage(
      { text: "ありがとうございました。今日の占いはここで終わりにします。" },
      { body: { isEndingEarly: true } },
    );
  }, [sendMessage]);

  useEffect(() => {
    handleSessionCloseRef.current = handleSessionClose;
  }, [handleSessionClose]);

  // ─── 計算値 ──────────────────────────────────────────────────
  const isInputFixableError =
    chatError !== null &&
    INPUT_ERROR_CODES.includes(chatError.code as ReadingErrorCode);
  const hasBlockingError = chatError !== null && !isInputFixableError;

  const shouldShowBackButton =
    !!chatError ||
    (isPhase2
      ? phase2Stage === "done"
      : isMessageComplete && !isSaving);

  const phase2UserCount = messages.filter(
    (m, i) => m.role === "user" && i > initialLen,
  ).length;
  const questionsRemaining = Math.max(
    0,
    MAX_PHASE2_QUESTIONS - phase2UserCount,
  );

  // ─── messages 変化監視 (inputDisabled, スプレッド選択) ───────
  useEffect(() => {
    if (messages.length === 0) return;
    if (!isPhase2) {
      setInputDisabled(messages.length > 3);
    } else {
      const count = messages.filter(
        (m, i) => m.role === "user" && i > initialLen,
      ).length;
      setInputDisabled(count >= MAX_PHASE2_QUESTIONS);
    }
  }, [isPhase2, initialLen, messages, status]);

  // status 変化でエラークリア
  useEffect(() => {
    if (status === "submitted" || status === "streaming") {
      setChatError(null);
    }
  }, [status]);

  // messages 変化を親に通知
  useEffect(() => {
    onMessagesChange?.(messages);
  }, [messages, onMessagesChange]);

  // 初回メッセージ送信
  useEffect(() => {
    if (hasSentInitialMessage.current) return;
    if (!isPhase2 && (isRevealingCompleted || isPersonal)) {
      hasSentInitialMessage.current = true;
      sendMessage({ text: "よろしくお願いします。" });
    } else if (isPhase2 && drawnCards.length > 0) {
      hasSentInitialMessage.current = true;
      sendMessage({ text: `${spread?.name}で占ってください。` });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPersonal, isRevealingCompleted, isPhase2, drawnCards.length]);

  // isMessageComplete フラグ
  useEffect(() => {
    if (isMessageComplete) return;
    const isComplete =
      chatError !== null ||
      ((isPhase2
        ? messages.some((m, i) => m.role === "assistant" && i >= initialLen)
        : (isRevealingCompleted || isPersonal) &&
          drawnCards.length > 0 &&
          messages.length > 0) &&
        (status === "ready" || status === "error"));

    if (isComplete) {
      setIsMessageComplete(true);
    }
  }, [
    chatError,
    drawnCards.length,
    initialLen,
    isPersonal,
    isPhase2,
    isRevealingCompleted,
    isMessageComplete,
    messages,
    status,
  ]);

  // ─── ナビゲーションロック解除 ────────────────────────────────
  useEffect(() => {
    if (shouldShowBackButton && (!isPhase2 || hasBlockingError) && !hasUnlockedRef.current) {
      hasUnlockedRef.current = true;
      onUnlockRef.current?.();
    }
  }, [shouldShowBackButton, isPhase2, hasBlockingError]);

  // ─── 保存ロジック ────────────────────────────────────────────

  const shouldPersistReading = useCallback((): boolean => {
    if (status !== "ready") return false;
    if (isPhase2) {
      if (drawnCards.length === 0 || messages.length <= initialLen) return false;
      return messages[messages.length - 1]?.role === "assistant";
    }
    return (
      (isRevealingCompleted || isPersonal) &&
      drawnCards.length > 0 &&
      messages.length > 0
    );
  }, [
    drawnCards.length,
    initialLen,
    isPersonal,
    isPhase2,
    isRevealingCompleted,
    messages,
    status,
  ]);

  const buildPersistSignature = useCallback(
    (readingIdOverride = savedReadingIdRef.current): string => {
      const msgHash = messages
        .map((msg) => {
          const text = msg.parts
            .filter((p) => p.type === "text")
            .map((p) => (p as { text: string }).text)
            .join("");
          return `${msg.role}:${text}`;
        })
        .join("\u0001");
      return `${readingIdOverride ?? "new"}::${inputDisabled ? "1" : "0"}::${msgHash}`;
    },
    [inputDisabled, messages],
  );

  const buildReadingPayload = useCallback((): SaveReadingInput => {
    const firstPhase2TarotistIdx = isPhase2
      ? messages.findIndex((m, i) => m.role === "assistant" && i >= initialLen)
      : -1;

    return {
      readingId: savedReadingIdRef.current ?? undefined,
      incrementUsage: isPersonal ? savedReadingIdRef.current === null : false,
      tarotistId: tarotist.id,
      tarotist,
      spreadId: spread.id,
      spread,
      categoryId: isPersonal ? undefined : (category?.id ?? null),
      category: isPersonal ? undefined : (category ?? undefined),
      customQuestion: isPersonal ? customQuestion : undefined,
      cards: drawnCards,
      chatMessages: messages.map((msg, i) => {
        let chatType: "USER_QUESTION" | "FINAL_READING" | "TAROTIST_ANSWER";
        if (msg.role === "user") {
          chatType = "USER_QUESTION";
        } else if (isPhase2 && i === firstPhase2TarotistIdx) {
          chatType = "FINAL_READING";
        } else if (isPhase2) {
          chatType = "TAROTIST_ANSWER";
        } else {
          chatType = "FINAL_READING";
        }
        return {
          tarotistId: tarotist.id,
          tarotist,
          chatType,
          role: msg.role === "user" ? ("USER" as const) : ("TAROTIST" as const),
          message: msg.parts
            .filter((p) => p.type === "text")
            .map((p) => (p as { text: string }).text)
            .join(""),
        };
      }),
    };
  }, [
    category,
    customQuestion,
    drawnCards,
    initialLen,
    isPersonal,
    isPhase2,
    messages,
    spread,
    tarotist,
  ]);

  const persistReading = useEffectEvent((withSavingIndicator: boolean) => {
    if (saveStartedRef.current) {
      if (shouldPersistReading()) {
        pendingSaveRef.current = true;
      }
      return;
    }

    if (!shouldPersistReading()) {
      if (isPhase2 && isClosingCompleteRef.current && !hasUnlockedRef.current) {
        hasUnlockedRef.current = true;
        setPhase2Stage("done");
        onUnlockRef.current?.();
      }
      return;
    }

    const nextSignature = buildPersistSignature();
    if (lastPersistedSignatureRef.current === nextSignature) {
      if (isPhase2 && isClosingCompleteRef.current && !hasUnlockedRef.current) {
        hasUnlockedRef.current = true;
        setPhase2Stage("done");
        onUnlockRef.current?.();
      }
      return;
    }

    saveStartedRef.current = true;
    pendingSaveRef.current = false;

    if (withSavingIndicator) {
      setIsSaving(true);
    }

    void onSave(buildReadingPayload())
      .then((result) => {
        savedReadingIdRef.current = result.reading.id;
        const [, ...rest] = nextSignature.split("::");
        lastPersistedSignatureRef.current = [result.reading.id, ...rest].join(
          "::",
        );
      })
      .catch(() => {
        // 保存失敗: 呼び出し元でエラー表示が必要な場合は callbacks に追加する
      })
      .finally(() => {
        saveStartedRef.current = false;
        if (withSavingIndicator) {
          setIsSaving(false);
        }
        if (pendingSaveRef.current) {
          pendingSaveRef.current = false;
          persistReading(false);
          if (!saveStartedRef.current) {
            if (
              isPhase2 &&
              isClosingCompleteRef.current &&
              !hasUnlockedRef.current
            ) {
              hasUnlockedRef.current = true;
              setPhase2Stage("done");
              onUnlockRef.current?.();
            }
          }
        } else if (
          isPhase2 &&
          isClosingCompleteRef.current &&
          !hasUnlockedRef.current
        ) {
          hasUnlockedRef.current = true;
          setPhase2Stage("done");
          onUnlockRef.current?.();
        }
      });
  });

  // メインの保存 effect
  useEffect(() => {
    persistReading(true);
  }, [
    category,
    customQuestion,
    drawnCards,
    initialLen,
    inputDisabled,
    isPersonal,
    isPhase2,
    isRevealingCompleted,
    messages,
    persistReading,
    phase2Stage,
    spread,
    status,
    tarotist,
  ]);

  // クロージング完了後の保存トリガー
  useEffect(() => {
    if (!isClosingComplete || !isPhase2) return;
    persistReading(true);
  }, [isClosingComplete, isPhase2, persistReading]);

  // アンマウント時の保存
  useEffect(() => {
    return () => {
      persistReading(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── 入力ハンドラー ──────────────────────────────────────────

  const handleSend = useCallback(() => {
    if (chatError) {
      clearError();
      setChatError(null);
    }
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    sendMessage({ text: trimmed });
    setInputValue("");
  }, [chatError, clearError, inputValue, sendMessage]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInputValue(e.target.value);
      e.target.style.height = "auto";
      e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
    },
    [],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    setInputValue((v) => v.trim());
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  const handleRetry = useCallback(() => {
    clearError();
    setChatError(null);
  }, [clearError]);

  const handleBackground = useEffectEvent(() => {
    persistReading(false);
  });

  // ─── 戻り値 ──────────────────────────────────────────────────

  return {
    messages,
    status: status as "idle" | "submitted" | "streaming" | "error",
    phase2Stage,
    questionsRemaining,
    inputValue,
    isFocused,
    inputDisabled,
    isMessageComplete,
    isSaving,
    shouldShowBackButton,
    error: chatError,
    handleInputChange,
    handleKeyDown,
    handleSend,
    handleSessionClose,
    handleFocus,
    handleBlur,
    handleRetry,
    handleBackground,
  };
}
