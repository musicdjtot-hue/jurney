import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const androidDir = path.join(root, 'android');

if (!fs.existsSync(androidDir)) {
  console.error('Android project directory not found. Run `npx cap add android` first.');
  process.exit(1);
}

// 1. Patch AndroidManifest.xml (hardware acceleration, vibration, wake lock, fullscreen config)
const manifestPath = path.join(androidDir, 'app', 'src', 'main', 'AndroidManifest.xml');
let manifest = fs.readFileSync(manifestPath, 'utf8');

if (!manifest.includes('android:hardwareAccelerated')) {
  manifest = manifest.replace(
    '<application',
    '<application\n        android:hardwareAccelerated="true"',
  );
}

if (!manifest.includes('android:screenOrientation')) {
  manifest = manifest.replace(
    'android:name=".MainActivity"',
    'android:name=".MainActivity"\n            android:screenOrientation="user"\n            android:windowSoftInputMode="adjustNothing"',
  );
}

const permissions = [
  'android.permission.VIBRATE',
  'android.permission.WAKE_LOCK',
];

for (const perm of permissions) {
  if (!manifest.includes(perm)) {
    manifest = manifest.replace(
      '</manifest>',
      `    <uses-permission android:name="${perm}" />\n</manifest>`,
    );
  }
}

if (!manifest.includes('android:glEsVersion')) {
  manifest = manifest.replace(
    '</manifest>',
    '    <uses-feature android:glEsVersion="0x00030000" android:required="false" />\n</manifest>',
  );
}

fs.writeFileSync(manifestPath, manifest, 'utf8');

// 2. Patch styles.xml for dark #06090f launch & no white flash
const stylesPath = path.join(androidDir, 'app', 'src', 'main', 'res', 'values', 'styles.xml');
const stylesXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="Theme.AppCompat.DayNight.NoActionBar">
        <item name="colorPrimary">#06090f</item>
        <item name="colorPrimaryDark">#06090f</item>
        <item name="colorAccent">#38bdf8</item>
        <item name="android:windowBackground">#06090f</item>
    </style>

    <style name="AppTheme.NoActionBar" parent="Theme.AppCompat.DayNight.NoActionBar">
        <item name="windowActionBar">false</item>
        <item name="windowNoTitle">true</item>
        <item name="android:windowBackground">#06090f</item>
        <item name="android:statusBarColor">#06090f</item>
        <item name="android:navigationBarColor">#06090f</item>
    </style>

    <style name="AppTheme.NoActionBarLaunch" parent="Theme.AppCompat.DayNight.NoActionBar">
        <item name="windowActionBar">false</item>
        <item name="windowNoTitle">true</item>
        <item name="android:windowBackground">#06090f</item>
        <item name="android:statusBarColor">#06090f</item>
        <item name="android:navigationBarColor">#06090f</item>
    </style>
</resources>
`;
fs.writeFileSync(stylesPath, stylesXml, 'utf8');

// 3. Patch strings.xml so app name matches browser title cleanly
const stringsPath = path.join(androidDir, 'app', 'src', 'main', 'res', 'values', 'strings.xml');
if (fs.existsSync(stringsPath)) {
  let stringsXml = fs.readFileSync(stringsPath, 'utf8');
  stringsXml = stringsXml
    .replace(/<string name="app_name">.*?<\/string>/, '<string name="app_name">Корускант · Горизонт</string>')
    .replace(/<string name="title_activity_main">.*?<\/string>/, '<string name="title_activity_main">Корускант · Горизонт</string>');
  fs.writeFileSync(stringsPath, stringsXml, 'utf8');
}

// 4. Patch MainActivity.java for immersive fullscreen, keep-screen-on, cutout support & optimal WebGL WebView settings
function findMainActivity(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findMainActivity(full);
      if (found) return found;
    } else if (entry.name === 'MainActivity.java') {
      return full;
    }
  }
  return null;
}

const mainActivityPath = findMainActivity(path.join(androidDir, 'app', 'src', 'main', 'java'));
if (mainActivityPath) {
  const original = fs.readFileSync(mainActivityPath, 'utf8');
  const pkgMatch = original.match(/package\s+([^;]+);/);
  const pkg = pkgMatch ? pkgMatch[1] : 'com.coruscant.horizon';

  const updatedMainActivity = `package ${pkg};

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().setStatusBarColor(Color.parseColor("#06090f"));
        getWindow().setNavigationBarColor(Color.parseColor("#06090f"));

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(lp);
        }

        applyImmersiveMode();

        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebView webView = this.bridge.getWebView();
            webView.setBackgroundColor(Color.parseColor("#06090f"));
            webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
            WebSettings settings = webView.getSettings();
            settings.setDomStorageEnabled(true);
            settings.setMediaPlaybackRequiresUserGesture(false);
            settings.setUseWideViewPort(true);
            settings.setLoadWithOverviewMode(true);
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            applyImmersiveMode();
        }
    }

    private void applyImmersiveMode() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (controller != null) {
            controller.hide(WindowInsetsCompat.Type.systemBars());
            controller.setSystemBarsBehavior(
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            );
        }
    }
}
`;
  fs.writeFileSync(mainActivityPath, updatedMainActivity, 'utf8');
}

// 5. Update versionCode from CI run number if available
const appBuildGradlePath = path.join(androidDir, 'app', 'build.gradle');
if (fs.existsSync(appBuildGradlePath)) {
  const runNum = Number.parseInt(process.env.GITHUB_RUN_NUMBER || '1', 10) || 1;
  let gradle = fs.readFileSync(appBuildGradlePath, 'utf8');
  gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${runNum}`);
  gradle = gradle.replace(/versionName\s+"[^"]+"/, `versionName "1.0.${runNum}"`);
  fs.writeFileSync(appBuildGradlePath, gradle, 'utf8');
}

console.log('Android project configured successfully for Coruscant Horizon.');
