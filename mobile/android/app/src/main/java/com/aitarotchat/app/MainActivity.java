package com.aitarotchat.app;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Android 15+/edge-to-edge 環境でも WebView がステータスバーや
        // ディスプレイカットアウトの下に潜らないようにする。
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
    }
}
