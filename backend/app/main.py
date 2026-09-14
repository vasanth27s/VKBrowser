import os
from urllib.parse import parse_qs, quote_plus, unquote, urlparse

import httpx
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pydantic import BaseModel, Field

# ============================================================
# ENVIRONMENT
# ============================================================

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()

# OpenAI model used by VK Browser AI
OPENAI_MODEL = os.getenv(
    "OPENAI_MODEL",
    "gpt-5.6-sol",
).strip()

# CORS
CORS_ORIGINS = [
    x.strip()
    for x in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173",
    ).split(",")
    if x.strip()
]

# System prompt for the built-in VK Browser AI
VK_AI_SYSTEM_PROMPT = os.getenv(
    "VK_AI_SYSTEM_PROMPT",
    (
        "You are VK Browser AI, the built-in ChatGPT assistant "
        "inside VK Browser. Give accurate, useful, direct answers. "
        "Help the user with coding, browsing, research, writing, "
        "learning, troubleshooting, and general questions. "
        "Use clear formatting and practical steps when appropriate."
    ),
).strip()


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="VK Browser API",
    version="3.0.0",
    description=(
        "VK Browser backend with web search, URL resolution, "
        "and ChatGPT/OpenAI AI."
    ),
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS + [
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# OPENAI CLIENT
# ============================================================

def get_openai_client() -> OpenAI:
    """
    Create the OpenAI client only when an AI request is made.
    This prevents the backend from crashing at startup if the
    API key has not yet been configured.
    """

    if not OPENAI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail=(
                "OPENAI_API_KEY is not configured. "
                "Add your OpenAI API key to the backend .env file."
            ),
        )

    return OpenAI(api_key=OPENAI_API_KEY)


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():
    return {
        "name": "VK Browser API",
        "status": "running",
        "version": "3.0.0",
        "ai": {
            "provider": "OpenAI",
            "model": OPENAI_MODEL,
        },
        "features": [
            "web_search",
            "url_resolution",
            "chatgpt_ai",
        ],
    }


# ============================================================
# HEALTH
# ============================================================

@app.get("/health")
def health():
    return {
        "ok": True,
        "service": "VK Browser API",
        "openai_configured": bool(OPENAI_API_KEY),
        "model": OPENAI_MODEL,
    }


# ============================================================
# URL HELPERS
# ============================================================

def clean_result_url(value: str) -> str:
    """
    Clean and normalize a URL.
    """

    value = unquote(value or "").strip()

    if not value:
        return ""

    # Protocol-relative URL
    if value.startswith("//"):
        return "https:" + value

    # Normal URL
    if value.startswith("http://") or value.startswith("https://"):
        return value

    # www.example.com
    if value.startswith("www."):
        return "https://" + value

    return value


def resolve_redirect(value: str) -> str:
    """
    Resolve common search-engine redirect URLs.

    Handles parameters such as:
        uddg
        url
        u
        target
        dest
        destination
    """

    value = unquote(value or "").strip()

    if not value:
        return ""

    try:
        parsed = urlparse(value)
        params = parse_qs(parsed.query)

        for key in (
            "uddg",
            "url",
            "u",
            "target",
            "dest",
            "destination",
        ):
            candidates = params.get(key, [])

            if not candidates:
                continue

            candidate = unquote(
                candidates[0]
            ).strip()

            if candidate.startswith(
                ("http://", "https://")
            ):
                return candidate

    except Exception:
        pass

    return clean_result_url(value)


# ============================================================
# URL RESOLUTION API
# ============================================================

@app.get("/api/resolve")
async def resolve(
    url: str = Query(
        ...,
        min_length=1,
        max_length=5000,
    )
):
    """
    Convert a URL/search redirect into the real destination URL.
    """

    resolved = resolve_redirect(url)

    if not resolved.startswith(
        ("http://", "https://")
    ):
        raise HTTPException(
            status_code=400,
            detail="Not a valid web URL",
        )

    return {
        "url": resolved,
    }


