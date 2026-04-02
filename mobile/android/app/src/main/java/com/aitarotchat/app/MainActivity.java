package com.aitarotchat.app;

import android.os.Bundle;
import android.view.View;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private Insets currentInsets = Insets.NONE;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Android の inset を CSS 変数として Web 側へ渡す。
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        View container = findViewById(R.id.main_container);
        if (container != null) {
            ViewCompat.setOnApplyWindowInsetsListener(container, (view, windowInsets) -> {
                currentInsets = windowInsets.getInsets(
                    WindowInsetsCompat.Type.systemBars() |
                    WindowInsetsCompat.Type.displayCutout()
                );

                pushInsetsToWebView(currentInsets);

                return windowInsets;
            });

            ViewCompat.requestApplyInsets(container);
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        pushInsetsToWebView(currentInsets);
    }

    private void pushInsetsToWebView(Insets insets) {
        if (bridge == null || bridge.getWebView() == null) {
            return;
        }

        String script = String.format(
            "document.documentElement.style.setProperty('--android-safe-top', '%dpx');" +
            "document.documentElement.style.setProperty('--android-safe-right', '%dpx');" +
            "document.documentElement.style.setProperty('--android-safe-bottom', '%dpx');" +
            "document.documentElement.style.setProperty('--android-safe-left', '%dpx');",
            insets.top,
            insets.right,
            insets.bottom,
            insets.left
        );

        bridge.getWebView().post(() -> bridge.getWebView().evaluateJavascript(script, null));
    }
}
