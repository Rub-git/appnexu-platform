import 'server-only';

/**
 * APK Builder Service
 * Creates Android APK wrapper using Capacitor configuration.
 *
 * ⚠️  PRODUCTION NOTE:
 * In production, this generates the Capacitor project structure and a
 * downloadable zip. A *real* APK build (gradle + Android SDK) takes
 * several minutes and CANNOT run inside Vercel serverless functions
 * (10s Hobby / 60s Pro timeout).
 *
 * Recommended architecture for actual APK compilation:
 *   1. Push build job to a queue (QStash / SQS / Bull)
 *   2. A dedicated worker (EC2, Cloud Build, GitHub Actions) picks it up
 *   3. Worker compiles APK and uploads to Vercel Blob / S3
 *   4. Worker PATCHes the AppProject record with download URL
 *
 * Current implementation: generates project zip + build instructions.
 */

import { logger } from './logger';
import { resolveAppBaseUrl } from './queue';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// ─── Types ───────────────────────────────────────────────────────────

interface AppData {
  id: string;
  appName: string;
  shortName: string | null;
  targetUrl: string;
  themeColor: string | null;
  backgroundColor: string | null;
  iconUrls: string;
  slug: string;
}

interface BuildResult {
  downloadUrl: string;
  buildPath: string;
}

// ─── Constants ───────────────────────────────────────────────────────

const BUILD_TIMEOUT_MS = 30_000; // 30s safety net for tar/zip
const OUTPUT_DIR = path.join('/tmp', 'apk-output');

// ─── Main builder ────────────────────────────────────────────────────

