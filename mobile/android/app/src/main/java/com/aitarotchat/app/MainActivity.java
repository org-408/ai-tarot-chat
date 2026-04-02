package com.aitarotchat.app;

import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Android 実機でのみ発生する edge-to-edge 差分を
        // ネイティブ側で吸収して、Web 側や iOS には影響を出さない。
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        View container = findViewById(R.id.main_container);
        if (container != null) {
            ViewCompat.setOnApplyWindowInsetsListener(container, (view, windowInsets) -> {
                Insets insets = windowInsets.getInsets(
                    WindowInsetsCompat.Type.systemBars() |
                    WindowInsetsCompat.Type.displayCutout()
                );

                applyInsetsToWebView(insets);

                return windowInsets;
            });

            ViewCompat.requestApplyInsets(container);
        }
    }

    private void applyInsetsToWebView(Insets insets) {
        if (bridge == null || bridge.getWebView() == null) {
            return;
        }

        View webView = bridge.getWebView();
        ViewGroup.LayoutParams layoutParams = webView.getLayoutParams();

        if (!(layoutParams instanceof ViewGroup.MarginLayoutParams)) {
            return;
        }

        ViewGroup.MarginLayoutParams marginLayoutParams =
            (ViewGroup.MarginLayoutParams) layoutParams;

        if (
            marginLayoutParams.leftMargin == insets.left &&
            marginLayoutParams.topMargin == insets.top &&
            marginLayoutParams.rightMargin == insets.right &&
            marginLayoutParams.bottomMargin == insets.bottom
        ) {
            return;
        }

        marginLayoutParams.leftMargin = insets.left;
        marginLayoutParams.topMargin = insets.top;
        marginLayoutParams.rightMargin = insets.right;
        marginLayoutParams.bottomMargin = insets.bottom;

        webView.setLayoutParams(marginLayoutParams);
    }
}
