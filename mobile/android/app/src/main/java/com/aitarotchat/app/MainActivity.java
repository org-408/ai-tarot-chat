package com.aitarotchat.app;

import android.os.Bundle;
import android.view.View;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 端末ごとの差を吸収するため、WindowInsets を自前で反映する。
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        View container = findViewById(R.id.main_container);
        if (container != null) {
            ViewCompat.setOnApplyWindowInsetsListener(container, (view, windowInsets) -> {
                Insets insets = windowInsets.getInsets(
                    WindowInsetsCompat.Type.systemBars() |
                    WindowInsetsCompat.Type.displayCutout()
                );

                view.setPadding(
                    insets.left,
                    insets.top,
                    insets.right,
                    insets.bottom
                );

                return windowInsets;
            });

            ViewCompat.requestApplyInsets(container);
        }
    }
}
