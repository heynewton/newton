"use client";

import Script from "next/script";
import { useState } from "react";

interface PickerDocument {
  id: string;
  name: string;
}

interface GoogleAccessToken {
  access_token?: string;
  error?: string;
}

interface GoogleWindow extends Window {
  gapi?: { load(name: string, callback: () => void): void };
  google?: {
    accounts: {
      oauth2: {
        initTokenClient(options: {
          client_id: string;
          scope: string;
          callback: (token: GoogleAccessToken) => void;
          error_callback: () => void;
        }): { requestAccessToken(): void };
      };
    };
    picker: {
      Action: { PICKED: string; CANCEL: string };
      DocsView: new (viewId: string) => {
        setIncludeFolders(value: boolean): unknown;
        setSelectFolderEnabled(value: boolean): unknown;
        setMimeTypes(value: string): unknown;
      };
      PickerBuilder: new () => {
        setDeveloperKey(value: string): unknown;
        setOAuthToken(value: string): unknown;
        addView(value: unknown): unknown;
        setCallback(value: (data: { action: string; docs?: PickerDocument[] }) => void): unknown;
        build(): { setVisible(value: boolean): void };
      };
      ViewId: { FOLDERS: string };
    };
  };
}

interface ImportSummary {
  imported: number;
  alreadyImported: number;
  indexed: number;
  retried: number;
  skipped: { name: string; reason: string }[];
  failed: { name: string; reason: string }[];
}

const button =
  "flex min-h-11 w-fit items-center rounded-full border border-black/15 px-5 font-medium hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10";

export function DriveImport({ boatId }: { boatId: string }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const pickerKey = process.env.NEXT_PUBLIC_GOOGLE_PICKER_API_KEY;
  const [pickerReady, setPickerReady] = useState(false);
  const [identityReady, setIdentityReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  if (!clientId || !pickerKey) return null;
  const configuredClientId = clientId;
  const configuredPickerKey = pickerKey;

  function openPicker(accessToken: string) {
    const google = (window as GoogleWindow).google;
    if (!google) {
      setError("Google Drive picker is unavailable. Reload the page and try again.");
      setBusy(false);
      return;
    }
    const folders = new google.picker.DocsView(google.picker.ViewId.FOLDERS);
    folders.setIncludeFolders(true);
    folders.setSelectFolderEnabled(true);
    folders.setMimeTypes("application/vnd.google-apps.folder");
    const builder = new google.picker.PickerBuilder();
    builder.setDeveloperKey(configuredPickerKey);
    builder.setOAuthToken(accessToken);
    builder.addView(folders);
    builder.setCallback((data) => {
      if (data.action === google.picker.Action.CANCEL) setBusy(false);
      if (data.action !== google.picker.Action.PICKED || !data.docs?.[0]) return;
      void importFolder(data.docs[0].id, accessToken);
    });
    builder.build().setVisible(true);
  }

  function authorizeAndPick() {
    const google = (window as GoogleWindow).google;
    if (!google) {
      setError("Google Drive picker is unavailable. Reload the page and try again.");
      setBusy(false);
      return;
    }
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: configuredClientId,
      scope: "https://www.googleapis.com/auth/drive.readonly",
      callback: (token) => {
        if (!token.access_token) {
          setError("Google did not grant Drive access. Try again and approve the requested access.");
          setBusy(false);
          return;
        }
        openPicker(token.access_token);
      },
      error_callback: () => {
        setError("Google sign-in was cancelled or failed.");
        setBusy(false);
      },
    });
    tokenClient.requestAccessToken();
  }

  async function importFolder(folderId: string, accessToken: string) {
    try {
      const response = await fetch("/api/drive-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boatId, folderId, accessToken }),
      });
      const result = (await response.json()) as ImportSummary & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "The folder could not be imported.");
      setSummary(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The folder could not be imported.");
    } finally {
      setBusy(false);
    }
  }

  function startImport() {
    setError(null);
    setSummary(null);
    setBusy(true);
    authorizeAndPick();
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setIdentityReady(true)}
        onError={() => setError("Google sign-in could not be loaded.")}
      />
      <Script
        src="https://apis.google.com/js/api.js"
        strategy="afterInteractive"
        onLoad={() => (window as GoogleWindow).gapi?.load("picker", () => setPickerReady(true))}
        onError={() => setError("Google Drive picker could not be loaded.")}
      />
      <p className="text-zinc-700 dark:text-zinc-300">
        Import a Google Drive folder once. Newton reads supported files to file records and learn from manuals, then
        discards the original file bytes. Extracted manual passages and source details remain with the boat. Each run
        handles up to 100 files (100 MiB total); run it again for any remaining files.
      </p>
      <button
        type="button"
        className={button}
        onClick={startImport}
        disabled={busy || !identityReady || !pickerReady}
      >
        {busy ? "Importing from Google Drive…" : "Import from Google Drive"}
      </button>
      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
      {summary && (
        <div role="status" className="flex flex-col gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <p>
            Imported {summary.imported}; already imported {summary.alreadyImported}; retried {summary.retried}; manuals indexed {summary.indexed}; skipped {summary.skipped.length};
            failed {summary.failed.length}.
          </p>
          {[...summary.skipped, ...summary.failed].map((item, index) => (
            <p key={`${item.name}:${index}`}>
              {item.name}: {item.reason}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
