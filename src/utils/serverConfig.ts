/**
 * What the server can add beyond the phone: Gemini (a second opinion on receipts the phone is unsure of)
 * and Google Places (venue rating and reviews). Asked once per session; if the server can't be reached,
 * both are "no" for now and it is asked again next time.
 */
interface ServerConfig {
  ai: boolean;
  places: boolean;
}

let check: Promise<ServerConfig> | null = null;

function serverConfig(): Promise<ServerConfig> {
  if (!check) {
    check = fetch('/api/config')
      .then((r) => (r.ok ? r.json() : {}))
      .then((d: any) => ({ ai: Boolean(d?.ai), places: Boolean(d?.places) }))
      .catch(() => {
        check = null;
        return { ai: false, places: false };
      });
  }
  return check;
}

export const cloudAiAvailable = () => serverConfig().then((c) => c.ai);
export const venueLookupAvailable = () => serverConfig().then((c) => c.places);
