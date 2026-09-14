// ============================================================
// VK BROWSER - API CLIENT
// ============================================================
// Frontend:
// https://vk-browser-1.vercel.app/
//
// Backend API:
// https://vk-browser.vercel.app/
//
// This file connects the React/Vite frontend to the FastAPI
// backend.
//
// ChatGPT/OpenAI API keys are NEVER stored in this frontend.
// The OpenAI key stays securely on the backend.
// ============================================================


// ============================================================
// API BASE URL
// ============================================================

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  "https://vk-browser.vercel.app"
).replace(/\/$/, "");


// ============================================================
// ERROR READER
// ============================================================

async function readError(response, fallback) {
  try {
    const data = await response.json();

    return (
      data?.detail ||
      data?.message ||
      data?.error ||
      fallback
    );
  } catch {
    return fallback;
  }
}


// ============================================================
// GET API BASE URL
// ============================================================

export function getApiBase() {
  return API_BASE;
}


// ============================================================
// SEARCH WEB
// ============================================================
// Backend endpoint:
// GET /api/search?q=
//
// Example:
// searchWeb("youtube")
// searchWeb("latest technology news")
//
// Returns the JSON response from FastAPI.
// ============================================================

export async function searchWeb(query) {
  const value = String(query || "").trim();

  if (!value) {
    throw new Error("Search query is empty");
  }

  const response = await fetch(
    `${API_BASE}/api/search?q=${encodeURIComponent(value)}`,
    {
      method: "GET",

      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      await readError(
        response,
        `Search failed (${response.status})`
      )
    );
  }

  return response.json();
}


// ============================================================
// RESOLVE URL
// ============================================================
// Backend endpoint:
// GET /api/resolve?url=
//
// Used when the user enters a website address or search-like
// URL in the browser/search bar.
//
// Example:
// resolveUrl("github.com")
// resolveUrl("https://youtube.com")
// ============================================================

export async function resolveUrl(value) {
  const input = String(value || "").trim();

  if (!input) {
    throw new Error("URL is empty");
  }

  const response = await fetch(
    `${API_BASE}/api/resolve?url=${encodeURIComponent(input)}`,
    {
      method: "GET",

      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      await readError(
        response,
        `URL resolution failed (${response.status})`
      )
    );
  }

  return response.json();
}


// ============================================================
// HEALTH CHECK
// ============================================================
// Backend endpoint:
// GET /health
//
// Used to check whether the VK Browser backend is running.
// ============================================================

export async function health() {
  const response = await fetch(
    `${API_BASE}/health`,
    {
      method: "GET",

      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      await readError(
        response,
        `Health check failed (${response.status})`
      )
    );
  }

  return response.json();
}


// ============================================================
// AI STATUS
// ============================================================
// Backend endpoint:
// GET /api/ai/status
//
// Used by the frontend to determine whether the ChatGPT
// backend is available.
//
// The OpenAI API key is NOT sent to this function.
// ============================================================

export async function aiStatus() {
  const response = await fetch(
    `${API_BASE}/api/ai/status`,
    {
      method: "GET",

      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      await readError(
        response,
        `AI status failed (${response.status})`
      )
    );
  }

  return response.json();
}


// ============================================================
// CHATGPT / AI CHAT
// ============================================================
// Backend endpoint:
// POST /api/ai/chat
//
// IMPORTANT:
// The OpenAI API key stays on the FastAPI backend.
//
// Frontend sends only:
// {
//   messages: [...],
//   temperature: 0.7
// }
//
// Example:
//
// const result = await aiChat({
//   messages: [
//     {
//       role: "user",
//       content: "Hello"
//     }
//   ]
// });
//
// The backend handles the actual OpenAI request.
// ============================================================

export async function aiChat({
  messages,
  temperature = 0.7,
}) {
  const safeMessages = Array.isArray(messages)
    ? messages
    : [];

  const response = await fetch(
    `${API_BASE}/api/ai/chat`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },

      body: JSON.stringify({
        messages: safeMessages,
        temperature,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      await readError(
        response,
        `ChatGPT request failed (${response.status})`
      )
    );
  }

  return response.json();
}


// ============================================================
// OPTIONAL DEFAULT EXPORT
// ============================================================
// This makes it possible to import the API client as:
//
// import api from "./api";
//
// while the named exports above continue to work:
//
// import { searchWeb, aiChat } from "./api";
// ============================================================

const api = {
  getApiBase,
  searchWeb,
  resolveUrl,
  health,
  aiStatus,
  aiChat,
};

export default api;
