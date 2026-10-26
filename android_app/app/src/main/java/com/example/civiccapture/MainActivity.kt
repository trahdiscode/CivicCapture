package com.example.civiccapture

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.webkit.ConsoleMessage
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {
    private val CAMERA_PERMISSION_REQUEST_CODE = 100

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val permissions = arrayOf(
            Manifest.permission.CAMERA, 
            Manifest.permission.RECORD_AUDIO,
            Manifest.permission.MODIFY_AUDIO_SETTINGS
        )
        val missingPermissions = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (missingPermissions.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, missingPermissions.toTypedArray(), CAMERA_PERMISSION_REQUEST_CODE)
        }

        val myWebView: WebView = findViewById(R.id.webview)
        myWebView.webViewClient = WebViewClient()
        myWebView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                request.grant(request.resources)
            }
            // Pipe JS console output to Logcat so we can see errors
            override fun onConsoleMessage(msg: ConsoleMessage): Boolean {
                Log.d("CivicCapture_JS", "${msg.messageLevel()} | ${msg.message()} @ line ${msg.lineNumber()}")
                return true
            }
        }

        val webSettings: WebSettings = myWebView.settings
        webSettings.javaScriptEnabled = true
        webSettings.domStorageEnabled = true
        webSettings.allowFileAccess = true
        webSettings.allowContentAccess = true
        webSettings.mediaPlaybackRequiresUserGesture = false
        // CRITICAL: allows file:// pages to make HTTPS calls to Supabase
        @Suppress("DEPRECATION")
        webSettings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        @Suppress("DEPRECATION")
        webSettings.allowFileAccessFromFileURLs = true
        @Suppress("DEPRECATION")
        webSettings.allowUniversalAccessFromFileURLs = true

        myWebView.loadUrl("file:///android_asset/index.html")
    }
}
