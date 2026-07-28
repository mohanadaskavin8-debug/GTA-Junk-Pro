import { Router, type IRouter } from "express";

const router: IRouter = Router();

interface NominatimResult {
  display_name: string;
  address?: {
    house_number?: string;
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    postcode?: string;
  };
}

interface AddressSuggestion {
  streetAddress: string;
  city: string;
  postalCode: string;
}

// --- 24h in-memory cache: address queries repeat heavily while users type ---
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;
const cache = new Map<string, { expires: number; data: AddressSuggestion[] }>();

function cacheGet(key: string): AddressSuggestion[] | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expires < Date.now()) {
    cache.delete(key);
    return null;
  }
  return hit.data;
}

function cacheSet(key: string, data: AddressSuggestion[]): void {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    // Evict the oldest insertion (Map preserves insertion order).
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { expires: Date.now() + CACHE_TTL_MS, data });
}

// --- Global throttle: Nominatim's usage policy allows at most 1 request/second,
// so upstream calls are serialized with a minimum gap regardless of user count. ---
const MIN_UPSTREAM_GAP_MS = 1100;
let upstreamChain: Promise<unknown> = Promise.resolve();
let lastUpstreamAt = 0;

function throttledNominatim(query: string): Promise<AddressSuggestion[]> {
  const run = upstreamChain.then(async () => {
    const wait = lastUpstreamAt + MIN_UPSTREAM_GAP_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastUpstreamAt = Date.now();
    return fetchNominatim(query);
  });
  // Keep the chain alive even when a fetch fails.
  upstreamChain = run.catch(() => undefined);
  return run;
}

async function fetchNominatim(query: string): Promise<AddressSuggestion[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", `${query}, Ontario, Canada`);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("countrycodes", "ca");
  url.searchParams.set("limit", "6");

  const resp = await fetch(url, {
    headers: {
      // Nominatim's usage policy requires an identifying User-Agent with contact info.
      "User-Agent": "PieceOfCakeJunkRemoval/1.0 (booking site; info@pieceofcakejunk.com)",
      "Accept-Language": "en",
    },
    signal: AbortSignal.timeout(5000),
  });
  if (!resp.ok) throw new Error(`Nominatim responded ${resp.status}`);
  const data = (await resp.json()) as NominatimResult[];

  const parsed = data
    .map((r) => {
      const a = r.address ?? {};
      const streetAddress = [a.house_number, a.road].filter(Boolean).join(" ");
      const city = a.city || a.town || a.village || a.suburb || a.county || "";
      const postalCode = (a.postcode ?? "").toUpperCase();
      return { streetAddress, city, postalCode };
    })
    .filter((s) => s.streetAddress.length > 0);

  // Dedupe by street address.
  const seen = new Set<string>();
  const unique = parsed.filter((s) => {
    if (seen.has(s.streetAddress)) return false;
    seen.add(s.streetAddress);
    return true;
  });
  return unique.slice(0, 5);
}

router.get("/geo/search", async (req, res): Promise<void> => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!q) {
    res.status(400).json({ error: "q query parameter is required" });
    return;
  }
  if (q.length < 4) {
    res.json([]);
    return;
  }

  const key = q.toLowerCase();
  const cached = cacheGet(key);
  if (cached) {
    res.json(cached);
    return;
  }

  try {
    const suggestions = await throttledNominatim(q);
    cacheSet(key, suggestions);
    res.json(suggestions);
  } catch (err) {
    // The autocomplete degrades to a plain input client-side; log loudly here
    // instead of failing the request.
    req.log.warn({ err }, "Address search upstream failed");
    res.json([]);
  }
});

export default router;
