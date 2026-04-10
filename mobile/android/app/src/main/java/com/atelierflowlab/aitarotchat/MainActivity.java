package com.atelierflowlab.aitarotchat;

import android.os.Bundle;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Android 15+ (targetSdk 35+) で edge-to-edge が強制されるため、
        // システムバーの実際の inset 値を JS 経由で CSS カスタムプロパティに注入する。
        // Capacitor が super.onCreate() 内で独自レイアウトをセットするため
        // main_container は使用せず、decor view でインセットを取得する。
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        ViewCompat.setOnApplyWindowInsetsListener(getWindow().getDecorView(), (view, windowInsets) -> {
            Insets insets = windowInsets.getInsets(
                WindowInsetsCompat.Type.systemBars() |
                WindowInsetsCompat.Type.displayCutout()
            );

            if (bridge != null && bridge.getWebView() != null) {
                float density = getResources().getDisplayMetrics().density;
                String js = String.format(java.util.Locale.US,
                    "document.documentElement.style.setProperty('--safe-top','%.2fpx');" +
                    "document.documentElement.style.setProperty('--safe-bottom','%.2fpx');",
                    insets.top / density,
                    insets.bottom / density
                );
                bridge.getWebView().post(() ->
                    bridge.getWebView().evaluateJavascript(js, null)
                );
            }

            return windowInsets;
        });
    }
}