# ============================================================
# WEB SEARCH
# ============================================================

@app.get("/api/search")
async def search(
    q: str = Query(
        ...,
        min_length=1,
        max_length=500,
    )
):
    """
    Search the web using DuckDuckGo HTML results.
    """

    query = q.strip()

    if not query:
        raise HTTPException(
            status_code=400,
            detail="Search query cannot be empty.",
        )

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 "
            "(KHTML, like Gecko) "
            "Chrome/140.0 Safari/537.36"
        ),
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml",
    }

    search_url = "https://html.duckduckgo.com/html/"

    try:
        async with httpx.AsyncClient(
            timeout=15,
            follow_redirects=True,
            headers=headers,
        ) as client:

            response = await client.get(
                search_url,
                params={
                    "q": query,
                },
            )

            response.raise_for_status()

        soup = BeautifulSoup(
            response.text,
            "html.parser",
        )

        results = []

        for item in soup.select(".result"):

            link = item.select_one(
                ".result__a"
            )

            snippet = item.select_one(
                ".result__snippet"
            )

            if not link:
                continue

            href = link.get(
                "href",
                "",
            ).strip()

            href = resolve_redirect(href)

            if not href.startswith(
                ("http://", "https://")
            ):
                continue

            title = link.get_text(
                " ",
                strip=True,
            )

            description = (
                snippet.get_text(
                    " ",
                    strip=True,
                )
                if snippet
                else ""
            )

            parsed = urlparse(href)

            results.append(
                {
                    "title": title,
                    "url": href,
                    "display_url": parsed.netloc,
                    "description": description,
                }
            )

            if len(results) >= 30:
                break

        return {
            "query": query,
            "provider": "DuckDuckGo HTML",
            "count": len(results),
            "results": results,
        }

    except Exception as exc:

        # Safe fallback URL
        fallback_url = (
            "https://duckduckgo.com/?q="
            + quote_plus(query)
        )

        return {
            "query": query,
            "provider": "fallback",
            "count": 1,
            "results": [
                {
                    "title": (
                        f"Search the web for: {query}"
                    ),
                    "url": fallback_url,
                    "display_url": "duckduckgo.com",
                    "description": (
                        "The search provider could not "
                        "be reached. Open DuckDuckGo "
                        "directly."
                    ),
                }
            ],
            "error": str(exc),
        }


# ============================================================
# CHATGPT / OPENAI MODELS
# ============================================================

class ChatMessage(BaseModel):
    """
    One message in the ChatGPT conversation.
    """

    role: str = Field(
        ...,
        description=(
            "Message role: user or assistant."
        ),
    )

    content: str = Field(
        ...,
        min_length=1,
        max_length=50000,
    )


class AIChatRequest(BaseModel):
    """
    Request body for the built-in VK Browser AI.
    """

    messages: list[ChatMessage] = Field(
        ...,
        min_length=1,
        max_length=80,
    )

    temperature: float = Field(
        default=0.7,
        ge=0.0,
        le=2.0,
    )


# ============================================================
# AI MESSAGE VALIDATION
# ============================================================

def prepare_ai_messages(
    messages: list[ChatMessage],
) -> list[dict]:
    """
    Convert frontend messages into the format expected
    by the OpenAI Responses API.

    System messages from the browser are ignored so that
    the browser cannot override the server-side AI rules.
    """

    prepared = []

    for message in messages:

        role = message.role.strip().lower()

        # Only allow user and assistant messages from frontend.
        if role not in ("user", "assistant"):
            continue

        content = message.content.strip()

        if not content:
            continue

        prepared.append(
            {
                "role": role,
                "content": content,
            }
        )

    return prepared


# ============================================================
# CHATGPT API
# ============================================================

