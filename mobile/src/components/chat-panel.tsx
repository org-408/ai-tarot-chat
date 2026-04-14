import { useChat } from "@ai-sdk/react";
import { App as CapacitorApp } from "@capacitor/app";
import type { PluginListenerHandle } from "@capacitor/core";
import { Keyboard } from "@capacitor/keyboard";
import type { UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp } from "lucide-react";
import React, { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import type {
  ReadingErrorCode,
  SaveReadingInput,
} from "../../../shared/lib/types";
import { useAuth } from "../lib/hooks/use-auth";
import { useAuthStore } from "../lib/stores/auth";
import { useClient } from "../lib/hooks/use-client";
import { useMaster } from "../lib/hooks/use-master";
import { useSalon } from "../lib/hooks/use-salon";
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
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  onKeyboardHeightChange,
  handleStartReading,
  onBack,
  onUnlock,
  initialMessages,
  onMessagesChange,
  remainingCount,
}) => {
  const domain = import.meta.env.VITE_BFF_URL;

  const { token } = useAuth();

  const { saveReading, refreshUsage } = useClient();
  const [isSavingReading, setIsSavingReading] = useState(false);
  const [isSyncingUsage, setIsSyncingUsage] = useState(false);

  const {
    selectedTarotist,
    selectedPersonalTarotist,
    selectedCategory: category,
    selectedSpread: spread,
    drawnCards,
    isRevealingCompleted,
    isPersonal,
    customQuestion,
    setCustomQuestion,
    setSelectedSpread,
  } = useSalon();

  // パーソナル占いは専用占い師、クイック占いは選択占い師を使用
  const tarotist = isPersonal ? selectedPersonalTarotist : selectedTarotist;

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
  const [saveError, setSaveError] = useState<string | null>(null);

  const transportFetch: typeof fetch = async (input, init) => {
    let response: Response;
    try {
      response = await fetch(input, init);
    } catch {
      throw new ReadingChatError({
        message: "通信に失敗しました。電波の良い場所で再度お試しください。",
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
        ? `${domain}/api/readings/simple`
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
      },
      fetch: transportFetch,
    }),
    onError: (err) => {
      const resolvedError = isReadingChatError(err)
        ? err
        : new ReadingChatError({
            message:
              err.message ||
              "通信に失敗しました。電波の良い場所で再度お試しください。",
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
                message: "占い師からの応答を受信できませんでした。もう一度お試しください。",
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
        // ref を先に同期更新（.finally() など非同期コンテキストから参照するため）
        isClosingCompleteRef.current = true;
        // state も更新（リアクティブなトリガーとして専用 effect が使用する）
        setIsClosingComplete(true);
        // UI 用ステートも更新（入力エリア非表示・バナー表示のトリガー）
        setPhase2Stage("saving");
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

      if (!isPersonal) {
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
      { text: "ありがとうございました。今日の占いはここで終わりにします。" },
      { body: { isEndingEarly: true } },
    );
  }, [sendMessage]);

  // ref を常に最新の関数に同期する
  useEffect(() => {
    handleSessionCloseRef.current = handleSessionClose;
  }, [handleSessionClose]);

  // クロージング AI 応答完了フラグ（ref + state の二重管理）:
  //   ref  → .finally() など非同期コンテキストから同期的に参照するため
  //   state → onFinish 完了をリアクティブに検知し、専用 effect から
  //           persistReading を確実にトリガーするため
  // AI SDK v6 では status→"ready" が onFinish より先に発火するケースがあり、
  // status dep だけでは effect 発火時に ref がまだ false のまま "done" チェックが
  // スキップされる。isClosingComplete state をトリガーにすることで、
  // onFinish 完了後に確実に persistReading が呼ばれるようにする。
  const isClosingCompleteRef = useRef(false);
  const [isClosingComplete, setIsClosingComplete] = useState(false);

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
  //   "saving"   → クロージング AI 完了、DB 保存中
  //   "done"     → DB 保存完了、ナビゲーション解除済み
  type Phase2Stage = "chatting" | "saving" | "done";
  const [phase2Stage, setPhase2Stage] = useState<Phase2Stage>("chatting");
  const saveStartedRef = useRef(false);
  const pendingSaveRef = useRef(false);
  const lastPersistedSignatureRef = useRef<string | null>(null);
  const savedReadingIdRef = useRef<string | null>(null);
  const [savedReadingId, setSavedReadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!saveError) return;
    const t = setTimeout(() => setSaveError(null), 4000);
    return () => clearTimeout(t);
  }, [saveError]);

  const isInputFixableError =
    chatError !== null &&
    inputErrorCodes.includes(chatError.code as ReadingErrorCode);
  const hasBlockingError = chatError !== null && !isInputFixableError;
  const canRetry = !!chatError?.retryable && !isInputFixableError;
  // shouldShowBackButton:
  //   Phase2  → phase2Stage === "done"（保存完了後のみ）
  //   非Phase2 → AI 応答完了 & 保存・同期完了
  //   エラー   → 常に表示（脱出手段を確保）
  const shouldShowBackButton =
    !!chatError ||
    (isPhase2
      ? phase2Stage === "done"
      : isMessageComplete && !isSavingReading && !isSyncingUsage);
  const isProcessing =
    status === "submitted" ||
    status === "streaming" ||
    isSavingReading ||
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
          // 【特におすすめのスプレッド】ヘッダー以降のみをパース対象にする（3提案部分の誤検出を防ぐ）
          const headerIdx = str.indexOf("【特におすすめのスプレッド】");
          const targetStr = headerIdx >= 0 ? str.slice(headerIdx) : str;
          const match = targetStr.match(/\{(\d+)\}:\s*\{([^}]+)\}/);
          const spreadNo = match ? parseInt(match[1], 10) : undefined;
          const spreadName = match ? match[2] : "";
          console.log("Extracted spread no, name:", spreadNo, spreadName);
          const spread = masterData.spreads.find(
            (s) => s.no === spreadNo || s.name === spreadName,
          );
          console.log("Found spread:", spread);
          if (spread) {
            setSelectedSpread(spread);
          }
          // もし spread が取得できなくても、そのまま進める
          setShowSelector(true);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPersonal, masterData.spreads, messages, status]);

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

  // 新しいメッセージが追加されたら自動スクロール -> コメントアウトしてスクロールさせないように変更
  // useEffect(() => {
  //   messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  // }, [messages]);

  // Phase2 開始時に一番下まで一度だけスクロール
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

    // キーボードの準備ができている場合は即座にスクロール
    // そうでない場合は少し待つ
    // const scrollDelay = isKeyboardReady ? 100 : 300;

    // setTimeout(() => {
    //   textareaRef.current?.scrollIntoView({ behavior: "smooth" });
    // }, scrollDelay);
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
      sendMessage({ text: "よろしくお願いします。" });
    } else if (isPhase2 && drawnCards.length > 0) {
      hasSentInitialMessage.current = true;
      sendMessage({ text: `${spread?.name}で占ってください。` });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPersonal, isRevealingCompleted, isPhase2, drawnCards.length]);

  useEffect(() => {
    if (status === "submitted" || status === "streaming") {
      setChatError(null);
    }
  }, [status]);

  const shouldPersistReading = () => {
    if (status !== "ready") return false;

    if (isPhase2) {
      if (drawnCards.length === 0 || messages.length <= initialLen) return false;
      // Phase2 では必ず AI 応答（assistant メッセージ）が末尾にある状態で保存する。
      // sendMessage(closingUserMsg) を React event handler から呼ぶと
      // useSyncExternalStore の tearing により status="ready" かつ messages の
      // 末尾が user（closingUser のみ）のレンダーが発生する。
      // このタイミングで保存すると closingAI 抜きで保存されてしまうため、
      // 末尾が assistant のときだけ保存を許可する。
      return messages[messages.length - 1]?.role === "assistant";
    }

    return (isRevealingCompleted || isPersonal) &&
      drawnCards.length > 0 &&
      messages.length > 0;
  };

  const getTargetMessages = () => messages;

  const buildPersistSignature = (
    readingIdOverride = savedReadingIdRef.current ?? savedReadingId,
  ) =>
    `${readingIdOverride ?? "new"}::${inputDisabled ? "1" : "0"}::${getTargetMessages()
      .map((msg) => {
        const text = msg.parts
          .filter((part) => part.type === "text")
          .map((part) => (part as { text: string }).text)
          .join("");
        return `${msg.role}:${text}`;
      })
      .join("\u0001")}`;

  const buildReadingPayload = (): SaveReadingInput => {
    const targetMessages = getTargetMessages();
    // Phase2 では initialLen 以降の最初の assistant メッセージが初回鑑定（FINAL_READING）
    const firstPhase2TarotistIdx = isPhase2
      ? targetMessages.findIndex(
          (m, i) => m.role === "assistant" && i >= initialLen,
        )
      : -1;

    return {
      readingId: savedReadingIdRef.current ?? savedReadingId ?? undefined,
      incrementUsage: isPersonal
        ? (savedReadingIdRef.current ?? savedReadingId) === null
        : false,
      tarotistId: tarotist.id,
      tarotist,
      spreadId: spread.id,
      spread,
      category: isPersonal ? undefined : category,
      customQuestion: isPersonal ? customQuestion : undefined,
      cards: drawnCards,
      chatMessages: targetMessages.map((msg, i) => {
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
          role: msg.role === "user" ? "USER" : "TAROTIST",
          message: msg.parts
            .filter((part) => part.type === "text")
            .map((part) => (part as { text: string }).text)
            .join(""),
        };
      }),
    };
  };

  const persistReading = useEffectEvent((withSavingIndicator: boolean) => {
    if (saveStartedRef.current) {
      // 保存中に新しいデータ（クロージングメッセージ等）が来た場合、
      // 保存完了後に再試行するフラグを立てる
      if (shouldPersistReading()) {
        pendingSaveRef.current = true;
      }
      return;
    }

    if (!shouldPersistReading()) {
      // 保存条件を満たさなくても、クロージングが完了していれば "done" に遷移する。
      // （例: 既に全データ保存済みで status が再び "ready" になったケース）
      if (isPhase2 && isClosingCompleteRef.current && !hasUnlockedRef.current) {
        hasUnlockedRef.current = true;
        setPhase2Stage("done");
        onUnlockRef.current?.();
      }
      return;
    }

    const nextSignature = buildPersistSignature();
    if (lastPersistedSignatureRef.current === nextSignature) {
      // シグネチャ一致 = 既に保存済み。クロージングが完了していれば "done" に遷移する。
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
      setIsSavingReading(true);
    }

    void saveReading(buildReadingPayload())
      .then((result) => {
        savedReadingIdRef.current = result.reading.id;
        setSavedReadingId(result.reading.id);
        // 保存した時点の内容をベースに readingId だけ差し替える。
        // .then() 実行時の最新 state で buildPersistSignature() を再計算すると、
        // 保存完了を待つ間に追加されたメッセージ（クロージング等）まで "保存済み" と
        // 誤認識し、pendingSaveRef によるリトライがスキップされてしまう。
        const [, ...rest] = nextSignature.split("::");
        lastPersistedSignatureRef.current = [result.reading.id, ...rest].join(
          "::",
        );
      })
      .catch(() => {
        if (withSavingIndicator) {
          setSaveError("占い結果の保存に失敗しました。通信環境をご確認ください。");
        }
      })
      .finally(() => {
        saveStartedRef.current = false;
        if (withSavingIndicator) {
          setIsSavingReading(false);
        }
        // 保存中にスキップされたデータがあれば再試行
        if (pendingSaveRef.current) {
          pendingSaveRef.current = false;
          persistReading(false);
          // リトライが no-op（シグネチャ一致 or shouldPersistReading=false）だった場合、
          // saveStartedRef は false のまま。その場合も "done" チェックを行う。
          // ※リトライが実際に保存を開始した場合は saveStartedRef=true になるため
          //   そのリトライの .finally() に処理を委ねる。
          if (!saveStartedRef.current) {
            if (isPhase2 && isClosingCompleteRef.current && !hasUnlockedRef.current) {
              hasUnlockedRef.current = true;
              setPhase2Stage("done");
              onUnlockRef.current?.();
            }
          }
        } else if (isPhase2 && isClosingCompleteRef.current && !hasUnlockedRef.current) {
          // isClosingCompleteRef は onFinish 内で同期的に true になる ref。
          hasUnlockedRef.current = true;
          setPhase2Stage("done");
          onUnlockRef.current?.();
        }
      });
  });
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

  // 戻るボタンが表示できる状態 = AI 課金終了 → ナビゲーションロックを解除
  // Phase2 の場合は保存完了後に persistReading.finally() から呼び出すため、
  // この effect では非 Phase2 またはエラー時のみ解除する。
  // （Phase2 で useEffect から呼ぶと、保存開始前に解除されてしまうため）
  const hasUnlockedRef = React.useRef(false);
  // persistReading の finally（非同期コンテキスト）から最新の onUnlock を参照するための ref
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

  useEffect(() => {
    // ─────────────────────────────────────────────────────────────
    // DB 保存:
    //   Phase2  → Q&A セッション完了時（inputDisabled=true）に保存
    //   非Phase2 → 鑑定完了後すぐ保存
    //   エラー時は保存しない
    //
    // phase2Stage を deps に含める理由:
    //   AI SDK v6 では status → "ready" が onFinish より先に発火するケースがある。
    //   その場合、status 変化で effect が発火した時点では isClosingCompleteRef が
    //   まだ false のため、シグネチャ一致パスで "done" チェックがスキップされる。
    //   直後に onFinish が isClosingCompleteRef=true + setPhase2Stage("saving") を
    //   実行するが、phase2Stage が deps にないと effect が再発火せず "done" に
    //   遷移できない。phase2Stage を deps に加えることで "saving" への遷移時に
    //   effect が確実に再発火し、isClosingCompleteRef=true の状態で "done" を設定できる。
    // ─────────────────────────────────────────────────────────────
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
    saveReading,
    spread,
    status,
    tarotist,
  ]);

  // クロージング完了時に persistReading を確実にトリガーする専用 effect。
  // AI SDK v6 では status→"ready" が onFinish より先に発火するケースがあり、
  // メインの persist effect が isClosingCompleteRef=false の状態で実行されてしまう
  // ことがある（シグネチャ一致パスで "done" チェックがスキップされ、その後
  // onFinish が ref を true に更新しても他の deps 変化がなければ effect が
  // 再発火しない）。isClosingComplete state は onFinish 内で同期的に
  // true にセットされるため、この effect は onFinish 完了後に確実に発火する。
  useEffect(() => {
    if (!isClosingComplete || !isPhase2) return;
    persistReading(true);
  }, [isClosingComplete, isPhase2, persistReading]);

  useEffect(() => {
    let appStateListener: PluginListenerHandle | undefined;

    const setupAppStateListener = async () => {
      try {
        appStateListener = await CapacitorApp.addListener(
          "appStateChange",
          (state) => {
            if (!state.isActive) {
              persistReading(false);
            }
          },
        );
      } catch (error) {
        console.warn("Failed to attach appStateChange listener", error);
      }
    };

    setupAppStateListener();

    return () => {
      // アンマウント時のみ保存（deps変化時には発火させない）
      // useEffectEvent により persistReading は常に最新状態を参照するため空 deps で正しく動作する
      persistReading(false);
      void appStateListener?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          isSavingReading ||
          isSyncingUsage ||
          // Phase2 の "saving" フェーズ全体でカーソルを表示し続ける。
          // 1回目の保存完了後にリトライ保存が走る場合、リトライは
          // withSavingIndicator=false のため isSavingReading が立たず、
          // カーソルが消えて "done" が来るまで空白になってしまう。
          (isPhase2 && phase2Stage === "saving")) && (
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
            <CategorySpreadSelector handleStartReading={handleStartReading} />
          </div>
        )}

        {chatError && (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-900">
            <div className="font-semibold mb-1">
              {isInputFixableError
                ? "入力内容を確認してください"
                : "占いを続けられませんでした"}
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
                  もう一度試す
                </button>
              )}
              {!isInputFixableError && (
                <button
                  type="button"
                  onClick={onBack}
                  className="rounded-full border border-rose-300 px-4 py-2 text-xs font-semibold text-rose-700"
                >
                  戻る
                </button>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 即答方式のヒント及びボタン表示 */}
      {!isPersonal && (
        <RevealPromptPanel isAllRevealed={isRevealingCompleted} />
      )}

      {/* Back Button - Phase1: 保存後すぐ / Phase2: 全質問終了後のみ */}
      {shouldShowBackButton &&
        !isSavingReading &&
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
                {isExhausted ? "本日の占いは終了しました" : "← もう一度占う"}
              </motion.span>
            </motion.button>
          );
        })()}

      {/* Phase2: セッション終了バナー */}
      {/* phase2Stage === "done" = 保存完了後のみ表示（早期表示を防ぐ） */}
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
            パーソナル占いセッションが終了しました
          </div>
          <div className="text-xs text-gray-400">
            またいつでもご相談ください
          </div>
        </motion.div>
      )}

      {/* Phase1 入力エリア */}
      {isPersonal && !isPhase2 && !inputDisabled && !isProcessing && (
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
              ref={textareaRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={
                messages.length === 0
                  ? "まずは話しかけてみましょう"
                  : "占いたい内容・お悩みを入力してください"
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
                      ? `💬 最後の質問ができます（残り 1 問）`
                      : `💬 鑑定について質問できます（残り ${remaining} 問）`}
                  </div>
                  <button
                    onClick={handleSessionClose}
                    disabled={isProcessing || hasBlockingError}
                    className="text-xs text-gray-500 underline disabled:opacity-40 ml-2 shrink-0"
                  >
                    占いを終わる
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
                    placeholder="カードや鑑定について質問する..."
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

      {/* 保存失敗トースト */}
      <AnimatePresence>
        {saveError && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gray-800 text-white px-4 py-2.5 rounded-2xl shadow-lg text-xs font-medium whitespace-nowrap"
          >
            <span>⚠️</span>
            <span>{saveError}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
