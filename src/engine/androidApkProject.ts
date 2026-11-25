interface ZipEntry {
  path: string;
  data: Uint8Array;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function buildZipBlob(entries: ZipEntry[]): Blob {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.path);
    const data = entry.data;
    const crc = crc32(data);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(localHeader.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true);
    lv.setUint16(8, 0, true); // STORE
    lv.setUint16(10, 0, true);
    lv.setUint16(12, 0x5421, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);

    localParts.push(localHeader, data);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(centralHeader.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true); // STORE
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0x5421, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);

    centralParts.push(centralHeader);
    offset += localHeader.length + data.length;
  }

  let centralSize = 0;
  for (const part of centralParts) {
    centralSize += part.length;
  }

  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  const blobParts: BlobPart[] = [
    ...localParts.map((u) => new Uint8Array(u)),
    ...centralParts.map((u) => new Uint8Array(u)),
    new Uint8Array(eocd),
  ];

  return new Blob(blobParts, { type: 'application/zip' });
}

export const GITHUB_WORKFLOW_YML = `name: Build Android 17 APK (Poco F6)

on:
  push:
    branches: [ main, master ]
  workflow_dispatch:

env:
  FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: 'true'

jobs:
  build-apk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up JDK 17
        uses: actions/setup-java@v5
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Accept Android SDK Licenses & Install SDK
        shell: bash
        run: |
          SDK_ROOT="\${ANDROID_HOME:-\${ANDROID_SDK_ROOT:-/usr/local/lib/android/sdk}}"
          echo "ANDROID_HOME=$SDK_ROOT" >> "$GITHUB_ENV"
          SDK_MANAGER=$(find "$SDK_ROOT" -name sdkmanager -type f 2>/dev/null | head -n 1)
          if [ -n "$SDK_MANAGER" ]; then
            set +o pipefail
            yes | "$SDK_MANAGER" --licenses >/dev/null || true
            "$SDK_MANAGER" "platforms;android-35" "build-tools;35.0.0"
          fi

      - name: Setup Gradle
        uses: gradle/actions/setup-gradle@v4
        with:
          gradle-version: '8.11.1'

      - name: Build Debug APK
        run: gradle assembleDebug --no-daemon --stacktrace

      - name: Upload APK for Poco F6
        uses: actions/upload-artifact@v4
        with:
          name: CoruscantHorizon-Android17-PocoF6-debug
          path: app/build/outputs/apk/debug/app-debug.apk
`;

export function generateAndroid17ApkProjectZip(fullGameHtml: string): Blob {
  const encoder = new TextEncoder();
  const addText = (path: string, content: string): ZipEntry => ({
    path,
    data: encoder.encode(content),
  });

  const settingsGradle = `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "CoruscantHorizon"
include(":app")
`;

  const rootBuildGradle = `plugins {
    id("com.android.application") version "8.7.3" apply false
    id("org.jetbrains.kotlin.android") version "2.0.21" apply false
}
`;

  const gradleProperties = `org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
kotlin.code.style=official
android.nonTransitiveRClass=true
`;

  const appBuildGradle = `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.coruscant.horizon"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.coruscant.horizon"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.activity:activity-ktx:1.9.3")
    implementation("androidx.webkit:webkit:1.12.1")
}
`;

  const manifestXml = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.HIGH_SAMPLING_RATE_SENSORS" />
    <uses-feature android:glEsVersion="0x00030000" android:required="true" />

    <application
        android:allowBackup="true"
        android:hardwareAccelerated="true"
        android:icon="@drawable/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@drawable/ic_launcher"
        android:supportsRtl="true"
        android:theme="@style/Theme.CoruscantHorizon">

        <activity
            android:name=".MainActivity"
            android:configChanges="orientation|screenSize|screenLayout|keyboardHidden|smallestScreenSize|uiMode"
            android:exported="true"
            android:hardwareAccelerated="true"
            android:launchMode="singleTask">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
`;

  const mainActivityKt = `package com.coruscant.horizon

import android.annotation.SuppressLint
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.webkit.WebViewAssetLoader

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            window.attributes.layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
        }
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        webView = WebView(this)
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null)
        webView.setBackgroundColor(0xFF06090F.toInt())
        setContentView(webView)

        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? {
                return assetLoader.shouldInterceptRequest(request.url)
            }
        }

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            useWideViewPort = true
            loadWithOverviewMode = true
            mediaPlaybackRequiresUserGesture = false
            mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
            cacheMode = WebSettings.LOAD_DEFAULT
        }

        webView.loadUrl("https://appassets.androidplatform.net/assets/index.html")
        hideSystemBars()

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    finish()
                }
            }
        })
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) hideSystemBars()
    }

    private fun hideSystemBars() {
        WindowCompat.setDecorFitsSystemWindows(window, false)
        val controller = WindowCompat.getInsetsController(window, webView)
        controller.systemBarsBehavior =
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        controller.hide(WindowInsetsCompat.Type.systemBars())
    }
}
`;

  const stringsXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Корускант · Горизонт</string>
</resources>
`;

  const stylesXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="Theme.CoruscantHorizon" parent="Theme.AppCompat.NoActionBar">
        <item name="android:windowBackground">#06090f</item>
        <item name="android:statusBarColor">@android:color/transparent</item>
        <item name="android:navigationBarColor">@android:color/transparent</item>
    </style>
