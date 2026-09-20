package com.japanese.practicing

import android.os.Handler
import android.os.Looper
import android.webkit.WebView
import android.webkit.WebViewClient
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import org.json.JSONObject
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Reads a Capacitor WebView localStorage item that survives same-applicationId upgrades.
 *
 * Capacitor 7 serves the app from https://localhost (also tried: http / capacitor schemes).
 * localStorage is origin-scoped under the app's WebView data dir
 * (`/data/data/com.japanese.practicing/app_webview/...`), which remains available when Expo
 * replaces Capacitor under the same applicationId.
 *
 * SharedPreferences do not hold Chromium localStorage; LevelDB under app_webview is not
 * parsed directly. A one-shot WebView evaluateJavascript bridge is the smallest reliable path.
 */
class LegacyWebViewStorageModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = NAME

  @ReactMethod
  fun readLocalStorageItem(key: String, promise: Promise) {
    Handler(Looper.getMainLooper()).post {
      try {
        readViaWebView(key, ORIGINS, 0, promise)
      } catch (e: Exception) {
        promise.resolve(null)
      }
    }
  }

  private fun readViaWebView(key: String, origins: List<String>, index: Int, promise: Promise) {
    if (index >= origins.size) {
      promise.resolve(null)
      return
    }

    val origin = origins[index]
    val webView = WebView(reactContext.applicationContext)
    val settled = AtomicBoolean(false)

    fun finish(value: String?) {
      if (!settled.compareAndSet(false, true)) return
      try {
        webView.stopLoading()
        webView.destroy()
      } catch (_: Exception) {
      }
      if (value != null) {
        promise.resolve(value)
      } else {
        readViaWebView(key, origins, index + 1, promise)
      }
    }

    webView.settings.javaScriptEnabled = true
    webView.settings.domStorageEnabled = true
    webView.webViewClient = object : WebViewClient() {
      override fun onPageFinished(view: WebView, url: String) {
        val escapedKey = JSONObject.quote(key)
        val script =
          "(function(){try{var v=localStorage.getItem($escapedKey);return v==null?null:String(v);}catch(e){return null;}})()"
        view.evaluateJavascript(script) { raw ->
          finish(decodeJsStringResult(raw))
        }
      }
    }

    // Timeout so a hung WebView cannot block hydration forever.
    Handler(Looper.getMainLooper()).postDelayed({
      finish(null)
    }, TIMEOUT_MS)

    webView.loadDataWithBaseURL(origin, "<html><body></body></html>", "text/html", "UTF-8", null)
  }

  companion object {
    const val NAME = "LegacyWebViewStorage"
    private const val TIMEOUT_MS = 2500L

    /** Capacitor default origins, plus historical variants. */
    private val ORIGINS = listOf(
      "https://localhost",
      "http://localhost",
      "capacitor://localhost",
      "https://localhost/",
    )

    /**
     * evaluateJavascript returns a JSON-encoded value (`"foo"`, `null`, or `"null"`).
     */
    fun decodeJsStringResult(raw: String?): String? {
      if (raw == null || raw == "null" || raw.isBlank()) return null
      return try {
        val trimmed = raw.trim()
        if (trimmed.startsWith("\"") && trimmed.endsWith("\"")) {
          JSONObject("{\"v\":$trimmed}").getString("v")
        } else {
          trimmed
        }
      } catch (_: Exception) {
        null
      }
    }
  }
}