export async function buildApk(app: AppData): Promise<BuildResult> {
  const buildDir = path.join('/tmp', 'apk-builds', app.id);

  try {
    // Cleanup any leftover from a previous attempt (idempotent)
    try { fs.rmSync(buildDir, { recursive: true, force: true }); } catch { /* ok */ }

    fs.mkdirSync(buildDir, { recursive: true });
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    // 1. Generate Capacitor config
    const capacitorConfig = generateCapacitorConfig(app);
    fs.writeFileSync(path.join(buildDir, 'capacitor.config.json'), JSON.stringify(capacitorConfig, null, 2));

    // 2. Generate package.json
    fs.writeFileSync(path.join(buildDir, 'package.json'), JSON.stringify({
      name: sanitizePackageName(app.slug),
      version: '1.0.0',
      description: `${app.appName} - Android App`,
      main: 'index.js',
      scripts: {
        build: 'npx cap sync android && cd android && ./gradlew assembleRelease',
      },
      dependencies: {
        '@capacitor/core': '^6.0.0',
        '@capacitor/android': '^6.0.0',
      },
    }, null, 2));

    // 3. Generate www/index.html
    const wwwDir = path.join(buildDir, 'www');
    fs.mkdirSync(wwwDir, { recursive: true });
    fs.writeFileSync(path.join(wwwDir, 'index.html'), generateIndexHtml(app));

    // 4. Generate AndroidManifest template
    const manifestDir = path.join(buildDir, 'android-template');
    fs.mkdirSync(manifestDir, { recursive: true });
    fs.writeFileSync(path.join(manifestDir, 'AndroidManifest.xml'), generateAndroidManifest(app));

    // 5. Build instructions
    fs.writeFileSync(path.join(buildDir, 'BUILD_INSTRUCTIONS.md'), generateBuildInstructions(app));

    // 6. Create downloadable archive
    const outputPath = path.join(OUTPUT_DIR, `${sanitizePackageName(app.slug)}.zip`);

    try {
      execSync(`cd "${buildDir}" && tar -czf "${outputPath}" .`, { timeout: BUILD_TIMEOUT_MS });
    } catch (tarError) {
      logger.warn('apk-builder', 'Tar creation failed, creating placeholder', {
        error: tarError instanceof Error ? tarError.message : 'Unknown',
      });
      fs.writeFileSync(outputPath, JSON.stringify({
        type: 'capacitor-project',
        app: app.appName,
        config: capacitorConfig,
        note: 'See BUILD_INSTRUCTIONS.md for compilation steps',
      }));
    }

    // 7. Store metadata for the download route
    const baseUrl = resolveAppBaseUrl();
    const downloadUrl = `${baseUrl}/api/apps/${app.id}/download-apk`;

    fs.writeFileSync(
      path.join(OUTPUT_DIR, `${app.id}.meta.json`),
      JSON.stringify({ outputPath, appName: app.appName, slug: app.slug, builtAt: new Date().toISOString() }),
    );

    logger.info('apk-builder', 'APK build completed', { appId: app.id, outputPath });
    return { downloadUrl, buildPath: buildDir };
  } catch (error) {
    // Cleanup on failure
    try { fs.rmSync(buildDir, { recursive: true, force: true }); } catch { /* ignore */ }
    throw error;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────

/** Sanitize slug for use as a package / file name */
function sanitizePackageName(slug: string): string {
  return slug.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 60) || 'app';
}

function generateCapacitorConfig(app: AppData) {
  return {
    appId: `com.appnexu.${sanitizePackageName(app.slug)}`,
    appName: app.appName.slice(0, 60),
    webDir: 'www',
    server: { url: app.targetUrl, cleartext: true },
    android: {
      backgroundColor: app.backgroundColor || '#ffffff',
      allowMixedContent: true,
      captureInput: true,
      webContentsDebuggingEnabled: false,
    },
    plugins: {
      SplashScreen: {
        launchShowDuration: 2000,
        backgroundColor: app.backgroundColor || '#ffffff',
        showSpinner: true,
        spinnerColor: app.themeColor || '#178BFF',
      },
      StatusBar: {
        backgroundColor: app.themeColor || '#178BFF',
        style: 'LIGHT',
      },
    },
  };
}

function generateIndexHtml(app: AppData): string {
  // Escape HTML entities to prevent XSS in generated file
  const safeName = escapeHtml(app.appName);
  const safeTheme = escapeHtml(app.themeColor || '#178BFF');
  const safeBg = escapeHtml(app.backgroundColor || '#ffffff');
  const safeUrl = escapeHtml(app.targetUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="${safeTheme}">
  <title>${safeName}</title>
  <style>
    body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: ${safeBg}; font-family: system-ui, sans-serif; }
    .loader { text-align: center; color: ${safeTheme}; }
    .spinner { width: 40px; height: 40px; border: 3px solid #e5e7eb; border-top-color: ${safeTheme}; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="loader">
    <div class="spinner"></div>
    <p>Loading ${safeName}...</p>
  </div>
  <script>window.location.href = ${JSON.stringify(app.targetUrl)};</script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function generateAndroidManifest(app: AppData): string {
  const packageName = `com.appnexu.${sanitizePackageName(app.slug)}`;
  const safeName = escapeHtml(app.appName.slice(0, 60));
  return `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${packageName}">
    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="${safeName}"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="true">
        <activity
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:name=".MainActivity"
            android:label="${safeName}"
            android:theme="@style/AppTheme.NoActionBar"
            android:launchMode="singleTask"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
</manifest>`;
}

function generateBuildInstructions(app: AppData): string {
  return `# Build Instructions for ${app.appName} Android APK

## Prerequisites
- Node.js 18+
- Android Studio with SDK 33+
- Java 17+

## Steps

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Initialize Capacitor Android platform:
   \`\`\`bash
   npx cap add android
   npx cap sync android
   \`\`\`

3. Build the APK:
   \`\`\`bash
   cd android
   ./gradlew assembleRelease
   \`\`\`

4. The APK will be at:
   \`android/app/build/outputs/apk/release/app-release.apk\`

## Configuration
- App Name: ${app.appName}
- Package ID: com.appnexu.${sanitizePackageName(app.slug)}
- Start URL: ${app.targetUrl}
- Theme Color: ${app.themeColor || '#178BFF'}
- Background Color: ${app.backgroundColor || '#ffffff'}

## Notes
- This is a Capacitor-based web wrapper. The app loads your website in a native WebView.
- For production, sign the APK with your own keystore.
- Test on a physical device or emulator before distribution.
`;
}
