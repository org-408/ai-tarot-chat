import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type {
  DrawnCard,
  ReadingCategory,
  ReadingErrorCode,
  Spread,
  Tarotist,
} from "../lib/types";

// ─────────────────────────────────────────────────────────────
// 単一セッション版リーディング hook
//
// 既存 `use-chat-session.ts`（モバイル向け）との違い:
// - `isPhase2` / `initialMessages` を廃止。Phase1→Phase2 を単一セッションで連続運用する
// - サーバー側は `clientMessages.length` でフェーズを自動判定するため、
//   このクライアントも正しい順序・回数で `sendMessage` するだけで良い
// - auto-send トリガーは 2 つ:
//     (1) マウント時（パーソナルのみ）: "よろしくお願いします。"
//     (2) スプレッド確定 + カード配布 + めくり完了 + messages.length === 4:
//         "{spread.name}で占ってください。"
// - transport body に `initialLen: 4`（固定）を含めることで、
//   サーバー側の Q&A 保存タグ付け (`firstPhase2AiIdx`) が正しく動作する
// ─────────────────────────────────────────────────────────────

export interface ChatError {
  message: string;
  retryable?: boolean;
  isInputError?: boolean;
  code?: string;
}

export interface SpreadSuggestion {
  spreadNo?: number;
  spreadName?: string;
}

export interface UseReadingChatConfig {
  /** API エンドポイント (/api/readings/simple または /api/readings/personal) */
  api: string;
  /** JWT トークン */
  token: string | null | undefined;
  /** パーソナル占いか */
  isPersonal: boolean;
  tarotist: Tarotist;
  /** スプレッド。パーソナル占い Phase1 中は未確定のため null を許容 */
  spread: Spread | null;
  category?: ReadingCategory | null;
  drawnCards: DrawnCard[];
  /** カードめくり完了フラグ。true で Phase2 初回鑑定を auto-send するトリガー */
  isRevealingCompleted: boolean;
}

export interface UseReadingChatCallbacks {
  onRefreshUsage?: () => Promise<void>;
  onRefreshToken?: () => Promise<string | null>;
  /** Phase2 応答完了・クロージング完了・エラー時に呼ばれる */
  onUnlock?: () => void;
  /** Phase1 のスプレッド推薦（messages.length >= 4 で AI2 をパース）を通知 */
  onSpreadSuggested?: (suggestion: SpreadSuggestion) => void;
}

export type ReadingStage =
  /** length 0-1: 挨拶送信前 or ストリーミング中 */
  | "greeting"
  /** length 2-3: ユーザーの占いたい内容を受付 */
  | "intake"
  /** length 4: AI スプレッド推薦完了、ユーザーにスプレッド選択 UI を表示 */
  | "spread-suggest"
  /** length 4 & spread 確定済 & めくり未完: 裏面スプレッド表示中 */
  | "awaiting-draw"
  /** length 5-6: Phase2 初回鑑定（ストリーミング or 完了） */
  | "reading"
  /** length 7-11: Q&A ターン */
  | "qa"
  /** クロージング応答ストリーミング中 */
  | "closing"
  /** クロージング完了、「もう一度占う」表示可能 */
  | "done";

export interface UseReadingChatReturn {
  messages: UIMessage[];
  status: "idle" | "submitted" | "streaming" | "error";
  stage: ReadingStage;
  /** Phase2 残り質問数（最大 3） */
  questionsRemaining: number;
  /** Phase1 でパースしたスプレッド推薦 */
  phase1SpreadSuggestion: SpreadSuggestion | null;
  inputValue: string;
  inputDisabled: boolean;
  isMessageComplete: boolean;
  shouldShowBackButton: boolean;
  error: ChatError | null;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handleSend: () => void;
  /** Phase2「占いを終わる」ボタン（length > 6 のときのみ有効） */
  handleSessionClose: () => void;
  handleRetry: () => void;
}

const MAX_PHASE2_QUESTIONS = 3;
const PHASE1_MESSAGE_COUNT = 4; // u1, A1, u2, A2

const INPUT_ERROR_CODES: ReadingErrorCode[] = [
  "QUESTION_TOO_SHORT",
  "QUESTION_TOO_LONG",
  "MODERATION_BLOCKED",
];

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

function deriveStage(
  isPersonal: boolean,
  messagesLen: number,
  isEndingEarly: boolean,
  hasClosingDone: boolean,
  hasSpread: boolean,
  isRevealingCompleted: boolean,
): ReadingStage {
  if (!isPersonal) {
    // クイック占い: 1 ターンで完結
    if (messagesLen === 0) {
      return isRevealingCompleted ? "reading" : "awaiting-draw";
    }
    if (messagesLen <= 1) return "reading";
    return "done";
  }

  // パーソナル占い
  if (hasClosingDone) return "done";
  if (isEndingEarly) return "closing";
  if (messagesLen <= 1) return "greeting";
  if (messagesLen <= 3) return "intake";
  if (messagesLen === 4) {
    // AI スプレッド推薦完了後
    if (hasSpread && !isRevealingCompleted) return "awaiting-draw";
    if (hasSpread && isRevealingCompleted) return "reading"; // auto-send 直前
    return "spread-suggest";
  }
  if (messagesLen <= 6) return "reading";
  return "qa";
}