@app.post("/api/ai/chat")
async def ai_chat(
    payload: AIChatRequest,
):
    """
    Send the conversation to OpenAI and return the
    ChatGPT response.

    The OpenAI API key NEVER goes to the browser.
    """

    messages = prepare_ai_messages(
        payload.messages
    )

    if not messages:
        raise HTTPException(
            status_code=400,
            detail="No valid user/assistant messages were provided.",
        )

    client = get_openai_client()

    # Server-controlled system instruction.
    input_messages = [
        {
            "role": "system",
            "content": VK_AI_SYSTEM_PROMPT,
        }
    ]

    input_messages.extend(messages)

    try:

        response = client.responses.create(
            model=OPENAI_MODEL,
            input=input_messages,
            temperature=payload.temperature,
        )

        answer = (
            getattr(
                response,
                "output_text",
                None,
            )
            or ""
        ).strip()

        if not answer:
            answer = (
                "I received an empty response from "
                "the AI service. Please try again."
            )

        return {
            "ok": True,
            "provider": "OpenAI",
            "model": OPENAI_MODEL,
            "message": answer,
            "response_id": getattr(
                response,
                "id",
                None,
            ),
        }

    except Exception as exc:

        error_message = str(exc)

        # Do not expose API secrets.
        if OPENAI_API_KEY:
            error_message = error_message.replace(
                OPENAI_API_KEY,
                "[REDACTED]",
            )

        raise HTTPException(
            status_code=502,
            detail=(
                "OpenAI request failed: "
                + error_message
            ),
        )


# ============================================================
# AI STATUS
# ============================================================

@app.get("/api/ai/status")
def ai_status():
    """
    Frontend can use this endpoint to determine whether
    ChatGPT has been configured.
    """

    return {
        "available": bool(OPENAI_API_KEY),
        "provider": "OpenAI",
        "model": OPENAI_MODEL,
        "assistant_name": "VK Browser AI",
    }


# ============================================================
# DIRECT WEBSITE CHECK
# ============================================================

@app.get("/api/check-url")
async def check_url(
    url: str = Query(
        ...,
        min_length=1,
        max_length=5000,
    )
):
    """
    Check whether a URL can be reached.

    This does NOT proxy the website into the browser.
    It only checks the HTTP response.
    """

    resolved = resolve_redirect(url)

    if not resolved.startswith(
        ("http://", "https://")
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid URL.",
        )

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 "
            "(KHTML, like Gecko) "
            "Chrome/140.0 Safari/537.36"
        )
    }

    try:

        async with httpx.AsyncClient(
            timeout=15,
            follow_redirects=True,
            headers=headers,
        ) as client:

            response = await client.head(
                resolved,
            )

            # Some websites don't support HEAD.
            if response.status_code >= 400:
                response = await client.get(
                    resolved,
                    follow_redirects=True,
                )

        return {
            "ok": response.status_code < 400,
            "status_code": response.status_code,
            "url": str(response.url),
            "content_type": response.headers.get(
                "content-type",
                "",
            ),
        }

    except Exception as exc:

        return {
            "ok": False,
            "status_code": None,
            "url": resolved,
            "content_type": "",
            "error": str(exc),
        }


# ============================================================
# STARTUP INFORMATION
# ============================================================

@app.on_event("startup")
async def startup_event():
    """
    Print useful startup information in the terminal.
    """

    print("")
    print("=" * 60)
    print("VK BROWSER API")
    print("=" * 60)
    print("Status        : RUNNING")
    print("OpenAI        : CONFIGURED" if OPENAI_API_KEY else "OpenAI        : NOT CONFIGURED")
    print(f"AI Model      : {OPENAI_MODEL}")
    print("Search        : DuckDuckGo HTML")
    print("URL Resolver  : ENABLED")
    print("=" * 60)
    print("")


# ============================================================
# LOCAL DEVELOPMENT
# ============================================================

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(
            os.getenv(
                "PORT",
                "8000",
            )
        ),
        reload=True,
    )
