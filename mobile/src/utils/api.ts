import Constants from 'expo-constants';

const BACKEND_PORT = 8080;
const TIMEOUT_MS = 15000;

/**
 * Where the backend is. EXPO_PUBLIC_API_URL wins once it's hosted; until then, in
 * development, it's the laptop serving this app -- Expo already knows that address,
 * so it keeps working when the Wi-Fi (and the laptop's IP) changes.
 */
export function apiUrl(): string | null {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (configured) return configured;
  const devHost = Constants.expoConfig?.hostUri?.split(':')[0];
  return devHost ? `http://${devHost}:${BACKEND_PORT}` : null;
}

export type UploadResult =
  | { ok: true }
  /** `offline`: never reached the server, so trying again later should work */
  | { ok: false; reason: 'offline' | 'rejected' | 'server' };

/**
 * Sends a finished round. 201 (saved) and 200 (the server already had this
 * clientId, from a retry) both mean it's safely on the server.
 */
export async function uploadRound(body: unknown, baseUrl = apiUrl()): Promise<UploadResult> {
  if (!baseUrl) return { ok: false, reason: 'offline' };
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl}/api/v1/rounds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: abort.signal,
    });
    if (res.ok) return { ok: true };
    return { ok: false, reason: res.status >= 500 ? 'server' : 'rejected' };
  } catch {
    return { ok: false, reason: 'offline' };
  } finally {
    clearTimeout(timer);
  }
}
