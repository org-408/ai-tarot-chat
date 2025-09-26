// Tauri API型定義
interface TauriInvokeArgs {
  [key: string]: unknown;
}

interface TauriEventPayload {
  [key: string]: unknown;
}

interface TauriEvent<T = TauriEventPayload> {
  event: string;
  windowLabel: string;
  payload: T;
  id: number;
}

interface TauriEventUnlisten {
  (): void;
}

interface TauriWindowManager {
  appWindow: {
    close(): Promise<void>;
    minimize(): Promise<void>;
    maximize(): Promise<void>;
    unmaximize(): Promise<void>;
    show(): Promise<void>;
    hide(): Promise<void>;
    setFocus(): Promise<void>;
    isFocused(): Promise<boolean>;
    isMaximized(): Promise<boolean>;
    isMinimized(): Promise<boolean>;
    isVisible(): Promise<boolean>;
  };
}

interface TauriEventManager {
  listen<T = TauriEventPayload>(
    event: string,
    handler: (event: TauriEvent<T>) => void
  ): Promise<TauriEventUnlisten>;

  emit(event: string, payload?: TauriEventPayload): Promise<void>;

  once<T = TauriEventPayload>(
    event: string,
    handler: (event: TauriEvent<T>) => void
  ): Promise<TauriEventUnlisten>;
}

interface TauriAPI {
  invoke<T = unknown>(cmd: string, args?: TauriInvokeArgs): Promise<T>;
  event: TauriEventManager;
  window: TauriWindowManager;
}

declare global {
  interface Window {
    __TAURI__?: TauriAPI;
  }
}

export type {
  TauriAPI,
  TauriEvent,
  TauriEventManager,
  TauriEventPayload,
  TauriEventUnlisten,
  TauriInvokeArgs,
  TauriWindowManager,
};