export function useReadingChat(
  config: UseReadingChatConfig,
  callbacks: UseReadingChatCallbacks = {},
): UseReadingChatReturn {
  const {
    api,
    token,
    isPersonal,
    tarotist,
    spread,
    category,
    drawnCards,
    isRevealingCompleted,
  } = config;

  const {
    onRefreshUsage,
    onRefreshToken,
    onUnlock,
    onSpreadSuggested,
  } = callbacks;

  // ─── 状態 ───────────────────────────────────────────────────
  const [inputValue, setInputValue] = useState("");
  const [inputDisabled, setInputDisabled] = useState(false);
  const [chatError, setChatError] = useState<ChatError | null>(null);
  const [isMessageComplete, setIsMessageComplete] = useState(false);
  const [phase1SpreadSuggestion, setPhase1SpreadSuggestion] =
    useState<SpreadSuggestion | null>(null);
  const [hasClosingDone, setHasClosingDone] = useState(false);

  // ─── Refs ────────────────────────────────────────────────────
  const hasSentGreetingRef = useRef(false);
  const hasSentReadingStartRef = useRef(false);
  const hasDispatchedSpreadSuggestionRef = useRef(false);
  const isEndingEarlyRef = useRef(false);
  const handleSessionCloseRef = useRef<() => void>(() => {});
  const hasUnlockedRef = useRef(false);
  const onUnlockRef = useRef(onUnlock);
  const currentTokenRef = useRef(token);

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
    transport: new DefaultChatTransport({
      api,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${currentTokenRef.current ?? ""}`,
      },
      body: {
        tarotist,
        spread: spread ?? ({} as Spread),
        category,
        drawnCards,
        // サーバー側 Q&A 保存の firstPhase2AiIdx 算出用。Phase1 は固定 4 メッセージで終わる
        ...(isPersonal && { initialLen: PHASE1_MESSAGE_COUNT }),
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

      // 入力エラー: 送信したユーザーメッセージを input に戻す（Phase1 intake / Phase2 Q&A 両方）
      if (isInputErr) {
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
      // Phase1 で空 AI レスポンスを受け取ったときのリカバリ
      if (isPersonal && messages.length <= 4) {
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
        // クロージング応答完了: サーバー側で保存済みなので直接 done へ
        isEndingEarlyRef.current = false;
        if (!hasUnlockedRef.current) {
          hasUnlockedRef.current = true;
          setHasClosingDone(true);
          onUnlockRef.current?.();
        }
      } else if (isPersonal) {
        // 3 問使い切ったら自動クロージング
        const phase2UserCount = messages.filter(
          (m, i) => m.role === "user" && i >= PHASE1_MESSAGE_COUNT,
        ).length;
        if (phase2UserCount >= MAX_PHASE2_QUESTIONS) {
          handleSessionCloseRef.current();
        }
      }

      // 利用回数の UI 更新: クイック占いと パーソナル Phase2 (length > 4) はサーバーで消費済み
      const shouldRefresh =
        !isPersonal || (isPersonal && messages.length > PHASE1_MESSAGE_COUNT);
      if (shouldRefresh && onRefreshUsage) {
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
    // Phase2 に入った後のみ有効（length > 6）
    if (messages.length <= 6) return;
    if (isEndingEarlyRef.current) return;
    isEndingEarlyRef.current = true;
    sendMessage(
      { text: "ありがとうございました。今日の占いはここで終わりにします。" },
      { body: { isEndingEarly: true } },
    );
  }, [messages.length, sendMessage]);

  useEffect(() => {
    handleSessionCloseRef.current = handleSessionClose;
  }, [handleSessionClose]);

  // ─── stage 導出 ──────────────────────────────────────────────
  const stage = deriveStage(
    isPersonal,
    messages.length,
    isEndingEarlyRef.current,
    hasClosingDone,
    spread != null,
    isRevealingCompleted,
  );

  // ─── 計算値 ──────────────────────────────────────────────────
  const isInputFixableError =
    chatError !== null &&
    INPUT_ERROR_CODES.includes(chatError.code as ReadingErrorCode);
  const hasBlockingError = chatError !== null && !isInputFixableError;

  const shouldShowBackButton =
    !!chatError ||
    (isPersonal
      ? stage === "done"
      : isMessageComplete);

  const phase2UserCount = messages.filter(
    (m, i) => m.role === "user" && i >= PHASE1_MESSAGE_COUNT,
  ).length;
  const questionsRemaining = Math.max(
    0,
    MAX_PHASE2_QUESTIONS - phase2UserCount,
  );

  // ─── inputDisabled 計算 ───────────────────────────────────────
  useEffect(() => {
    if (!isPersonal) {
      // クイック占い: 入力欄は常に無効（ユーザー入力なし）
      setInputDisabled(true);
      return;
    }
    // パーソナル: 挨拶受信前 / スプレッド提案受信後〜Phase2 鑑定完了まで / 3 問使い切り後は無効
    if (messages.length === 0 || status === "submitted" || status === "streaming") {
      setInputDisabled(true);
      return;
    }
    if (messages.length === 1) {
      // 挨拶受信済 → 占いたい内容を入力可能
      setInputDisabled(false);
      return;
    }
    if (messages.length >= 4 && messages.length <= 6) {
      // スプレッド選択～初回鑑定完了まで無効
      setInputDisabled(true);
      return;
    }
    if (phase2UserCount >= MAX_PHASE2_QUESTIONS) {
      setInputDisabled(true);
      return;
    }
    setInputDisabled(false);
  }, [isPersonal, messages.length, status, phase2UserCount]);

  // ─── Phase1 スプレッド推薦パース ─────────────────────────────
  useEffect(() => {
    if (!isPersonal) return;
    if (status !== "ready") return;
    if (hasDispatchedSpreadSuggestionRef.current) return;
    if (messages.length < 4) return;

    const fourthMsg = messages[3];
    if (!fourthMsg || fourthMsg.role !== "assistant") return;
    const text = fourthMsg.parts
      .filter((p) => p.type === "text")
      .map((p) => (p as { text: string }).text)
      .join("");
    if (!text.trim()) return;

    const headerIdx = text.indexOf("【特におすすめのスプレッド】");
    const target = headerIdx >= 0 ? text.slice(headerIdx) : text;
    const match = target.match(/\{(\d+)\}:\s*\{([^}]+)\}/);
    const suggestion: SpreadSuggestion = {
      spreadNo: match ? parseInt(match[1], 10) : undefined,
      spreadName: match ? match[2] : undefined,
    };

    hasDispatchedSpreadSuggestionRef.current = true;
    setPhase1SpreadSuggestion(suggestion);
    onSpreadSuggested?.(suggestion);
  }, [isPersonal, status, messages, onSpreadSuggested]);

  // ─── status 変化でエラークリア ─────────────────────────────
  useEffect(() => {
    if (status === "submitted" || status === "streaming") {
      setChatError(null);
    }
  }, [status]);

  // ─── auto-send 1: 初回挨拶（パーソナル占いのみ、マウント時） ───
  useEffect(() => {
    if (hasSentGreetingRef.current) return;
    if (!isPersonal) return;
    hasSentGreetingRef.current = true;
    sendMessage({ text: "よろしくお願いします。" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPersonal]);

  // ─── auto-send 2: Phase2 初回鑑定開始 ─────────────────────────
  // クイック占い: isRevealingCompleted=true で 1 ターン送信
  // パーソナル: length === 4 && spread && drawnCards && isRevealingCompleted で送信
  useEffect(() => {
    if (hasSentReadingStartRef.current) return;
    if (!spread) return;
    if (drawnCards.length === 0) return;
    if (!isRevealingCompleted) return;

    if (!isPersonal) {
      if (messages.length !== 0) return;
    } else {
      if (messages.length !== PHASE1_MESSAGE_COUNT) return;
    }

    hasSentReadingStartRef.current = true;
    sendMessage({ text: `${spread.name}で占ってください。` });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isPersonal,
    spread,
    drawnCards.length,
    isRevealingCompleted,
    messages.length,
  ]);

  // ─── isMessageComplete フラグ ──────────────────────────────
  useEffect(() => {
    if (isMessageComplete) return;
    if (chatError !== null) {
      setIsMessageComplete(true);
      return;
    }
    const ready = status === "ready" || status === "error";
    if (!ready) return;

    if (!isPersonal) {
      // クイック: AI 応答が届けば完了
      const hasAssistant = messages.some((m) => m.role === "assistant");
      if (hasAssistant && isRevealingCompleted) setIsMessageComplete(true);
      return;
    }

    // パーソナル: クロージング完了または 3 問使い切り後の最終 AI 応答完了
    if (hasClosingDone) {
      setIsMessageComplete(true);
    }
  }, [
    chatError,
    isPersonal,
    isRevealingCompleted,
    isMessageComplete,
    messages,
    status,
    hasClosingDone,
  ]);

  // ─── ナビゲーションロック解除 ────────────────────────────────
  useEffect(() => {
    if (
      shouldShowBackButton &&
      (!isPersonal || hasBlockingError) &&
      !hasUnlockedRef.current
    ) {
      hasUnlockedRef.current = true;
      onUnlockRef.current?.();
    }
  }, [shouldShowBackButton, isPersonal, hasBlockingError]);

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

  const handleRetry = useCallback(() => {
    clearError();
    setChatError(null);
  }, [clearError]);

  void stop;

  return {
    messages,
    status: status as "idle" | "submitted" | "streaming" | "error",
    stage,
    questionsRemaining,
    phase1SpreadSuggestion,
    inputValue,
    inputDisabled,
    isMessageComplete,
    shouldShowBackButton,
    error: chatError,
    handleInputChange,
    handleKeyDown,
    handleSend,
    handleSessionClose,
    handleRetry,
  };
}
