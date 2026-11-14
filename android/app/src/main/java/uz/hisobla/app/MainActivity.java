package uz.hisobla.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.HapticFeedbackConstants;
import android.view.View;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.webkit.WebViewAssetLoader;

/** Hisobla ilovasi: interfeys ilova ichidagi fayllardan, internetsiz ishlaydi. */
public class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + HOST + "/assets/www/index.html";

    private WebView web;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applyBars(true);

        final WebViewAssetLoader assets = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#121214"));
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setVerticalScrollBarEnabled(false);

        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);    // tarix va mavzu saqlanadi
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setTextZoom(100);              // telefon shrift o'lchami dizaynni buzmasin
        settings.setSupportZoom(false);
        settings.setUserAgentString(settings.getUserAgentString() + " HisoblaApp/" + versionName());

        web.addJavascriptInterface(new NativeBridge(), "HisoblaNative");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assets.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (HOST.equals(uri.getHost())) return false;
                openExternal(uri);
                return true;
            }
        });

        setContentView(web);
        if (savedInstanceState != null) web.restoreState(savedInstanceState);
        else {
            String page = pageFromIntent(getIntent());
            web.loadUrl(page == null ? START_URL : START_URL + "#" + page);
        }
    }

    /** Tezkor yorliq (hisobla://open/fractions) qaysi bo'limni ochishini aniqlaydi. */
    private static String pageFromIntent(Intent intent) {
        if (intent == null || intent.getData() == null) return null;
        String page = intent.getData().getLastPathSegment();
        return page != null && page.matches("[a-z]{2,20}") ? page : null;
    }

    /** Ilova ochiq turganda yorliq bosilsa — sahifani qayta yuklamay, bo'limga o'tamiz. */
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        String page = pageFromIntent(intent);
        if (page != null && web != null) {
            web.evaluateJavascript("window.hisoblaOpen && window.hisoblaOpen('" + page + "')", null);
        }
    }

    private String versionName() {
        try {
            return getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
        } catch (Exception e) {
            return "1.0";
        }
    }

    private void openExternal(Uri uri) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (ActivityNotFoundException ignored) {
            // havolani ochadigan ilova yo'q
        }
    }

    /** Status bar va pastki tizim paneli rangini mavzuga moslash. */
    private void applyBars(boolean dark) {
        applyBars(dark ? 0xFF121214 : 0xFFF5F7FB, dark ? 0xFF1B1B1F : 0xFFFFFFFF, dark);
    }

    @SuppressWarnings("deprecation")
    private void applyBars(int statusColor, int navColor, boolean dark) {
        Window window = getWindow();
        window.setStatusBarColor(statusColor);
        window.setNavigationBarColor(navColor);
        if (web != null) web.setBackgroundColor(statusColor);
        View decor = window.getDecorView();
        int flags = decor.getSystemUiVisibility();
        if (Build.VERSION.SDK_INT >= 23) {
            flags = dark ? flags & ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR : flags | View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
        }
        if (Build.VERSION.SDK_INT >= 26) {
            flags = dark ? flags & ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR : flags | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        }
        decor.setSystemUiVisibility(flags);
    }

    /** Sahifadagi JavaScript chaqira oladigan ilova funksiyalari. */
    private class NativeBridge {
        @JavascriptInterface
        public void haptic() {
            runOnUiThread(() -> web.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP));
        }

        @JavascriptInterface
        public void setTheme(final boolean dark) {
            runOnUiThread(() -> applyBars(dark));
        }

        /** Har bir rang mavzusi uchun aniq ranglar: "#0a1520" kabi. */
        @JavascriptInterface
        public void setBars(final String status, final String nav, final boolean dark) {
            runOnUiThread(() -> {
                try {
                    applyBars(Color.parseColor(status), Color.parseColor(nav), dark);
                } catch (IllegalArgumentException e) {
                    applyBars(dark);
                }
            });
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        web.saveState(outState);
    }

    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();   // bo'limlar bo'ylab orqaga
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (web != null) web.destroy();
        super.onDestroy();
    }
}
