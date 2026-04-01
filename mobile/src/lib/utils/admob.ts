import { Capacitor } from "@capacitor/core";
import type { PluginListenerHandle } from "@capacitor/core";
import {
  AdMob,
  BannerAdPosition,
  BannerAdSize,
  InterstitialAdPluginEvents,
} from "@capacitor-community/admob";
import type {
  AdMobInitializationOptions,
  AdOptions,
  BannerAdOptions,
} from "@capacitor-community/admob";

// ネイティブ（iOS / Android）のみ動作
const isNative = Capacitor.isNativePlatform();
const isIOS = Capacitor.getPlatform() === "ios";

/** プラットフォームに応じた広告ユニット ID を返す */
const getAdId = (iosId?: string, androidId?: string) =>
  isIOS ? (iosId ?? "") : (androidId ?? "");

const AD_IDS = {
  interstitial: getAdId(
    import.meta.env.VITE_ADMOB_IOS_INTERSTITIAL_ID,
    import.meta.env.VITE_ADMOB_ANDROID_INTERSTITIAL_ID,
  ),
  banner: getAdId(
    import.meta.env.VITE_ADMOB_IOS_BANNER_ID,
    import.meta.env.VITE_ADMOB_ANDROID_BANNER_ID,
  ),
};

let isInitialized = false;
let initPromise: Promise<void> | null = null;

// -------------------------------------------------------
// 初期化
// -------------------------------------------------------

/**
 * アプリ起動時に一度だけ呼ぶ。
 * DEV 環境では自動的にテスト広告が使われる。
 */
export async function initAdMob(): Promise<void> {
  if (!isNative || isInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const options: AdMobInitializationOptions = {
        initializeForTesting: import.meta.env.DEV,
      };
      await AdMob.initialize(options);
      isInitialized = true;
      console.log("[AdMob] initialized");
    } catch (e) {
      console.error("[AdMob] initialize error:", e);
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

// -------------------------------------------------------
// インタースティシャル（全画面広告）
// -------------------------------------------------------

/**
 * インタースティシャル広告を表示し、閉じられるまで await できる。
 * - ネイティブ以外 / 広告 ID 未設定 / 広告失敗 の場合は即 resolve する。
 * - 有料プランユーザーには呼び出し側でガードすること。
 */
export async function showInterstitialAd(): Promise<void> {
  if (!isNative || !AD_IDS.interstitial) return;
  await initAdMob();

  return new Promise<void>((resolve) => {
    const handles: PluginListenerHandle[] = [];
    const cleanup = () => handles.forEach((h) => h.remove());
    const done = () => {
      cleanup();
      resolve();
    };

    void (async () => {
      handles.push(
        // 広告が閉じられたら処理続行
        await AdMob.addListener(InterstitialAdPluginEvents.Dismissed, done),
        // ロード失敗 → スキップして続行
        await AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, done),
        // 表示失敗 → スキップして続行
        await AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, done),
        // ロード完了 → 表示
        await AdMob.addListener(InterstitialAdPluginEvents.Loaded, async () => {
          try {
            await AdMob.showInterstitial();
          } catch {
            done();
          }
        }),
      );

      // ロード開始
      try {
        const options: AdOptions = { adId: AD_IDS.interstitial };
        await AdMob.prepareInterstitial(options);
      } catch {
        done();
      }
    })();
  });
}

// -------------------------------------------------------
// バナー広告
// -------------------------------------------------------

/**
 * 画面下部にバナー広告を表示する。
 * useEffect の return で removeBannerAd() を呼ぶこと。
 */
export async function showBannerAd(): Promise<void> {
  if (!isNative || !AD_IDS.banner) return;
  await initAdMob();
  try {
    const options: BannerAdOptions = {
      adId: AD_IDS.banner,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
    };
    await AdMob.showBanner(options);
    console.log("[AdMob] banner shown");
  } catch (e) {
    console.error("[AdMob] showBanner error:", e);
  }
}

/** バナー広告を削除する */
export async function removeBannerAd(): Promise<void> {
  if (!isNative) return;
  try {
    await AdMob.removeBanner();
    console.log("[AdMob] banner removed");
  } catch (e) {
    console.error("[AdMob] removeBanner error:", e);
  }
}
