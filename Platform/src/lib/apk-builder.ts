import 'server-only';

/**
 * APK Builder — GitHub Actions dispatcher
 *
 * Vercel does NOT compile APKs. Instead, this module triggers a
 * `workflow_dispatch` event on GitHub Actions where a dedicated runner
 * (ubuntu-latest + Java 17 + Android SDK + Capacitor) does the real build.
 *
 * Flow:
 *   1. POST /api/apps/[id]/export-apk  → triggerGitHubActionsApkBuild()
 *   2. GitHub Actions runs build-apk.yml  → builds .apk, uploads to Vercel Blob
 *   3. GitHub Actions POSTs  /api/apk-callback  with READY + blobUrl (or FAILED)
 *   4. GET  /api/apps/[id]/apk-status  → client polls until !BUILDING
 *
 * Required env vars:
 *   GITHUB_ACTIONS_TOKEN    — PAT with  Actions: write  scope
 *   GITHUB_REPO_OWNER       — e.g. "rub-git"
 *   GITHUB_REPO_NAME        — e.g. "appnexu-platform"
 *   APK_BUILD_SECRET        — shared secret for callback auth
 *   NEXTAUTH_URL            — canonical base URL (e.g. https://appnexu.com)
 */

import { logger } from './logger';

// ─── Types ───────────────────────────────────────────────────────────

export interface ApkAppData {
  id: string;
  appName: string;
  shortName: string | null;
  targetUrl: string;
  themeColor: string | null;
  backgroundColor: string | null;
  iconUrls: string;
  slug: string;
}

export interface DispatchResult {
  /** Empty string on dispatch — GitHub does not return run ID synchronously */
  runId: string;
}

export class ApkBuilderNotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApkBuilderNotConfiguredError';
  }
}

// ─── GitHub Actions dispatch ─────────────────────────────────────────

export async function triggerGitHubActionsApkBuild(
  app: ApkAppData,
): Promise<DispatchResult> {
  const token = process.env.GITHUB_ACTIONS_TOKEN;
  const owner = process.env.GITHUB_REPO_OWNER;
  const repo  = process.env.GITHUB_REPO_NAME;
  const secret = process.env.APK_BUILD_SECRET;
  const baseUrl = (process.env.NEXTAUTH_URL ?? 'https://appnexu.com').replace(/\/$/, '');

  if (!token || !owner || !repo || !secret) {
    const missing = [
      !token  && 'GITHUB_ACTIONS_TOKEN',
      !owner  && 'GITHUB_REPO_OWNER',
      !repo   && 'GITHUB_REPO_NAME',
      !secret && 'APK_BUILD_SECRET',
    ].filter(Boolean).join(', ');
    throw new ApkBuilderNotConfiguredError(
      `GitHub Actions APK builder not configured. Missing env vars: ${missing}`,
    );
  }

  const callbackUrl = `${baseUrl}/api/internal/apk-build-complete`;
  const iconUrls = app.iconUrls;

  const dispatchUrl =
    `https://api.github.com/repos/${owner}/${repo}/actions/workflows/build-apk.yml/dispatches`;

  logger.info('apk-builder', 'Dispatching GitHub Actions APK build', {
    appId: app.id,
    slug: app.slug,
    dispatchUrl,
    callbackUrl,
  });

  const res = await fetch(dispatchUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ref: 'main',
      inputs: {
        appId:        app.id,
        appName:      app.appName,
        shortName:    app.shortName ?? app.appName,
        targetUrl:    app.targetUrl,
        themeColor:   app.themeColor  ?? '#667eea',
        bgColor:      app.backgroundColor ?? '#ffffff',
        iconUrls,
        slug:         app.slug,
        callbackUrl,
        buildSecret:  secret,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    logger.error('apk-builder', 'GitHub Actions dispatch failed', {
      status: res.status,
      body,
      appId: app.id,
    });
    throw new Error(`GitHub Actions dispatch failed (HTTP ${res.status}): ${body}`);
  }

  // GitHub returns 204 No Content on success — run ID arrives via callback.
  logger.info('apk-builder', 'GitHub Actions workflow dispatched', { appId: app.id });
  return { runId: '' };
}

