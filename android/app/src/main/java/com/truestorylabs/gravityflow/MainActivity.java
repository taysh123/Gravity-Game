package com.truestorylabs.gravityflow;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.util.Log;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

/**
 * Renderer-crash recovery (D-11, P00-T12). When the WebView's renderer process dies (crash or low-memory kill),
 * Capacitor's WebViewClient crashes the whole app unless a listener handles it, and the dead WebView cannot be
 * reused. So the first RENDERER_MAX_RECOVERIES deaths in a process recreate the activity, which builds a fresh
 * WebView that reloads the game (progress is persisted, so it survives). The next one is left to crash normally,
 * so a renderer that dies on every load can never loop.
 */
public class MainActivity extends BridgeActivity {

    private static final String TAG = "GravityFlow";

    // These three values repeat src/config/platform.config.ts (RENDERER_MAX_RECOVERIES, RENDERER_GONE_KEY) and the
    // file @capacitor/preferences stores in (its default group). src/platform/rendererGone.test.ts pins them.
    private static final int RENDERER_MAX_RECOVERIES = 2;
    private static final String PREFS_FILE = "CapacitorStorage";
    private static final String RENDERER_GONE_KEY = "platform:rendererGone";

    // Lives as long as the process, so it survives recreate() and resets only after a real crash.
    private static int rendererDeaths = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // BridgeActivity shows no_webview and returns early if the WebView is missing, disabled or mid-update.
        if (getBridge() == null) return;
        getBridge().addWebViewListener(
            new WebViewListener() {
                @Override
                public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                    return recoverFromRendererGone(detail.didCrash());
                }
            }
        );
    }

    // true = handled (the activity is being recreated); false = let the normal crash happen.
    private boolean recoverFromRendererGone(boolean didCrash) {
        rendererDeaths++;
        Log.w(TAG, "WebView renderer gone (didCrash=" + didCrash + "), death " + rendererDeaths + " in this process");
        recordRendererGone();
        if (rendererDeaths > RENDERER_MAX_RECOVERIES) {
            return false;
        }
        recreate();
        return true;
    }

    // Tells the next JS boot (Saves.hydrate -> consumeRendererGone) that this happened: adds one to a String count in
    // the Capacitor Preferences file, which the plugin reads with getString. commit(), not apply(): the process may
    // be about to crash, and apply() would write after this method returns.
    private void recordRendererGone() {
        SharedPreferences prefs = getSharedPreferences(PREFS_FILE, Context.MODE_PRIVATE);
        int count = 0;
        try {
            count = Integer.parseInt(prefs.getString(RENDERER_GONE_KEY, "0"));
        } catch (NumberFormatException | ClassCastException ignored) {
            // an unreadable old value restarts the count; the JS side only needs "at least one"
        }
        prefs.edit().putString(RENDERER_GONE_KEY, String.valueOf(count + 1)).commit();
    }
}