</resources>
`;

  const icLauncherXml = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path android:fillColor="#06090f" android:pathData="M0,0h108v108h-108z" />
    <path android:fillColor="#f59e0b" android:pathData="M54,44m-18,0a18,18 0,1 1,36 0a18,18 0,1 1,-36 0" />
    <path android:fillColor="#0b1220" android:pathData="M24,36h12v36h-12zM72,38h12v34h-12zM54,18l5,34h-10z" />
    <path android:fillColor="#070b13" android:pathData="M0,68Q54,60 108,68L108,108L0,108Z" />
    <path android:fillColor="#38bdf8" android:pathData="M50,66h8l16,42h-40z" />
</vector>
`;

  const readme = `КОРУСКАНТ · ГОРИЗОНТ — ПОДРОБНАЯ ИНСТРУКЦИЯ СБОРКИ APK ЧЕРЕЗ GITHUB
======================================================================

Внутри этого архива в файле app/src/main/assets/index.html лежит ПОЛНАЯ
версия игры (та же 3D-графика, планеты, спутница, кафе, отели, обсерватории,
погода и гироскоп, полностью работает офлайн на Android 17 / Poco F6).

ПОШАГОВАЯ СБОРКА APK ЧЕРЕЗ GITHUB (можно сделать прямо с телефона, без ПК):

ШАГ 1. Распакуйте архив
  - На Poco F6 откройте «Проводник» (или «Файлы»), найдите файл
    coruscant_horizon_android17_apk.zip и нажмите «Извлечь сюда».
  - ВАЖНО: В настройках Проводника включите «Показывать скрытые файлы»,
    иначе папка ".github" (с точкой в начале) не будет видна!

ШАГ 2. Создайте репозиторий на GitHub
  - Откройте https://github.com в Chrome (если неудобно с телефона —
    в меню Chrome (⋮) поставьте галочку «Версия для ПК»).
  - Войдите в свой аккаунт GitHub (или зарегистрируйтесь бесплатно).
  - Нажмите «+» в правом верхнем углу -> «New repository».
  - Введите название, например: coruscant-horizon
  - Нажмите зелёную кнопку «Create repository».

ШАГ 3. Загрузите распакованные файлы в корень репозитория
  - На открывшейся странице нажмите синюю ссылку «uploading an existing file».
  - Выберите ВСЕ файлы и папки ИЗНУТРИ распакованной папки:
    * папка app
    * папка .github
    * файл build.gradle.kts
    * файл settings.gradle.kts
    * файл gradle.properties
  - ВАЖНО: Не загружайте сам .zip и не создавайте лишнюю общую папку!
    В корне репозитория сразу должны лежать settings.gradle.kts и app/.
  - Внизу нажмите зелёную кнопку «Commit changes».

  (Если папка .github всё-таки не загрузилась:
   откройте на GitHub вкладку Actions -> «set up a workflow yourself»,
   назовите файл build-apk.yml и вставьте в него содержимое файла
   .github/workflows/build-apk.yml из архива, затем нажмите Commit changes.)

ШАГ 4. Запустите сборку APK
  - Перейдите на вкладку «Actions» вверху репозитория.
  - Нажмите «Build Android 17 APK (Poco F6)» в списке слева.
  - Нажмите кнопку «Run workflow» -> зелёную «Run workflow».
  - (Сборка также запускается автоматически после загрузки файлов.)

ШАГ 5. Скачайте и установите готовый APK на Poco F6
  - Подождите 2–3 минуты, пока значок сборки станет зелёным (Success).
  - Нажмите на название выполненного запуска.
  - Пролистайте страницу в самый низ до блока «Artifacts».
  - Нажмите «CoruscantHorizon-Android17-PocoF6-debug» — скачается ZIP-файл.
  - Распакуйте его на телефоне и нажмите на «app-debug.apk» для установки!
  - Если Android спросит разрешение на установку из этого источника — разрешите.
`;

  const entries: ZipEntry[] = [
    addText('settings.gradle.kts', settingsGradle),
    addText('build.gradle.kts', rootBuildGradle),
    addText('gradle.properties', gradleProperties),
    addText('app/build.gradle.kts', appBuildGradle),
    addText('app/proguard-rules.pro', '# Keep WebView JS interfaces\n'),
    addText('app/src/main/AndroidManifest.xml', manifestXml),
    addText('app/src/main/java/com/coruscant/horizon/MainActivity.kt', mainActivityKt),
    addText('app/src/main/res/values/strings.xml', stringsXml),
    addText('app/src/main/res/values/styles.xml', stylesXml),
    addText('app/src/main/res/drawable/ic_launcher.xml', icLauncherXml),
    addText('app/src/main/assets/index.html', fullGameHtml),
    addText('.github/workflows/build-apk.yml', GITHUB_WORKFLOW_YML),
    addText('README_ANDROID17_POCO_F6.txt', readme),
  ];

  return buildZipBlob(entries);
}
