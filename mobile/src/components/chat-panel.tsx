import { useChat } from "@ai-sdk/react";
import { Keyboard } from "@capacitor/keyboard";
import type { PluginListenerHandle } from "@capacitor/core";
import type { UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import { motion } from "framer-motion";
import { ArrowUp } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import type {
  ReadingErrorCode,
} from "../../../shared/lib/types";
import { useAuth } from "../lib/hooks/use-auth";
import { useAuthStore } from "../lib/stores/auth";
import { useClient } from "../lib/hooks/use-client";
import { useMaster } from "../lib/hooks/use-master";
import { useReading } from "../lib/hooks/use-reading";
import {
  createReadingChatErrorFromResponse,
  isReadingChatError,
  ReadingChatError,
} from "../lib/utils/reading-chat-error";
import CategorySpreadSelector from "./category-spread-selector";
import { MessageContent } from "./message-content";
import { RevealPromptPanel } from "./reveal-prompt-panel";

/**
 * NOTE: useChat の API 定義を安定させるため、 key= を利用して、確実にアンマウント、マウントさせること
 */

interface ChatPanelProps {
  onKeyboardHeightChange?: React.Dispatch<React.SetStateAction<number>>;
  handleStartReading?: () => void;
  onBack: () => void;
  /** AI 課金が終了した（戻るボタンが表示できる状態になった）タイミングで呼ぶ */
  onUnlock?: () => void;
  /** Phase1 の会話履歴を Phase2 の初期メッセージとして渡す */
  initialMessages?: UIMessage[];
  /** messages が変わるたびに呼ばれるコールバック（Phase1 → Phase2 への引き継ぎ用） */
  onMessagesChange?: (messages: UIMessage[]) => void;
  /** 残り利用回数。0 以下の場合はボタンを無効化して「本日の占いは終了しました」を表示 */
  remainingCount?: number;
  /** AI の初回メッセージが完了し入力欄が表示された初回タイミングで 1 回だけ呼ばれる */
  onInputReady?: () => void;
  /** パーソナル Phase1 でスプレッド選択セクション全体が画面内に完全に収まった初回タイミングで 1 回だけ呼ばれる */
  onSelectorFullyVisible?: () => void;
  /** Phase1 入力欄 (textarea) の DOM 要素が変化したタイミングで呼ばれる。コーチマークのターゲット取得用 */
  onInputElChange?: (el: HTMLElement | null) => void;
  /** パーソナル Phase1 のスプレッド選択セクション (CategorySpreadSelector) のルート要素を通知する */
  onSelectorElChange?: (el: HTMLElement | null) => void;
  /** クイック占いの「一気にめくる」ボタン要素を通知する（コーチマーク用） */
  onRevealButtonElChange?: (el: HTMLElement | null) => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  onKeyboardHeightChange,
  handleStartReading,
  onBack,
  onUnlock,
  initialMessages,
  onMessagesChange,
  remainingCount,
  onInputReady,
  onSelectorFullyVisible,
  onInputElChange,
  onSelectorElChange,
  onRevealButtonElChange,
}) => {
  const { t } = useTranslation();
  const domain = import.meta.env.VITE_BFF_URL;

  const { token } = useAuth();

  const { refreshUsage, invalidateReadings } = useClient();
  const [isSyncingUsage, setIsSyncingUsage] = useState(false);

  const {
    selectedTarotist,
    selectedPersonalTarotist,
    quickCategory,
    personalCategory,
    quickSpread,
    personalSpread,
    drawnCards,
    isRevealingCompleted,
    isPersonal,
    setCustomQuestion,
    setPersonalSpread,
  } = useReading();

  // パーソナル占いは専用占い師、クイック占いは選択占い師を使用
  const tarotist = isPersonal ? selectedPersonalTarotist : selectedTarotist;
  const category = isPersonal ? personalCategory : quickCategory;
  const spread = isPersonal ? personalSpread : quickSpread;

  const { masterData } = useMaster();

  // Phase2: パーソナル占いの Phase1 会話履歴が渡されている場合
  const isPhase2 = isPersonal && (initialMessages?.length ?? 0) > 0;
  const initialLen = initialMessages?.length ?? 0;
  const MAX_PHASE2_QUESTIONS = 3;
  const inputErrorCodes: ReadingErrorCode[] = [
    "QUESTION_TOO_SHORT",
    "QUESTION_TOO_LONG",
    "MODERATION_BLOCKED",
  ];

  const [inputDisabled, setInputDisabled] = useState(false);
  const [chatError, setChatError] = useState<ReadingChatError | null>(null);

  const transportFetch: typeof fetch = async (input, init) => {
    let response: Response;
    try {
      response = await fetch(input, init);
    } catch {
      throw new ReadingChatError({
        message: i18n.t("error.networkFailure"),
        status: 0,
        code: "NETWORK_OR_STREAM_FAILURE",
        retryable: true,
      });
    }

    if (response.status === 401) {
      try {
        await useAuthStore.getState().refresh();
        const newToken = useAuthStore.getState().token;
        const retryInit = {
          ...init,
          headers: {
            ...(init?.headers as Record<string, string>),
            Authorization: `Bearer ${newToken}`,
          },
        };
        response = await fetch(input, retryInit);
      } catch {
        // refresh も失敗した場合はそのまま UNAUTHORIZED として落とす
      }
    }

    if (!response.ok) {
      throw await createReadingChatErrorFromResponse(response);
    }

    return response;
  };

  const {
    messages,
    sendMessage,
    status,
    stop,
    regenerate,
    clearError,
    setMessages,
  } = useChat({
    ...(initialMessages && { messages: initialMessages }),
    transport: new DefaultChatTransport({
      api: !isPersonal
        ? `${domain}/api/readings/quick`
        : `${domain}/api/readings/personal`,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: {
        tarotist,
        spread,
        category,
        drawnCards,
        // Phase 2.1: サーバー側で英語 prompt に切り替えるために現在の言語を送信
        language: i18n.language?.startsWith("en") ? "en" : "ja",
        ...(isPhase2 && { initialLen }),
      },
      fetch: transportFetch,
    }),
    onError: (err) => {
      const resolvedError = isReadingChatError(err)
        ? err
        : new ReadingChatError({
            message: err.message || i18n.t("error.networkFailure"),
            status: 0,
            code: "NETWORK_OR_STREAM_FAILURE",
            retryable: true,
          });

      if (
        !isPhase2 &&
        inputErrorCodes.includes(resolvedError.code as ReadingErrorCode)
      ) {
        const lastMessage = messages[messages.length - 1];
        const failedInput =
          lastMessage?.role === "user"
            ? lastMessage.parts
                .filter((part) => part.type === "text")
                .map((part) => (part as { text: string }).text)
                .join("")
            : "";

        if (failedInput) {
          setInputValue(failedInput);
          setCustomQuestion(failedInput);
          setMessages((currentMessages) => currentMessages.slice(0, -1));
        }
      }

      if (resolvedError.code === "LIMIT_REACHED") {
        void refreshUsage();
      }

      setChatError(resolvedError);
    },
    onFinish: async () => {
      // Phase1 で空のAIレスポンスが返ってきた場合、エラーとして処理する
      // （プロバイダが例外を投げずに空レスポンスを返すケースの対策）
      // status→"ready" は onFinish より先に発火するため、messages はこの時点で更新済み
      if (isPersonal && !isPhase2) {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg?.role === "assistant") {
          const lastMsgText = lastMsg.parts
            .filter((p) => p.type === "text")
            .map((p) => (p as { text: string }).text)
            .join("");
          if (!lastMsgText.trim()) {
            console.warn("Empty AI response detected in Phase1, removing message and showing error");
            setMessages((prev) => prev.slice(0, -1));
            setChatError(
              new ReadingChatError({
                message: i18n.t("error.emptyResponse"),
                status: 0,
                code: "NETWORK_OR_STREAM_FAILURE",
                retryable: true,
              }),
            );
            return;
          }
        }
      }

      setChatError(null);

      if (isEndingEarlyRef.current) {
        isEndingEarlyRef.current = false;
        hasUnlockedRef.current = true;
        setPhase2Stage("done");
        onUnlockRef.current?.();
      } else if (isPhase2) {
        // 3問すべて使い切った後の最終回答が完了 → 自動でクロージングメッセージを送信
        // inputDisabled は React state のため hydration 等で誤 true になり得る。
        // messages を直接カウントして確実に 3 問消費済みか判定する。
        const phase2UserCount = messages.filter(
          (m, i) => m.role === "user" && i > initialLen,
        ).length;
        if (phase2UserCount >= MAX_PHASE2_QUESTIONS) {
          handleSessionCloseRef.current();
        }
      }

      if (!isPersonal || isPhase2) {
        // サーバーが Reading を保存したので履歴キャッシュを無効化する。
        // 次に履歴画面を開いた際にサーバーから取り直し、古いキャッシュが
        // 一瞬見えてから差し替わる中途半端な表示を防ぐ。
        // Phase1（スプレッド選択）では保存されないため除外している。
        invalidateReadings();

        setIsSyncingUsage(true);
        try {
          await refreshUsage();
        } catch {
          // refreshUsage 失敗は次回起動時に補正されるため通知不要
        } finally {
          setIsSyncingUsage(false);
        }
      }
    },
  });

  const hasSentInitialMessage = useRef(false);
  const isEndingEarlyRef = useRef(false);

  // handleSessionClose の ref（onFinish の非同期クロージャから最新の関数を参照するため）
  const handleSessionCloseRef = useRef<() => void>(() => {});

  /**
   * セッションクローズ処理（手動「占いを終わる」とオートクローズの共通処理）。
   * isEndingEarlyRef を立ててからクロージングメッセージを送信する。
   * onFinish 内では handleSessionCloseRef.current() 経由で呼び出す。
   */
  const handleSessionClose = useCallback(() => {
    isEndingEarlyRef.current = true;
    sendMessage(
      { text: i18n.t("chat.closingMessage") },
      { body: { isEndingEarly: true } },
    );
  }, [sendMessage]);

  // ref を常に最新の関数に同期する
  useEffect(() => {
    handleSessionCloseRef.current = handleSessionClose;
  }, [handleSessionClose]);

  const [inputValue, setInputValue] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [, setIsFocused] = useState(false);
  const [, setIsKeyboardReady] = useState(false);
  const wasPersonalRef = useRef(isPersonal);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasScrolledForPhase2 = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isMessageComplete, setIsMessageComplete] = useState(false);
  const [showSelector, setShowSelector] = useState(false);
  // Phase2 セッション進行状態:
  //   "chatting" → Q1/Q2/Q3 応答中
  //   "done"     → クロージング AI 完了、ナビゲーション解除済み
  type Phase2Stage = "chatting" | "done";
  const [phase2Stage, setPhase2Stage] = useState<Phase2Stage>("chatting");

  const isInputFixableError =
    chatError !== null &&
    inputErrorCodes.includes(chatError.code as ReadingErrorCode);
  const hasBlockingError = chatError !== null && !isInputFixableError;
  const canRetry = !!chatError?.retryable && !isInputFixableError;
  // shouldShowBackButton:
  //   Phase2  → phase2Stage === "done"（クロージング完了後のみ）
  //   非Phase2 → AI 応答完了 & 同期完了
  //   エラー   → 常に表示（脱出手段を確保）
  const shouldShowBackButton =
    !!chatError ||
    (isPhase2
      ? phase2Stage === "done"
      : isMessageComplete && !isSyncingUsage);
  const isProcessing =
    status === "submitted" ||
    status === "streaming" ||
    isSyncingUsage;

  // デバッグ用: messagesの変更を監視
  useEffect(() => {
    // console.log("Messages updated:", messages.length, "Status:", status);
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      console.log("Last message:", lastMessage);
      if (!isPhase2) {
        // Phase1: スプレッド選択後（messages[3] でスプレッド確定）は入力停止
        setInputDisabled(messages.length > 3);
      } else {
        // Phase2: autoメッセージ以降のユーザー発言数で判定
        const phase2UserCount = messages.filter(
          (m, i) => m.role === "user" && i > initialLen,
        ).length;
        setInputDisabled(phase2UserCount >= MAX_PHASE2_QUESTIONS);
      }
      // パーソナル占い Phase1 のスプレッド選択（Phase2 では不要）
      if (isPersonal && !isPhase2 && status === "ready") {
        if (messages.length === 4) {
          console.log("step 2 reached in spread select mode");
          // スプレッドを messsages から取得してセット
          const str = messages[3].parts
            .filter((part) => part.type === "text")
            .map((part) => (part as { text: string }).text)
            .join("");
          console.log("Extracted string:", str);
          // AIレスポンスが空の場合（プロバイダが空レスポンスを返したケース）は
          // スプレッド選択フェーズに進まない。onFinish でエラー処理される。
          if (!str.trim()) {
            console.warn("Empty AI response in Phase1-2, not advancing to spread selection");
            return;
          }
          // Phase1-2 で AI が提示する「特におすすめのスプレッド」セクションを検出。
          // JA (「【特におすすめのスプレッド】」) と EN ("## Top recommendation")
          // の両ヘッダーを受け入れ、ヘッダー以降だけをパース対象にする。
          const headerIdx = [
            "【特におすすめのスプレッド】",
            "## Top recommendation",
            "Top recommendation",
          ]
            .map((h) => str.indexOf(h))
            .filter((i) => i >= 0)
            .sort((a, b) => a - b)[0];
          const targetStr =
            typeof headerIdx === "number" ? str.slice(headerIdx) : str;
          const match = targetStr.match(/\{(\d+)\}:\s*\{([^}]+)\}/);
          const spreadNo = match ? parseInt(match[1], 10) : undefined;
          const spreadName = match ? match[2] : "";
          console.log("Extracted spread no, name:", spreadNo, spreadName);
          // 言語非依存の no を優先し、name は JA / EN (i18n.en.name) どちらとも照合する
          const spread = masterData.spreads.find(
            (s) =>
              s.no === spreadNo ||
              s.name === spreadName ||
              s.i18n?.en?.name === spreadName,
          );
          console.log("Found spread:", spread);
          if (spread) {
            setPersonalSpread(spread);
          }
          // もし spread が取得できなくても、そのまま進める
          setShowSelector(true);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPersonal, masterData.spreads, messages, setPersonalSpread, status]);

  useEffect(() => {
    // Phase2 のストリーミング中に personal モードから外れたときだけ停止する。
    // クイック占いは常に isPersonal=false のため、単純条件だと初回リクエストまで止めてしまう。
    const wasPersonal = wasPersonalRef.current;
    if (
      wasPersonal &&
      !isPersonal &&
      (status === "streaming" || status === "submitted")
    ) {
      stop();
    }
    wasPersonalRef.current = isPersonal;
  }, [isPersonal, status, stop]);

  // Phase2 開始時に一番下まで一度だけスクロール
  // Phase2 への移行は「ここから本番」という節目なので、読書位置に関わらず常にスクロール。
  useEffect(() => {
    if (!isPhase2 || hasScrolledForPhase2.current) return;
    if (messages.length > initialLen) {
      hasScrolledForPhase2.current = true;
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isPhase2, messages.length, initialLen]);

  // キーボード高さの検出 - マウント時に即座にセットアップ
  useEffect(() => {
    let showListener: PluginListenerHandle | undefined;
    let hideListener: PluginListenerHandle | undefined;

    // Capacitor Keyboard API(ネイティブ環境)
    const setupCapacitorListeners = async () => {
      try {
        showListener = await Keyboard.addListener(
          "keyboardWillShow",
          (info) => {
            setKeyboardHeight(info.keyboardHeight);
            setIsKeyboardReady(true);
          },
        );

        hideListener = await Keyboard.addListener("keyboardWillHide", () => {
          setKeyboardHeight(0);
        });

        // リスナー登録完了
        setIsKeyboardReady(true);
      } catch (error) {
        // Capacitor が利用できない環境(Web)ではフォールバックを使用
        console.log(
          "Capacitor Keyboard not available, using web fallback",
          error,
        );
        setIsKeyboardReady(true); // Web環境でも準備完了とする
      }
    };

    // 即座にセットアップ開始
    setupCapacitorListeners();

    // Web環境のフォールバック(visualViewport)
    const handleResize = () => {
      if (window.visualViewport) {
        const offset = window.innerHeight - window.visualViewport.height;
        setKeyboardHeight(offset > 0 ? offset : 0);
        if (offset > 0) {
          setIsKeyboardReady(true);
        }
      }
    };

    // visualViewportも即座に登録
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleResize);
      // 初回チェック
      const initialOffset = window.innerHeight - window.visualViewport.height;
      if (initialOffset > 0) {
        setKeyboardHeight(initialOffset);
        setIsKeyboardReady(true);
      }
    }

    return () => {
      showListener?.remove();
      hideListener?.remove();
      window.visualViewport?.removeEventListener("resize", handleResize);
    };
  }, []);

  const handleSendMessage = () => {
    if (chatError) {
      clearError();
      setChatError(null);
    }
    if (messages.length < 3) {
      console.log("step 2 not reached yet, setting custom question");
      setCustomQuestion(inputValue.trim());
    }
    console.log("Sending message:", inputValue);
    if (inputValue.trim()) {
      sendMessage({ text: inputValue.trim() });
      setInputValue("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const handleFocus = () => {
    setIsFocused(true);
    setInputValue(inputValue.trim());
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  useEffect(() => {
    onKeyboardHeightChange?.(keyboardHeight);
  }, [keyboardHeight, onKeyboardHeightChange]);

  // Phase1 メッセージを親に通知（Phase2 の初期メッセージとして使う）
  useEffect(() => {
    onMessagesChange?.(messages);
  }, [messages, onMessagesChange]);

  // 初回メッセージ送信（Phase1: あいさつ / Phase2: 占い開始）
  useEffect(() => {
    if (hasSentInitialMessage.current) return;
    if (!isPhase2 && (isRevealingCompleted || isPersonal)) {
      hasSentInitialMessage.current = true;
      sendMessage({ text: i18n.t("chat.initialGreeting") });
    } else if (isPhase2 && drawnCards.length > 0) {
      hasSentInitialMessage.current = true;
      sendMessage({
        text: i18n.t("chat.startReadingWithSpread", { spread: spread?.name }),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPersonal, isRevealingCompleted, isPhase2, drawnCards.length]);

  useEffect(() => {
    if (status === "submitted" || status === "streaming") {
      setChatError(null);
    }
  }, [status]);

  useEffect(() => {
    if (isMessageComplete) return; // 既にフラグ立て済みなら何もしない

    // ─────────────────────────────────────────────────────────────
    // isMessageComplete を立てる条件:
    //   Phase2  → initialLen 以降に assistant メッセージが届いた（ready）または通信エラー
    //   非Phase2 → 鑑定完了（ready）または通信エラー
    // エラー時でもフラグを立てることで、戻るボタンが必ず表示される
    //
    // Phase2 で "messages.length > initialLen" を使うと、sendMessage() の内部実装で
    // messages store と status store が別々の useSyncExternalStore で管理されているため、
    // user メッセージ追加直後（status がまだ "ready"）に誤って isMessageComplete が立つ
    // tearing が発生する。assistant メッセージの有無で判定することでこれを防ぐ。
    // ─────────────────────────────────────────────────────────────
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

  // Phase1 入力欄の表示条件（JSX 側と共有する単一の真実源）。
  // textarea の render 条件と onInputReady の発火条件の基底をここで統一する。
  const isPhase1InputVisible =
    isPersonal && !isPhase2 && !inputDisabled && !isProcessing;

  // AI が初回挨拶を済ませた状態か。チュートリアル都合のフラグではなく、
  // 「AI が話す前にユーザーへ『入力してください』と案内しない」というドメイン要件。
  // 初期状態では messages に role:"assistant" が無いことを利用している。
  const hasAiGreeted = messages.some((m) => m.role === "assistant");

  // onInputReady: 入力欄が表示された初回のみ発火
  // 発火条件 = 入力欄表示条件 AND AI 初回挨拶済み
  const hasFiredInputReadyRef = useRef(false);
  useEffect(() => {
    if (hasFiredInputReadyRef.current) return;
    if (isPhase1InputVisible && hasAiGreeted) {
      hasFiredInputReadyRef.current = true;
      onInputReady?.();
    }
  }, [isPhase1InputVisible, hasAiGreeted, onInputReady]);

  // 戻るボタンが表示できる状態 = AI 課金終了 → ナビゲーションロックを解除
  // Phase2 の場合は onFinish から直接 onUnlock を呼ぶため、
  // この effect では非 Phase2 またはエラー時のみ解除する。
  const hasUnlockedRef = React.useRef(false);
  const onUnlockRef = React.useRef(onUnlock);
  useEffect(() => {
    onUnlockRef.current = onUnlock;
  }, [onUnlock]);
  useEffect(() => {
    if (shouldShowBackButton && (!isPhase2 || !!chatError) && !hasUnlockedRef.current) {
      hasUnlockedRef.current = true;
      onUnlock?.();
    }
  }, [shouldShowBackButton, isPhase2, chatError, onUnlock]);

  return (
    <div className="w-full h-full flex flex-col relative">
      {/* Messages Area */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-white px-4 py-6 space-y-6 pb-26">
        {messages.map((message, index) => {
          const textContent = message.parts
            .filter((part) => part.type === "text")
            .map((part) => (part as { text: string }).text)
            .join("");
          console.log("Rendering message:", { index, message, textContent });

          return (
            <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              {message.role === "user" ? (
                <div className="bg-gray-100 rounded-3xl px-4 py-3 inline-block max-w-[85%]">
                  <p className="text-base text-gray-900 whitespace-pre-wrap">
                    {textContent}
                  </p>
                </div>
              ) : (
                <MessageContent content={textContent} />
              )}
            </div>
          );
        })}

        {(status === "submitted" ||
          status === "streaming" ||
          isSyncingUsage) && (
          <div className="text-base text-gray-900">
            <div className="flex gap-1">
              <div
                className="w-4 h-4 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <div
                className="w-4 h-4 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <div
                className="w-4 h-4 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
          </div>
        )}

        {/* スプレッド選択画面を表示 */}
        {showSelector && handleStartReading && isPersonal && (
          <div className="mt-6">
            <CategorySpreadSelector
              handleStartReading={handleStartReading}
              onFullyVisible={onSelectorFullyVisible}
              onCoachTargetElChange={onSelectorElChange}
            />
          </div>
        )}

        {chatError && (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-900">
            <div className="font-semibold mb-1">
              {isInputFixableError
                ? t("chat.errorCheckInput")
                : t("chat.errorReadingFailed")}
            </div>
            <p className="whitespace-pre-wrap leading-6">{chatError.message}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {canRetry && (
                <button
                  type="button"
                  onClick={() => {
                    clearError();
                    setChatError(null);
                    void regenerate();
                  }}
                  className="rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold text-white"
                >
                  {t("common.retry")}
                </button>
              )}
              {!isInputFixableError && (
                <button
                  type="button"
                  onClick={onBack}
                  className="rounded-full border border-rose-300 px-4 py-2 text-xs font-semibold text-rose-700"
                >
                  {t("common.back")}
                </button>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 即答方式のヒント及びボタン表示 */}
      {!isPersonal && (
        <RevealPromptPanel
          isAllRevealed={isRevealingCompleted}
          onRevealButtonElChange={onRevealButtonElChange}
        />
      )}

      {/* Back Button - Phase1: 完了後すぐ / Phase2: クロージング完了後のみ */}
      {shouldShowBackButton &&
        !chatError &&
        (() => {
          const debugMode = import.meta.env.VITE_DEBUG_MODE === "true";
          const isExhausted =
            !debugMode && remainingCount !== undefined && remainingCount <= 0;
          return (
            <motion.button
              key={"back-button"}
              initial={{ opacity: 0, scale: 0.7, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.7, y: 40 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className={`absolute bottom-6 right-6 z-50 shadow-xl rounded-full px-5 py-3 font-bold flex items-center gap-2 ${
                isExhausted
                  ? "bg-white/10 text-gray-400 cursor-not-allowed"
                  : "bg-white/20 text-purple-600"
              }`}
              onClick={isExhausted ? undefined : onBack}
              disabled={isExhausted}
            >
              <motion.span
                initial={{ opacity: 1 }}
                animate={!isExhausted ? { opacity: [1, 0.5, 1] } : undefined}
                transition={{ repeat: Infinity, duration: 3 }}
              >
                {isExhausted ? t("chat.dailyLimitReached") : t("chat.tryAgain")}
              </motion.span>
            </motion.button>
          );
        })()}

      {/* Phase2: セッション終了バナー */}
      {/* phase2Stage === "done" = クロージング完了後のみ表示（早期表示を防ぐ） */}
      {isPhase2 &&
        phase2Stage === "done" &&
        !chatError && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="px-4 py-5 bg-gray-50 border-t border-gray-200 text-center"
        >
          <div className="text-sm font-medium text-gray-600 mb-1">
            {t("chat.sessionEnded")}
          </div>
          <div className="text-xs text-gray-400">
            {t("chat.contactAnytime")}
          </div>
        </motion.div>
      )}

      {/* Phase1 入力エリア */}
      {isPhase1InputVisible && (
        <motion.div
          className={`px-4 py-3 bg-transparent border-1 shadow${showSelector ? " invisible" : ""}`}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
            mass: 0.8,
          }}
        >
          <div className="relative bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08),0_8px_16px_rgba(0,0,0,0.06)]">
            <textarea
              ref={(el) => {
                textareaRef.current = el;
                onInputElChange?.(el);
              }}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={
                messages.length === 0
                  ? t("chat.placeholderStart")
                  : t("chat.placeholderConsult")
              }
              rows={2}
              className="w-full resize-none bg-transparent rounded-2xl px-4 py-3 pr-12 text-base text-gray-900 placeholder-gray-400 focus:outline-none transition-all"
              style={{ maxHeight: "120px" }}
              disabled={isProcessing || hasBlockingError}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isProcessing || hasBlockingError}
              className="absolute right-2 bottom-2 w-8 h-8 bg-black hover:bg-gray-800 disabled:bg-gray-300 disabled:opacity-50 text-white rounded-full flex items-center justify-center transition-colors"
            >
              <ArrowUp size={18} strokeWidth={2.5} />
            </button>
          </div>
        </motion.div>
      )}

      {/* Phase2: 鑑定完了後 → Q&Aステータスバナー + 入力エリア */}
      {/* phase2Stage === "chatting" も必須:
          「占いを終わる」早期終了パスでは phase2UserCount < 3 のまま終わるため
          inputDisabled が false のままになる。この条件がないと "done" 後に入力欄が再出現する */}
      {isPhase2 &&
        isMessageComplete &&
        !inputDisabled &&
        phase2Stage === "chatting" &&
        !isProcessing &&
        (() => {
          const phase2UserCount = messages.filter(
            (m, i) => m.role === "user" && i > initialLen,
          ).length;
          const remaining = 3 - phase2UserCount;
          const isLastQ = remaining === 1;
          return (
            <>
              {/* ステータスバナー: 残り問数を常時表示 + 終了ボタン */}
              <div
                className={`px-4 py-3 border-t transition-colors ${
                  isLastQ
                    ? "bg-amber-50 border-amber-100"
                    : "bg-purple-50 border-purple-100"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`text-sm font-medium ${
                      isLastQ ? "text-amber-600" : "text-purple-600"
                    }`}
                  >
                    {isLastQ
                      ? t("chat.lastQuestion")
                      : t("chat.questionsRemaining", { count: remaining })}
                  </div>
                  <button
                    onClick={handleSessionClose}
                    disabled={isProcessing || hasBlockingError}
                    className="text-xs text-gray-500 underline disabled:opacity-40 ml-2 shrink-0"
                  >
                    {t("chat.endSession")}
                  </button>
                </div>
              </div>

              {/* 入力エリア */}
              <motion.div
                className="px-4 py-3 bg-transparent"
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 30,
                  mass: 0.8,
                }}
              >
                <div className="relative bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08),0_8px_16px_rgba(0,0,0,0.06)]">
                  <textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    placeholder={t("chat.placeholderQA")}
                    rows={2}
                    className="w-full resize-none bg-transparent rounded-2xl px-4 py-3 pr-12 text-base text-gray-900 placeholder-gray-400 focus:outline-none transition-all"
                    style={{ maxHeight: "120px" }}
                    disabled={isProcessing || hasBlockingError}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isProcessing || hasBlockingError}
                    className="absolute right-2 bottom-2 w-8 h-8 bg-black hover:bg-gray-800 disabled:bg-gray-300 disabled:opacity-50 text-white rounded-full flex items-center justify-center transition-colors"
                  >
                    <ArrowUp size={18} strokeWidth={2.5} />
                  </button>
                </div>
              </motion.div>
            </>
          );
        })()}
    </div>
  );
};
