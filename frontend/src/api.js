const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:8000";


async function request(path, options = {}) {

  const response = await fetch(
    `${API_URL}${path}`,
    {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },

      ...options,
    }
  );


  if (!response.ok) {

    let message =
      `Request failed: ${response.status}`;

    try {

      const data =
        await response.json();

      message =
        data.detail ||
        data.message ||
        message;

    } catch {}

    throw new Error(message);
  }


  return response.json();
}


export async function searchWeb(query) {

  return request(
    `/api/search?q=${encodeURIComponent(query)}`
  );
}


export async function resolveUrl(url) {

  return request(
    `/api/resolve?url=${encodeURIComponent(url)}`
  );
}


/*
------------------------------------------------------------
CHATGPT ONLY
------------------------------------------------------------
No Groq.
No Gemini.
No Claude.
No provider selector.
------------------------------------------------------------
*/

export async function aiChat({
  messages,
  temperature = 0.7,
}) {

  return request(
    "/api/ai/chat",
    {
      method: "POST",

      body: JSON.stringify({
        messages,
        temperature,
      }),
    }
  );
}