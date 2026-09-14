const URL_LIKE = /^(https?:\/\/|ftp:\/\/|www\.)/i;

export function isProbablyUrl(value) {
  const text = value.trim();
  if (!text) return false;
  if (URL_LIKE.test(text)) return true;
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(text)) return true;
  return false;
}

export function normalizeUrl(value) {
  let text = value.trim();

  if (!text) return null;

  // Decode common search-engine redirect values.
  try {
    const parsed = new URL(text);
    for (const key of ["uddg", "url", "u", "target", "dest", "destination"]) {
      const candidate = parsed.searchParams.get(key);
      if (candidate && /^https?:\/\//i.test(candidate)) {
        text = candidate;
        break;
      }
    }
  } catch {
    // Not a full URL yet.
  }

  if (/^\/\//.test(text)) text = `https:${text}`;
  if (/^www\./i.test(text)) text = `https://${text}`;
  if (!/^https?:\/\//i.test(text) && !/^ftp:\/\//i.test(text)) {
    text = `https://${text}`;
  }

  return text;
}

export function openRealWebsite(value, target = "_self") {
  const url = normalizeUrl(value);
  if (!url) return false;
  window.open(url, target, "noopener,noreferrer");
  return true;
}

export function searchOrNavigate(value) {
  const text = value.trim();
  if (!text) return { type: "empty" };

  if (isProbablyUrl(text)) {
    return { type: "url", value: normalizeUrl(text) };
  }

  return { type: "search", value: text };
}
