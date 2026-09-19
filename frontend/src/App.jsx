import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import vkLogo from "../image.png";

import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronDown,
  Clock3,
  Download,
  ExternalLink,
  FileImage,
  Globe,
  Home,
  Image as ImageIcon,
  Keyboard,
  LayoutGrid,
  Lock,
  Menu,
  MessageCircle,
  Mic,
  Monitor,
  Moon,
  MoreHorizontal,
  Palette,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Smartphone,
  Sun,
  Tablet,
  Trash2,
  Upload,
  User,
  Wallpaper,
  X,
  Zap,
} from "lucide-react";

import {
  searchWeb,
  resolveUrl,
} from "./api";

import {
  isProbablyUrl,
  normalizeUrl,
  searchOrNavigate,
} from "./url";

import {
  load,
  save,
} from "./storage";


/* ============================================================
   CONSTANTS
   ============================================================ */

const DEFAULT_ENGINE = "DuckDuckGo";


const DEFAULT_WALLPAPER =
  "linear-gradient(135deg,#05070d 0%,#090d18 50%,#05070d 100%)";


const QUICK_SITES = [
  {
    name: "YouTube",
    url: "https://www.youtube.com",
    letter: "Y",
    iconUrl: "https://cdn.simpleicons.org/youtube/ff0000",
  },
  {
    name: "GitHub",
    url: "https://github.com",
    letter: "G",
    iconUrl: "https://cdn.simpleicons.org/github/ffffff",
  },
  {
    name: "Google",
    url: "https://www.google.com",
    letter: "G",
    iconUrl: "https://cdn.simpleicons.org/google/4285f4",
  },
  {
    name: "Gmail",
    url: "https://mail.google.com",
    letter: "M",
    iconUrl: "https://cdn.simpleicons.org/gmail/ea4335",
  },
  {
    name: "Netflix",
    url: "https://www.netflix.com",
    letter: "N",
    iconUrl: "https://cdn.simpleicons.org/netflix/e50914",
  },
  {
    name: "LinkedIn",
    url: "https://www.linkedin.com",
    letter: "in",
  },
  {
    name: "Instagram",
    url: "https://www.instagram.com",
    letter: "IG",
    iconUrl: "https://cdn.simpleicons.org/instagram/e4405f",
  },
];


const FUTURE_FEATURES = [
  {
    title: "Smart Ad Blocking",
    description:
      "Reduce common advertising and tracking destinations while you browse.",
    icon: ShieldCheck,
  },
  {
    title: "Private by Design",
    description:
      "Privacy controls stay visible instead of being hidden inside menus.",
    icon: ShieldCheck,
  },
  {
    title: "Adaptive UI",
    description:
      "The interface automatically adapts from phone to ultra-wide display.",
    icon: LayoutGrid,
  },
  {
    title: "Personal Space",
    description:
      "Wallpaper, widgets, bookmarks and security preferences stay on your browser.",
    icon: Palette,
  },
];


const INITIAL_TAB = {
  id: crypto.randomUUID(),
  title: "VK Browser",
  url: "",
  kind: "home",
};


/* ============================================================
   MAIN APP
   ============================================================ */

export default function App() {
  /* ----------------------------------------------------------
     Browser
     ---------------------------------------------------------- */

  const [tabs, setTabs] = useState(() =>
    load("tabs", [INITIAL_TAB])
  );

  const [activeId, setActiveId] = useState(() =>
    load("activeId", tabsSafeId())
  );

  const [address, setAddress] = useState("");

  const [query, setQuery] = useState("");

  const [results, setResults] = useState([]);

  const [searching, setSearching] = useState(false);

  const [page, setPageState] = useState("home");

  const [sidebar, setSidebar] = useState(true);

  const [mobileMenu, setMobileMenu] = useState(false);

  const [bookmarks, setBookmarks] = useState(() =>
    load("bookmarks", [])
  );

  const [history, setHistory] = useState(() =>
    load("history", [])
  );

  const [downloads] = useState(() =>
    load("downloads", [])
  );

  const [shields, setShields] = useState(() =>
    load("shields", true)
  );

  const [engine, setEngine] = useState(() =>
    load("engine", DEFAULT_ENGINE)
  );

  /* ----------------------------------------------------------
     Appearance
     ---------------------------------------------------------- */

  const [theme, setTheme] = useState(() =>
    load("theme", "midnight")
  );

  const [wallpaper, setWallpaper] = useState(() =>
    load("wallpaper", "")
  );

  const [wallpaperName, setWallpaperName] = useState(() =>
    load("wallpaperName", "")
  );

  const [wallpaperOpacity, setWallpaperOpacity] = useState(() =>
    Number(load("wallpaperOpacity", 0.72))
  );

  /* ----------------------------------------------------------
     SECURITY
     ---------------------------------------------------------- */

  const [adBlocker, setAdBlocker] = useState(() =>
    load("adBlocker", true)
  );

  const [vpnConnected, setVpnConnected] = useState(() =>
    load("vpnConnected", false)
  );

  const [blockedAds, setBlockedAds] = useState(() =>
    Number(load("blockedAds", 0))
  );

  /* ----------------------------------------------------------
     UI
     ---------------------------------------------------------- */

  const [toast, setToast] = useState(null);

  const [commandOpen, setCommandOpen] = useState(false);

  const [commandQuery, setCommandQuery] = useState("");

  const [profileOpen, setProfileOpen] = useState(false);

  const addressInputRef = useRef(null);

  const wallpaperInputRef = useRef(null);

  /* ==========================================================
     SPA PAGE HISTORY / BROWSER ARROWS
     ========================================================== */

  function setPage(nextPage, options = {}) {
    const resolvedPage =
      typeof nextPage === "function"
        ? nextPage(page)
        : nextPage;

    if (!resolvedPage) return;

    setPageState(resolvedPage);

    if (options.fromHistory) return;

    const currentState = window.history.state;
    const currentIndex =
      currentState?.vkBrowser
        ? Number(currentState.vkIndex || 0)
        : 0;

    const nextIndex = currentIndex + 1;

    window.history.pushState(
      {
        ...(currentState || {}),
        vkBrowser: true,
        vkIndex: nextIndex,
        vkPage: resolvedPage,
      },
      "",
      window.location.href
    );
  }

  function goBack() {
    const state = window.history.state;

    if (state?.vkBrowser && Number(state.vkIndex || 0) > 0) {
      window.history.back();
      return;
    }

    showToast("No previous VK Browser page", "info");
  }

  function goForward() {
    const state = window.history.state;

    if (state?.vkBrowser) {
      // A real forward entry exists only when the browser has one.
      // Calling forward here is safe; popstate will restore the page.
      window.history.forward();
      return;
    }

    showToast("No next VK Browser page", "info");
  }

  useEffect(() => {
    const current = window.history.state;

    if (!current?.vkBrowser) {
      window.history.replaceState(
        {
          ...(current || {}),
          vkBrowser: true,
          vkIndex: 0,
          vkPage: page,
        },
        "",
        window.location.href
      );
    }

    function handleBrowserPopState(event) {
      const state = event.state;

      if (state?.vkBrowser && state.vkPage) {
        setPageState(state.vkPage);
        setMobileMenu(false);
        setCommandOpen(false);
        setProfileOpen(false);
        setAiMenuOpen(false);
      }
    }

    window.addEventListener("popstate", handleBrowserPopState);

    return () =>
      window.removeEventListener("popstate", handleBrowserPopState);
  }, []);


  /* ==========================================================
     ACTIVE TAB
     ========================================================== */

  const activeTab = useMemo(() => {
    return (
      tabs.find((tab) => tab.id === activeId) ||
      tabs[0]
    );
  }, [tabs, activeId]);


  /* ==========================================================
     PERSISTENCE
     ========================================================== */

  useEffect(() => {
    save("tabs", tabs);
  }, [tabs]);

  useEffect(() => {
    save("activeId", activeId);
  }, [activeId]);

  useEffect(() => {
    save("bookmarks", bookmarks);
  }, [bookmarks]);

  useEffect(() => {
    save("history", history);
  }, [history]);

  useEffect(() => {
    save("shields", shields);
  }, [shields]);

  useEffect(() => {
    save("engine", engine);
  }, [engine]);

  useEffect(() => {
    save("theme", theme);
  }, [theme]);

  useEffect(() => {
    save("wallpaper", wallpaper);
  }, [wallpaper]);

  useEffect(() => {
    save("wallpaperName", wallpaperName);
  }, [wallpaperName]);

  useEffect(() => {
    save("wallpaperOpacity", wallpaperOpacity);
  }, [wallpaperOpacity]);

  useEffect(() => {
    save("adBlocker", adBlocker);
  }, [adBlocker]);

  useEffect(() => {
    save("vpnConnected", vpnConnected);
  }, [vpnConnected]);

  useEffect(() => {
    save("blockedAds", blockedAds);
  }, [blockedAds]);


  /* ==========================================================
     ADDRESS
     ========================================================== */

  useEffect(() => {
    setAddress(activeTab?.url || "");
  }, [activeTab?.id]);


  /* ==========================================================
     KEYBOARD SHORTCUTS
     ========================================================== */

  useEffect(() => {
    function handleKeyboard(event) {
      const modifier = event.ctrlKey || event.metaKey;

      if (
        modifier &&
        event.key.toLowerCase() === "l"
      ) {
        event.preventDefault();

        addressInputRef.current?.focus();

        addressInputRef.current?.select();
      }

      if (
        modifier &&
        event.key.toLowerCase() === "t"
      ) {
        event.preventDefault();

        createNewTab();
      }

      if (
        modifier &&
        event.key.toLowerCase() === "w"
      ) {
        event.preventDefault();

        closeTab(activeId);
      }

      if (
        modifier &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();

        setCommandOpen(true);

        setTimeout(() => {
          document
            .querySelector(".command-search-input")
            ?.focus();
        }, 50);
      }


      if (event.key === "Escape") {
        setMobileMenu(false);
        setCommandOpen(false);
        setProfileOpen(false);
        setAiMenuOpen(false);
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyboard
    );

    return () =>
      window.removeEventListener(
        "keydown",
        handleKeyboard
      );
  }, [activeId]);


  /* ==========================================================
     TOAST
     ========================================================== */

  function showToast(message, type = "success") {
    setToast({
      message,
      type,
    });

    setTimeout(() => {
      setToast(null);
    }, 2600);
  }


  /* ==========================================================
     TAB FUNCTIONS
     ========================================================== */

  function updateActiveTab(patch) {
    setTabs((current) =>
      current.map((tab) =>
        tab.id === activeId
          ? {
              ...tab,
              ...patch,
            }
          : tab
      )
    );
  }


  function createNewTab() {
    const tab = {
      id: crypto.randomUUID(),
      title: "New tab",
      url: "",
      kind: "home",
    };

    setTabs((current) => [
      ...current,
      tab,
    ]);

    setActiveId(tab.id);

    setPage("home");

    setAddress("");

    setQuery("");

    setResults([]);

    setMobileMenu(false);
  }


  function closeTab(id) {
    setTabs((current) => {
      if (current.length === 1) {
        return current;
      }

      const index = current.findIndex(
        (tab) => tab.id === id
      );

      const next = current.filter(
        (tab) => tab.id !== id
      );

      if (id === activeId) {
        const replacement =
          next[
            Math.max(0, index - 1)
          ] || next[0];

        setActiveId(replacement.id);
      }

      return next;
    });
  }


  function activateTab(tab) {
    setActiveId(tab.id);

    setPage(
      tab.kind === "home"
        ? "home"
        : "home"
    );

    setAddress(tab.url || "");

    setMobileMenu(false);
  }


  /* ==========================================================
     HISTORY
     ========================================================== */

  function recordHistory(
    url,
    title = url
  ) {
    if (!url) return;

    const entry = {
      id: crypto.randomUUID(),
      url,
      title,
      time: Date.now(),
    };

    setHistory((current) => [
      entry,
      ...current.filter(
        (item) => item.url !== url
      ),
    ].slice(0, 500));
  }


  /* ==========================================================
     NAVIGATION
     ========================================================== */

  async function navigateExternal(rawUrl) {
    let url = normalizeUrl(rawUrl);

    if (!url) {
      return;
    }

    if (adBlocker && isAdOrTrackerUrl(url)) {
      setBlockedAds((current) => current + 1);
      showToast("Blocked advertising/tracking destination", "info");
      return;
    }

    try {
      const resolved =
        await resolveUrl(url);

      if (resolved?.url) {
        url = resolved.url;
      }
    } catch {
      // Direct navigation fallback.
    }

    recordHistory(
      url,
      getHost(url)
    );

    updateActiveTab({
      title: getHost(url),
      url,
      kind: "external",
    });

    /*
      IMPORTANT:
      We deliberately use real browser navigation.
      No iframe.
    */

    window.location.href = url;
  }


  async function handleAddressSubmit(event) {
    event.preventDefault();

    const value = address.trim();

    if (!value) {
      return;
    }

    const action =
      searchOrNavigate(value);

    if (action.type === "url") {
      await navigateExternal(
        action.value
      );

      return;
    }

    setQuery(action.value);

    await performSearch(
      action.value
    );
  }


  async function performSearch(text) {
    const clean = text.trim();

    if (!clean) {
      return;
    }

    setSearching(true);

    setPage("search");

    updateActiveTab({
      title: clean.slice(0, 30),
      url: "",
      kind: "home",
    });

    try {
      const data =
        await searchWeb(clean);

      const rawResults = data.results || [];
      const filteredResults = adBlocker
        ? rawResults.filter((result) => {
            if (!isAdOrTrackerUrl(result?.url)) return true;
            setBlockedAds((current) => current + 1);
            return false;
          })
        : rawResults;

      setResults(filteredResults);

      recordHistory(
        `search:${clean}`,
        `Search: ${clean}`
      );
    } catch {
      setResults([]);

      showToast(
        "Search service unavailable",
        "error"
      );
    } finally {
      setSearching(false);
    }
  }


  function clickSearchResult(result) {
    if (!result?.url) {
      return;
    }

    navigateExternal(
      result.url
    );
  }


  function submitHomeSearch(event, overrideValue = null) {
    event?.preventDefault?.();

    const value = String(
      overrideValue ?? query
    ).trim();

    if (!value) {
      return;
    }

    if (isProbablyUrl(value)) {
      setAddress(value);

      navigateExternal(value);

      return;
    }

    setAddress(value);

    performSearch(value);
  }


  /* ==========================================================
     BOOKMARKS
     ========================================================== */

  function toggleBookmark(
    url = activeTab?.url
  ) {
    if (!url) {
      return;
    }

    const exists =
      bookmarks.some(
        (item) => item.url === url
      );

    if (exists) {
      setBookmarks(
        (current) =>
          current.filter(
            (item) =>
              item.url !== url
          )
      );

      showToast(
        "Removed from bookmarks"
      );
    } else {
      setBookmarks(
        (current) => [
          {
            id: crypto.randomUUID(),
            title: getHost(url),
            url,
            createdAt:
              Date.now(),
          },
          ...current,
        ]
      );

      showToast(
        "Saved to bookmarks"
      );
    }
  }


  const isBookmarked =
    Boolean(
      activeTab?.url &&
      bookmarks.some(
        (item) =>
          item.url ===
          activeTab.url
      )
    );


  /* ==========================================================
     SECURITY FEATURES
     ========================================================== */

  function isAdOrTrackerUrl(value) {
    if (!value) return false;

    const normalized = String(value).toLowerCase();

    const blockedPatterns = [
      "doubleclick.net",
      "googlesyndication.com",
      "googleadservices.com",
      "adservice.google.com",
      "googletagmanager.com",
      "googletagservices.com",
      "adnxs.com",
      "adsrvr.org",
      "taboola.com",
      "outbrain.com",
      "scorecardresearch.com",
      "quantserve.com",
      "criteo.com",
      "amazon-adsystem.com",
      "advertising.com",
      "zedo.com",
      "moatads.com",
      "adsafeprotected.com",
      "pagead2.googlesyndication.com",
    ];

    return blockedPatterns.some((pattern) =>
      normalized.includes(pattern)
    );
  }

  function toggleAdBlocker() {
    setAdBlocker((current) => {
      const next = !current;
      showToast(
        next ? "Ad blocker enabled" : "Ad blocker disabled",
        next ? "success" : "info"
      );
      return next;
    });
  }

  function toggleVPN() {
    setVpnConnected((current) => {
      const next = !current;

      if (next) {
        showToast(
          "VPN control enabled — a real VPN tunnel requires a device VPN/provider",
          "info"
        );
      } else {
        showToast("VPN control disabled", "info");
      }

      return next;
    });
  }

  function openSecurityPage(kind = "adblock") {
    setPage(kind);
    setMobileMenu(false);
    setCommandOpen(false);
  }

  /* ==========================================================
     WALLPAPER
     ========================================================== */

  function openWallpaperPicker() {
    wallpaperInputRef.current?.click();
  }


  function handleWallpaperUpload(
    event
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      showToast(
        "Please select an image",
        "error"
      );

      return;
    }

    /*
      Browser localStorage has limited space.
      Resize the uploaded image before saving
      so normal wallpapers persist reliably.
    */

    const reader =
      new FileReader();

    reader.onload = () => {
      const source =
        reader.result;

      resizeImageForWallpaper(
        source,
        file.type
      )
        .then((optimized) => {
          setWallpaper(
            optimized
          );

          setWallpaperName(
            file.name
          );

          showToast(
            "Wallpaper applied permanently"
          );
        })
        .catch(() => {
          setWallpaper(source);

          setWallpaperName(
            file.name
          );

          showToast(
            "Wallpaper applied"
          );
        });
    };

    reader.readAsDataURL(file);

    event.target.value = "";
  }


  function resizeImageForWallpaper(
    source,
    mimeType
  ) {
    return new Promise(
      (resolve, reject) => {
        const image =
          new Image();

        image.onload = () => {
          const maxSize =
            1920;

          let width =
            image.width;

          let height =
            image.height;

          if (
            width >
              maxSize ||
            height >
              maxSize
          ) {
            const scale =
              Math.min(
                maxSize /
                  width,
                maxSize /
                  height
              );

            width =
              Math.round(
                width * scale
              );

            height =
              Math.round(
                height * scale
              );
          }

          const canvas =
            document.createElement(
              "canvas"
            );

          canvas.width =
            width;

          canvas.height =
            height;

          const context =
            canvas.getContext(
              "2d"
            );

          context.drawImage(
            image,
            0,
            0,
            width,
            height
          );

          resolve(
            canvas.toDataURL(
              "image/jpeg",
              0.84
            )
          );
        };

        image.onerror =
          reject;

        image.src = source;
      }
    );
  }


  function removeWallpaper() {
    setWallpaper("");

    setWallpaperName("");

    showToast(
      "Wallpaper removed"
    );
  }


  /* ==========================================================
     THEME
     ========================================================== */

  function changeTheme(
    nextTheme
  ) {
    setTheme(nextTheme);

    showToast(
      `${capitalize(nextTheme)} theme selected`
    );
  }


  /* ==========================================================
     COMMAND CENTER
     ========================================================== */

  const commands = [
    {
      id: "adblock",
      title: "Ad blocker",
      description: "Turn advertising and tracker filtering on or off.",
      icon: ShieldCheck,
      action: () => openSecurityPage("adblock"),
    },
    {
      id: "vpn",
      title: "VPN control",
      description: "Open VPN privacy controls and connection guidance.",
      icon: Lock,
      action: () => openSecurityPage("vpn"),
    },
    {
      id: "wallpaper",
      title: "Change wallpaper",
      description:
        "Choose an image for your browser background.",
      icon: Wallpaper,
      action: openWallpaperPicker,
    },
    {
      id: "search",
      title: "Search the web",
      description:
        "Open the VK Browser search workspace.",
      icon: Search,
      action: () => setPage("home"),
    },
    {
      id: "bookmarks",
      title: "Open bookmarks",
      description:
        "View your saved websites.",
      icon: Bookmark,
      action: () =>
        setPage("bookmarks"),
    },
    {
      id: "history",
      title: "Open history",
      description:
        "View recently visited pages.",
      icon: Clock3,
      action: () =>
        setPage("history"),
    },
    {
      id: "settings",
      title: "Open settings",
      description:
        "Customize your browser.",
      icon: Settings,
      action: () =>
        setPage("settings"),
    },
  ];


  const filteredCommands =
    commands.filter(
      (command) =>
        command.title
          .toLowerCase()
          .includes(
            commandQuery.toLowerCase()
          ) ||
        command.description
          .toLowerCase()
          .includes(
            commandQuery.toLowerCase()
          )
    );


  function runCommand(
    command
  ) {
    command.action();

    setCommandOpen(false);

    setCommandQuery("");
  }


  /* ==========================================================
     PAGE
     ========================================================== */

  function renderPage() {
    switch (page) {
      case "search":
        return (
          <SearchPage
            query={query}
            results={results}
            loading={searching}
            onSearch={(text) => {
              setQuery(text);
              setAddress(text);
              performSearch(text);
            }}
            onOpen={
              clickSearchResult
            }
          />
        );

      case "bookmarks":
        return (
          <ListPage
            title="Bookmarks"
            subtitle="Your saved places across the web."
            icon={<Bookmark />}
            items={bookmarks}
            empty="No bookmarks yet."
            onOpen={(item) =>
              navigateExternal(
                item.url
              )
            }
            onDelete={(item) =>
              setBookmarks(
                (current) =>
                  current.filter(
                    (item2) =>
                      item2.id !==
                      item.id
                  )
              )
            }
          />
        );

      case "history":
        return (
          <ListPage
            title="History"
            subtitle="Your recent browsing activity."
            icon={<Clock3 />}
            items={history}
            empty="No browsing history yet."
            onOpen={(item) =>
              item.url.startsWith(
                "search:"
              )
                ? setPage("search")
                : navigateExternal(
                    item.url
                  )
            }
            onDelete={(item) =>
              setHistory(
                (current) =>
                  current.filter(
                    (item2) =>
                      item2.id !==
                      item.id
                  )
              )
            }
          />
        );

      case "downloads":
        return (
          <DownloadsPage
            downloads={downloads}
          />
        );

      case "privacy":
        return (
          <PrivacyPage
            shields={shields}
            setShields={setShields}
          />
        );

      case "settings":
        return (
          <SettingsPage
            engine={engine}
            setEngine={setEngine}
            theme={theme}
            changeTheme={
              changeTheme
            }
            shields={shields}
            setShields={setShields}
            wallpaper={
              wallpaper
            }
            wallpaperName={
              wallpaperName
            }
            wallpaperOpacity={
              wallpaperOpacity
            }
            setWallpaperOpacity={
              setWallpaperOpacity
            }
            openWallpaperPicker={
              openWallpaperPicker
            }
            removeWallpaper={
              removeWallpaper
            }
            adBlocker={adBlocker}
            setAdBlocker={setAdBlocker}
            vpnConnected={vpnConnected}
            setVpnConnected={setVpnConnected}
            blockedAds={blockedAds}
          />
        );

      case "wallpaper":
        return (
          <WallpaperPage
            wallpaper={
              wallpaper
            }
            wallpaperName={
              wallpaperName
            }
            wallpaperOpacity={
              wallpaperOpacity
            }
            setWallpaperOpacity={
              setWallpaperOpacity
            }
            openWallpaperPicker={
              openWallpaperPicker
            }
            removeWallpaper={
              removeWallpaper
            }
            theme={theme}
            changeTheme={
              changeTheme
            }
          />
        );

      case "adblock":
        return (
          <SecurityPage
            mode="adblock"
            adBlocker={adBlocker}
            setAdBlocker={setAdBlocker}
            vpnConnected={vpnConnected}
            setVpnConnected={setVpnConnected}
            blockedAds={blockedAds}
            onToggleAdBlocker={toggleAdBlocker}
            onToggleVPN={toggleVPN}
          />
        );

      case "vpn":
        return (
          <SecurityPage
            mode="vpn"
            adBlocker={adBlocker}
            setAdBlocker={setAdBlocker}
            vpnConnected={vpnConnected}
            setVpnConnected={setVpnConnected}
            blockedAds={blockedAds}
            onToggleAdBlocker={toggleAdBlocker}
            onToggleVPN={toggleVPN}
          />
        );

      default:
        return (
          <HomePage
            query={query}
            setQuery={setQuery}
            onSubmit={
              submitHomeSearch
            }
            engine={engine}
            setEngine={setEngine}
            bookmarks={
              bookmarks
            }
            onOpen={(url) =>
              navigateExternal(
                url
              )
            }
            setPageFromHome={setPage}
            onWallpaper={() =>
              setPage("wallpaper")
            }
            onQuickSite={
              navigateExternal
            }
          />
        );
    }
  }


  /* ==========================================================
     WALLPAPER STYLE
     ========================================================== */

  const appStyle =
    wallpaper
      ? {
          "--vk-wallpaper":
            `url("${wallpaper}")`,
          "--vk-wallpaper-opacity":
            wallpaperOpacity,
        }
      : {
          "--vk-wallpaper":
            DEFAULT_WALLPAPER,
          "--vk-wallpaper-opacity":
            1,
        };


  /* ==========================================================
     RETURN
     ========================================================== */

  return (
    <div
      className={`app vk-browser theme-${theme} ${
        wallpaper
          ? "has-wallpaper"
          : "no-wallpaper"
      }`}
      style={appStyle}
    >
      <div className="wallpaper-layer" />

      <div className="wallpaper-overlay" />

      <div className="ambient-layer">
        <div className="ambient-orb orb-one" />
        <div className="ambient-orb orb-two" />
        <div className="ambient-orb orb-three" />
        <div className="ambient-grid" />
        <div className="ambient-noise" />
      </div>


      {/* ======================================================
          TOP BAR
          ====================================================== */}

      <header className="top">
        <div className="topbar">

          <div className="topbar-left">

            <button
              className="icon-button mobile-only"
              onClick={() =>
                setMobileMenu(
                  (current) =>
                    !current
                )
              }
              title="Menu"
            >
              <Menu size={19} />
            </button>


            <button
              className="brand"
              onClick={() =>
                setPage("home")
              }
              title="VK Browser"
            >
              <span className="brand-mark">
                <img
                  src={vkLogo}
                  alt="VK Browser"
                />
              </span>

              <span className="brand-text">
                <strong>
                  VK
                </strong>

                <span>
                  BROWSER 2050
                </span>
              </span>
            </button>

          </div>


          <div className="tabs-container">

            <div className="tabs">

              {tabs.map(
                (tab) => (
                  <button
                    key={tab.id}
                    className={`tab ${
                      tab.id ===
                      activeId
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      activateTab(
                        tab
                      )
                    }
                  >
                    <span className="tab-icon">
                      {tab.kind ===
                      "external" ? (
                        <Lock
                          size={13}
                        />
                      ) : (
                        <Globe
                          size={13}
                        />
                      )}
                    </span>

                    <span className="tab-title">
                      {tab.title ||
                        "New tab"}
                    </span>

                    {tabs.length >
                      1 && (
                      <span
                        className="tab-close"
                        onClick={(
                          event
                        ) => {
                          event.stopPropagation();

                          closeTab(
                            tab.id
                          );
                        }}
                      >
                        <X
                          size={13}
                        />
                      </span>
                    )}
                  </button>
                )
              )}

              <button
                className="new-tab-button"
                onClick={
                  createNewTab
                }
                title="New tab"
              >
                <Plus
                  size={17}
                />
              </button>

            </div>

          </div>


          <div className="topbar-actions">

            <button
              className={`icon-button ${adBlocker ? "active" : ""}`}
              onClick={toggleAdBlocker}
              title="Ad blocker"
              aria-label="Ad blocker"
            >
              <ShieldCheck
                size={18}
              />
            </button>

            <button
              className={`icon-button ${vpnConnected ? "active" : ""}`}
              onClick={toggleVPN}
              title="VPN"
              aria-label="VPN"
            >
              <Lock
                size={18}
              />
            </button>

            <button
              className="icon-button"
              onClick={() =>
                setPage(
                  "wallpaper"
                )
              }
              title="Wallpaper"
            >
              <Wallpaper
                size={18}
              />
            </button>

            <button
              className="icon-button"
              onClick={() =>
                setProfileOpen(
                  (current) =>
                    !current
                )
              }
              title="Profile"
            >
              <User
                size={18}
              />
            </button>

            <button
              className="icon-button"
              onClick={() =>
                setCommandOpen(
                  true
                )
              }
              title="Command center"
            >
              <MoreHorizontal
                size={18}
              />
            </button>

          </div>

        </div>


        {/* ====================================================
            TOOLBAR
            ==================================================== */}

        <div className="browser-toolbar">

          <div className="toolbar-navigation">

            <button
              type="button"
              className="toolbar-button browser-history-button"
              onClick={goBack}
              title="Back"
              aria-label="Go back"
            >
              <ArrowLeft />
            </button>

            <button
              type="button"
              className="toolbar-button browser-history-button"
              onClick={goForward}
              title="Forward"
              aria-label="Go forward"
            >
              <ArrowRight />
            </button>

            <button
              className="toolbar-button"
              onClick={() =>
                window.location.reload()
              }
              title="Reload"
            >
              <RefreshCw />
            </button>

            <button
              className="toolbar-button desktop-only"
              onClick={() =>
                setPage("home")
              }
              title="Home"
            >
              <Home />
            </button>

          </div>


          <form
            className="address-bar"
            onSubmit={
              handleAddressSubmit
            }
          >
            <span className="address-security">
              <Lock
                size={15}
              />
            </span>

            <input
              ref={
                addressInputRef
              }
              value={
                address
              }
              onChange={(event) =>
                setAddress(
                  event.target.value
                )
              }
              placeholder="Search or enter a website address"
              spellCheck="false"
              autoCapitalize="off"
              autoCorrect="off"
            />

            {address && (
              <button
                type="button"
                className="address-action"
                onClick={() =>
                  setAddress("")
                }
              >
                <X
                  size={15}
                />
              </button>
            )}
          </form>


          <div className="toolbar-right">

            <button
              className={`toolbar-button shield-button ${
                shields
                  ? "enabled"
                  : ""
              }`}
              onClick={() =>
                setShields(
                  (current) =>
                    !current
                )
              }
              title="Privacy shields"
            >
              {shields ? (
                <ShieldCheck />
              ) : (
                <Shield />
              )}
            </button>


            <button
              className={`toolbar-button ${
                isBookmarked
                  ? "bookmark-active"
                  : ""
              }`}
              onClick={() =>
                toggleBookmark()
              }
              title="Bookmark"
            >
              {isBookmarked ? (
                <BookmarkCheck />
              ) : (
                <Bookmark />
              )}
            </button>

          </div>

        </div>

      </header>


      {/* ======================================================
          BODY
          ====================================================== */}

      <div className="browser-body">

        {mobileMenu && (
          <div
            className="mobile-overlay"
            onClick={() =>
              setMobileMenu(false)
            }
          />
        )}


        {sidebar && (
          <aside
            className={`sidebar ${
              mobileMenu
                ? "mobile-visible"
                : ""
            }`}
          >

            <div className="sidebar-header">

              <div className="sidebar-status">
                <span className="status-dot" />
                <span>
                  SYSTEM ONLINE
                </span>
              </div>

              <button
                className="icon-button"
                onClick={() =>
                  setSidebar(
                    (current) =>
                      !current
                  )
                }
                title="Collapse sidebar"
              >
                <Menu
                  size={17}
                />
              </button>

            </div>


            <nav className="sidebar-nav">

              <SidebarItem
                icon={<Home />}
                label="Home"
                active={
                  page ===
                  "home"
                }
                onClick={() => {
                  setPage(
                    "home"
                  );
                  setMobileMenu(
                    false
                  );
                }}
              />


              <SidebarItem
                icon={<Search />}
                label="Search"
                active={
                  page ===
                  "search"
                }
                onClick={() => {
                  setPage(
                    "search"
                  );
                  setMobileMenu(
                    false
                  );
                }}
              />


              <SidebarItem
                icon={<ShieldCheck />}
                label="Ad Blocker"
                active={page === "adblock"}
                badge={adBlocker ? "ON" : "OFF"}
                onClick={() => openSecurityPage("adblock")}
              />


              <SidebarItem
                icon={<Lock />}
                label="VPN"
                active={page === "vpn"}
                badge={vpnConnected ? "ON" : undefined}
                onClick={() => openSecurityPage("vpn")}
              />


              <SidebarItem
                icon={<Wallpaper />}
                label="Wallpaper"
                active={
                  page ===
                  "wallpaper"
                }
                onClick={() => {
                  setPage(
                    "wallpaper"
                  );
                  setMobileMenu(
                    false
                  );
                }}
              />


              <SidebarItem
                icon={<Bookmark />}
                label="Bookmarks"
                active={
                  page ===
                  "bookmarks"
                }
                badge={
                  bookmarks.length ||
                  undefined
                }
                onClick={() => {
                  setPage(
                    "bookmarks"
                  );
                  setMobileMenu(
                    false
                  );
                }}
              />


              <SidebarItem
                icon={<Clock3 />}
                label="History"
                active={
                  page ===
                  "history"
                }
                onClick={() => {
                  setPage(
                    "history"
                  );
                  setMobileMenu(
                    false
                  );
                }}
              />


              <SidebarItem
                icon={<Download />}
                label="Downloads"
                active={
                  page ===
                  "downloads"
                }
                onClick={() => {
                  setPage(
                    "downloads"
                  );
                  setMobileMenu(
                    false
                  );
                }}
              />


              <SidebarItem
                icon={<Shield />}
                label="Privacy"
                active={
                  page ===
                  "privacy"
                }
                onClick={() => {
                  setPage(
                    "privacy"
                  );
                  setMobileMenu(
                    false
                  );
                }}
              />


              <SidebarItem
                icon={<Settings />}
                label="Settings"
                active={
                  page ===
                  "settings"
                }
                onClick={() => {
                  setPage(
                    "settings"
                  );
                  setMobileMenu(
                    false
                  );
                }}
              />

            </nav>


            <div className="sidebar-spacer" />


            <div className="sidebar-footer">

              <div className="network-status">
                <span>
                  Secure browsing
                </span>

                <span className="secure-dot" />
              </div>

              <div className="version-label">
                VK BROWSER 2050.1
              </div>

            </div>

          </aside>
        )}


        <main className="main-content">

          {renderPage()}

        </main>

      </div>


      {/* ======================================================
          MOBILE BOTTOM ACTION BAR
          ====================================================== */}

      <nav className="mobile-nav" aria-label="Mobile browser navigation and actions">

        <button
          type="button"
          className={`mobile-nav-action ${page === "home" ? "active" : ""}`}
          onClick={() => setPage("home")}
          title="Home"
          aria-label="Home"
        >
          <Home />
        </button>

        <button
          type="button"
          className={`mobile-nav-action ${adBlocker ? "active" : ""}`}
          onClick={toggleAdBlocker}
          title="Ad blocker"
          aria-label="Ad blocker"
        >
          <ShieldCheck />
        </button>

        <button
          type="button"
          className={`mobile-nav-action ${vpnConnected ? "active" : ""}`}
          onClick={toggleVPN}
          title="VPN"
          aria-label="VPN"
        >
          <Lock />
        </button>

        <button
          type="button"
          className={`mobile-nav-action ${page === "wallpaper" ? "active" : ""}`}
          onClick={() => setPage("wallpaper")}
          title="Wallpaper"
          aria-label="Wallpaper"
        >
          <Wallpaper />
        </button>

        <button
          type="button"
          className={`mobile-nav-action ${profileOpen ? "active" : ""}`}
          onClick={() => setProfileOpen((current) => !current)}
          title="Profile"
          aria-label="Profile"
        >
          <User />
        </button>

        <button
          type="button"
          className={`mobile-nav-action ${page === "bookmarks" ? "active" : ""}`}
          onClick={() => setPage("bookmarks")}
          title="Bookmarks"
          aria-label="Bookmarks"
        >
          <Bookmark />
        </button>

        <button
          type="button"
          className="mobile-nav-action"
          onClick={createNewTab}
          title="New tab"
          aria-label="New tab"
        >
          <Plus />
        </button>

        <button
          type="button"
          className="mobile-nav-action"
          onClick={() => setCommandOpen(true)}
          title="More options"
          aria-label="More options"
        >
          <MoreHorizontal />
        </button>

      </nav>

      {/* ======================================================
          COMMAND CENTER
          ====================================================== */}

      {commandOpen && (
        <div
          className="command-overlay"
          onMouseDown={() =>
            setCommandOpen(
              false
            )
          }
        >
          <div
            className="command-center"
            onMouseDown={(
              event
            ) =>
              event.stopPropagation()
            }
          >

            <div className="command-header">

              <Search
                size={18}
              />

              <input
                className="command-search-input"
                value={
                  commandQuery
                }
                onChange={(
                  event
                ) =>
                  setCommandQuery(
                    event.target.value
                  )
                }
                placeholder="Search commands..."
              />

              <button
                onClick={() =>
                  setCommandOpen(
                    false
                  )
                }
              >
                <X
                  size={17}
                />
              </button>

            </div>


            <div className="command-list">

              {filteredCommands.length ===
              0 ? (
                <div className="command-empty">
                  No command found.
                </div>
              ) : (
                filteredCommands.map(
                  (command) => {
                    const Icon =
                      command.icon;

                    return (
                      <button
                        key={
                          command.id
                        }
                        className="command-item"
                        onClick={() =>
                          runCommand(
                            command
                          )
                        }
                      >
                        <span className="command-item-icon">
                          <Icon
                            size={18}
                          />
                        </span>

                        <span className="command-item-copy">
                          <strong>
                            {
                              command.title
                            }
                          </strong>

                          <span>
                            {
                              command.description
                            }
                          </span>
                        </span>

                        <ExternalLink
                          size={14}
                          className="command-arrow"
                        />
                      </button>
                    );
                  }
                )
              )}

            </div>


            <div className="command-footer">
              <span>
                <Keyboard
                  size={11}
                />
                Ctrl K
              </span>

              <span>
                <ArrowRight
                  size={11}
                />
                Select
              </span>

              <span>
                <X
                  size={11}
                />
                Close
              </span>
            </div>

          </div>
        </div>
      )}


      {/* ======================================================
          PROFILE
          ====================================================== */}

      {profileOpen && (
        <div className="profile-panel">

          <div className="profile-avatar">
            <img
              src={vkLogo}
              alt="VK"
            />
          </div>

          <div className="profile-info">
            <strong>
              VK Browser User
            </strong>

            <span>
              Personal browser space
            </span>
          </div>

          <div className="profile-status">
            <span className="status-dot" />
            Local profile
          </div>

        </div>
      )}


      {/* ======================================================
          TOAST
          ====================================================== */}

      {toast && (
        <div
          className={`toast toast-${toast.type}`}
        >
          {toast.type ===
          "success" ? (
            <Check
              size={15}
            />
          ) : (
            <X
              size={15}
            />
          )}

          <span>
            {
              toast.message
            }
          </span>
        </div>
      )}


      {/* ======================================================
          HIDDEN WALLPAPER INPUT
          ====================================================== */}

      <input
        ref={
          wallpaperInputRef
        }
        type="file"
        accept="image/*"
        className="hidden-file-input"
        onChange={
          handleWallpaperUpload
        }
      />

    </div>
  );
}


/* ============================================================
   SIDEBAR ITEM
   ============================================================ */

function SidebarItem({
  icon,
  label,
  active,
  badge,
  onClick,
}) {
  return (
    <button
      className={`sidebar-item ${
        active
          ? "active"
          : ""
      }`}
      onClick={onClick}
    >
      <span className="sidebar-item-icon">
        {React.cloneElement(
          icon,
          {
            size: 18,
          }
        )}
      </span>

      <span className="sidebar-item-label">
        {label}
      </span>

      {badge !==
        undefined && (
        <span className="sidebar-count">
          {badge}
        </span>
      )}
    </button>
  );
}


/* ============================================================
   HOME PAGE
   ============================================================ */

function HomePage({
  query,
  setQuery,
  onSubmit,
  engine,
  setEngine,
  bookmarks,
  onOpen,
  adBlocker,
  vpnConnected,
  blockedAds,
  onWallpaper,
  onQuickSite,
  setPageFromHome,
}) {
  const [time, setTime] =
    useState(
      new Date()
    );

  const [voiceListening, setVoiceListening] =
    useState(false);

  const [voiceSupported, setVoiceSupported] =
    useState(true);

  const [voiceError, setVoiceError] =
    useState("");

  const recognitionRef =
    useRef(null);

  const onSubmitRef =
    useRef(onSubmit);

  onSubmitRef.current =
    onSubmit;

  useEffect(() => {
    const timer =
      setInterval(
        () =>
          setTime(
            new Date()
          ),
        1000
      );

    return () =>
      clearInterval(
        timer
      );
  }, []);

  /*
    Voice search
    -------------
    Use the Web Speech API directly from the microphone
    button click. Do not call getUserMedia() first because
    doing so can consume the mobile browser's user gesture
    before SpeechRecognition.start() is called.
  */
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceSupported(false);
      return undefined;
    }

    setVoiceSupported(true);

    const recognition =
      new SpeechRecognition();

    recognition.lang =
      navigator.language ||
      "en-IN";

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setVoiceListening(true);
      setVoiceError("");
    };

    recognition.onresult = (event) => {
      let transcript = "";

      for (
        let index = event.resultIndex;
        index < event.results.length;
        index += 1
      ) {
        transcript +=
          event.results[index][0].transcript;
      }

      transcript =
        transcript.trim();

      if (!transcript) {
        return;
      }

      setQuery(transcript);

      const finalResult =
        Array.from(event.results)
          .slice(event.resultIndex)
          .some(
            (result) =>
              result.isFinal
          );

      if (finalResult) {
        /*
          Pass the transcript directly so we do not depend
          on React state updating before the search starts.
        */
        window.setTimeout(() => {
          onSubmitRef.current?.(
            null,
            transcript
          );
        }, 0);
      }
    };

    recognition.onerror = (event) => {
      setVoiceListening(false);

      const messages = {
        "not-allowed":
          "Microphone permission was denied. Allow microphone access for VK Browser.",
        "service-not-allowed":
          "Speech recognition is blocked by this browser.",
        "audio-capture":
          "No microphone was found on this device.",
        "no-speech":
          "No speech detected. Tap the microphone and speak again.",
        network:
          "Voice recognition needs a network connection.",
        aborted:
          "Voice search stopped.",
      };

      setVoiceError(
        messages[event.error] ||
        "Voice search could not start."
      );
    };

    recognition.onend = () => {
      setVoiceListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current =
      recognition;

    return () => {
      try {
        recognition.onstart = null;
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        recognition.abort();
      } catch {
        // Recognition may already be stopped.
      }

      if (
        recognitionRef.current ===
        recognition
      ) {
        recognitionRef.current =
          null;
      }
    };
  }, []);

  function startVoiceSearch() {
    if (!voiceSupported) {
      setVoiceError(
        "Voice search is not supported in this browser. Try Chrome or Edge over HTTPS."
      );
      return;
    }

    const recognition =
      recognitionRef.current;

    if (!recognition) {
      setVoiceError(
        "Voice search is still starting. Please tap the microphone again."
      );
      return;
    }

    if (voiceListening) {
      try {
        recognition.stop();
      } catch {
        // Already stopped.
      }
      return;
    }

    setVoiceError("");

    /*
      IMPORTANT:
      recognition.start() is called directly from the button
      click. This is required by several mobile browsers.
    */
    try {
      recognition.start();
    } catch (error) {
      if (
        error?.name ===
        "InvalidStateError"
      ) {
        try {
          recognition.stop();
        } catch {
          // Ignore.
        }

        window.setTimeout(() => {
          try {
            recognition.start();
          } catch {
            setVoiceError(
              "Voice search is already active. Please try again."
            );
          }
        }, 100);
      } else {
        setVoiceError(
          "Unable to start the microphone. Check browser microphone permission."
        );
      }
    }
  }


  return (
    <section className="home-page">

      <div className="hero-section">

        <div className="hero-eyebrow">
          <span className="eyebrow-line" />
          THE NEXT GENERATION WEB
          <span className="eyebrow-line reverse" />
        </div>


        <div className="hero-logo">
          <img
            src={vkLogo}
            alt="VK Browser"
          />
        </div>


        <h1 className="hero-title">
          <span>
            Explore beyond
          </span>

          <span>
            the ordinary.
          </span>
        </h1>


        <p className="hero-description">
          Search the web, open any website,
          block common trackers and manage
          your personal browser security.
        </p>


        <form
          className="hero-search"
          onSubmit={onSubmit}
        >

          <div className="search-glow" />

          <span className="search-leading">
            <Search
              size={21}
            />
          </span>

          <input
            value={query}
            onChange={(event) =>
              setQuery(
                event.target.value
              )
            }
            placeholder="Search anything or enter a website..."
            autoComplete="off"
          />

          <div className="search-actions">

            <button
              type="button"
              className={`voice-button ${
                voiceListening
                  ? "listening"
                  : ""
              }`}
              onClick={
                startVoiceSearch
              }
              title={
                voiceListening
                  ? "Stop voice search"
                  : "Voice search"
              }
              aria-label={
                voiceListening
                  ? "Stop voice search"
                  : "Start voice search"
              }
              disabled={
                !voiceSupported
              }
            >
              <Mic
                size={18}
              />

              {voiceListening && (
                <span
                  className="voice-listening-dot"
                  aria-hidden="true"
                />
              )}
            </button>

            <button
              type="submit"
              className="search-submit"
            >
              <Search
                size={16}
              />

              <span>
                Search
              </span>
            </button>

          </div>

        </form>

        {voiceError && (
          <div
            className="voice-search-status"
            role="status"
            aria-live="polite"
          >
            {voiceError}
          </div>
        )}

        <div className="search-hint">
          <kbd>Ctrl</kbd>
          <span>
            L
          </span>

          <span className="hint-separator">
            •
          </span>

          Search

          <span className="hint-separator">
            •
          </span>

          <kbd>Ctrl</kbd>
          <span>
            K
          </span>

          <span>
            command center
          </span>
        </div>


        {/* QUICK ACCESS — visible directly on the home screen */}
        <div className="home-quick-access">

          <div className="home-quick-access-label">
            QUICK ACCESS
          </div>

        <div className="quick-sites">

          {QUICK_SITES.map(
            (site) => (
              <button
                key={
                  site.name
                }
                className="quick-site"
                onClick={() =>
                  onQuickSite(
                    site.url
                  )
                }
              >
                <span className="quick-site-icon">
                  {site.iconUrl ? (
                    <img
                      src={site.iconUrl}
                      alt=""
                      className="quick-site-logo"
                      loading="lazy"
                      draggable="false"
                    />
                  ) : (
                    site.letter
                  )}
                </span>

                <span className="quick-site-name">
                  {
                    site.name
                  }
                </span>

                <ArrowRight
                  size={13}
                  className="quick-site-arrow"
                />
              </button>
            )
          )}

        </div>

        </div>


        <div className="hero-actions">

          <button
            type="button"
            className="hero-action-card"
            onClick={() => setPageFromHome?.("adblock")}
            aria-label="Open ad blocker"
          >
            <span className="hero-action-icon security">
              <ShieldCheck
                size={18}
              />
            </span>

            <span>
              <strong>
                Ad Blocker
              </strong>

              <small>
                {adBlocker ? "Protection enabled" : "Protection paused"}
              </small>
            </span>

            <ArrowRight
              size={15}
            />
          </button>


          <button
            type="button"
            className="hero-action-card"
            onClick={() => onWallpaper?.()}
            aria-label="Open wallpaper personalization"
          >
            <span className="hero-action-icon wallpaper">
              <Wallpaper
                size={18}
              />
            </span>

            <span>
              <strong>
                Personalize
              </strong>

              <small>
                Set your wallpaper
              </small>
            </span>

            <ArrowRight
              size={15}
            />
          </button>

        </div>


        <div className="ai-status-card security-status-card">

          <div className="ai-status-icon">
            <ShieldCheck
              size={16}
            />
          </div>

          <div className="ai-status-text">
            <strong>
              Browser security
            </strong>

            <span>
              {adBlocker ? "Ad blocker is active." : "Ad blocker is paused."}
            </span>
          </div>

          <div className="ai-status-metrics">
            <span>
              <span className="pulse-dot" />
              {adBlocker ? "PROTECTED" : "PAUSED"}
            </span>

            <span>
              {blockedAds} blocked
            </span>
          </div>

        </div>

      </div>


      {/* ======================================================
          FUTURE FEATURES
          ====================================================== */}

      <div className="section-block">

        <div className="section-heading">

          <div>
            <span className="section-kicker">
              VK BROWSER 2050
            </span>

            <h2>
              Designed for
              what comes next.
            </h2>
          </div>

        </div>


        <div className="future-grid">

          {FUTURE_FEATURES.map(
            (feature, index) => {
              const Icon =
                feature.icon;

              return (
                <article
                  className="future-card"
                  key={
                    feature.title
                  }
                >
                  <span className="future-card-number">
                    0
                    {index + 1}
                  </span>

                  <div className="future-card-icon">
                    <Icon
                      size={19}
                    />
                  </div>

                  <h3>
                    {
                      feature.title
                    }
                  </h3>

                  <p>
                    {
                      feature.description
                    }
                  </p>
                </article>
              );
            }
          )}

        </div>

      </div>


      {/* ======================================================
          PRIVACY
          ====================================================== */}

      <div className="privacy-banner">

        <div className="privacy-banner-icon">
          <ShieldCheck
            size={22}
          />
        </div>

        <div className="privacy-banner-content">

          <span>
            VK SHIELDS
          </span>

          <strong>
            Your browsing space is protected.
          </strong>

          <p>
            Privacy controls are available
            directly from the browser toolbar.
          </p>

        </div>

        <span className="privacy-banner-status status-active">
          ACTIVE
        </span>

      </div>


      <footer className="home-footer">
        <span>
          VK BROWSER • FUTURE WEB
        </span>

        <span>
          BUILT FOR EVERY SCREEN
        </span>
      </footer>

    </section>
  );
}


/* ============================================================
   MINI WIDGET
   ============================================================ */

function MiniWidget({
  icon,
  label,
  value,
  description,
  accent = "default",
  onClick,
}) {
  return (
    <button
      className={`mini-widget mini-widget-${accent}`}
      onClick={onClick}
      disabled={!onClick}
    >
      <div className="mini-widget-top">

        <span className="mini-widget-icon">
          {React.cloneElement(
            icon,
            {
              size: 16,
            }
          )}
        </span>

        <span className="mini-widget-label">
          {label}
        </span>

      </div>

      <strong>
        {value}
      </strong>

      <span className="mini-widget-description">
        {description}
      </span>
    </button>
  );
}


/* ============================================================
   SEARCH PAGE
   ============================================================ */

function SearchPage({
  query,
  results,
  loading,
  onSearch,
  onOpen,
}) {
  const [local, setLocal] =
    useState(query);

  useEffect(() => {
    setLocal(query);
  }, [query]);


  return (
    <section className="content-page search-page">

      <div className="page-header">

        <div className="page-header-copy">

          <div className="page-title-row">
            <Search
              size={23}
            />

            <h1>
              Search
            </h1>
          </div>

          <p>
            Search the web from your
            VK Browser workspace.
          </p>

        </div>

      </div>


      <form
        className="results-search"
        onSubmit={(event) => {
          event.preventDefault();

          onSearch(local);
        }}
      >
        <Search
          size={18}
        />

        <input
          value={local}
          onChange={(event) =>
            setLocal(
              event.target.value
            )
          }
          placeholder="Search the web..."
        />

        <button type="submit">
          Search
        </button>
      </form>


      <div className="result-meta">
        Results for
        {" "}
        <strong>
          {query || "your search"}
        </strong>
      </div>


      {loading && (
        <div className="search-loading">

          <div className="loading-orbit">
            <span />
            <span />
            <span />
          </div>

          <strong>
            Searching the web
          </strong>

          <p>
            Finding useful results...
          </p>

        </div>
      )}


      {!loading &&
        results.length ===
          0 && (
          <div className="empty-state">

            <div className="empty-state-icon">
              <Search
                size={25}
              />
            </div>

            <h2>
              No results yet
            </h2>

            <p>
              Enter a search above
              to explore the web.
            </p>

          </div>
        )}


      {!loading &&
        results.length >
          0 && (
          <div className="results-list">

            {results.map(
              (result, index) => (
                <article
                  className="result-card"
                  key={`${result.url}-${index}`}
                >

                  <div className="result-number">
                    {String(
                      index + 1
                    ).padStart(
                      2,
                      "0"
                    )}
                  </div>

                  <div className="result-main">

                    <div className="result-domain">
                      <Globe
                        size={11}
                      />

                      {result.display_url ||
                        result.url}
                    </div>

                    <button
                      className="result-title"
                      onClick={() =>
                        onOpen(
                          result
                        )
                      }
                    >
                      {result.title}
                    </button>

                    <p className="result-description">
                      {result.description ||
                        "Open this website in your real browser."}
                    </p>

                    <div className="result-url">
                      {
                        result.url
                      }
                    </div>

                  </div>

                  <div className="result-actions">

                    <button
                      onClick={() =>
                        onOpen(
                          result
                        )
                      }
                      title="Visit"
                    >
                      <ExternalLink
                        size={15}
                      />
                    </button>

                  </div>

                </article>
              )
            )}

          </div>
        )}

    </section>
  );
}


/* ============================================================
   SECURITY PAGE
   ============================================================ */

function SecurityPage({
  mode,
  adBlocker,
  setAdBlocker,
  vpnConnected,
  setVpnConnected,
  blockedAds,
  onToggleAdBlocker,
  onToggleVPN,
}) {
  const isAdBlock = mode === "adblock";

  return (
    <section className="content-page">
      <div className="page-header">
        <div className="page-header-copy">
          <div className="page-title-row">
            {isAdBlock ? <ShieldCheck size={24} /> : <Lock size={24} />}
            <h1>{isAdBlock ? "Ad Blocker" : "VPN"}</h1>
          </div>
          <p>
            {isAdBlock
              ? "Reduce common advertising and tracking destinations while you browse."
              : "Manage VPN privacy controls for VK Browser."}
          </p>
        </div>
      </div>

      <div className="settings-layout">
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-icon">
              {isAdBlock ? <ShieldCheck size={17} /> : <Lock size={17} />}
            </div>
            <div>
              <h2>{isAdBlock ? "Ad blocking" : "VPN control"}</h2>
              <p>
                {isAdBlock
                  ? "Filter known advertising and tracking destinations before navigation."
                  : "Control the browser-side VPN state and connection guidance."}
              </p>
            </div>
          </div>

          {isAdBlock ? (
            <>
              <button
                type="button"
                className="primary-button"
                onClick={onToggleAdBlocker}
              >
                <ShieldCheck size={14} />
                {adBlocker ? "Disable ad blocker" : "Enable ad blocker"}
              </button>

              <div className="chatgpt-settings-badge">
                <span className="chatgpt-settings-icon">
                  <ShieldCheck size={16} />
                </span>
                <span>
                  <strong>{adBlocker ? "Ad blocker active" : "Ad blocker paused"}</strong>
                  <small>{blockedAds} destinations filtered this session</small>
                </span>
                <span className="chatgpt-online-dot" />
              </div>

              <p className="settings-note">
                This web version can filter known ad/tracker destinations and search results. It cannot remove every advertisement from a third-party website after that website is opened in the normal browser.
              </p>
            </>
          ) : (
            <>
              <button
                type="button"
                className="primary-button"
                onClick={onToggleVPN}
              >
                <Lock size={14} />
                {vpnConnected ? "Turn VPN control off" : "Turn VPN control on"}
              </button>

              <div className="chatgpt-settings-badge">
                <span className="chatgpt-settings-icon">
                  <Lock size={16} />
                </span>
                <span>
                  <strong>{vpnConnected ? "VPN control enabled" : "VPN control disabled"}</strong>
                  <small>Browser privacy control</small>
                </span>
                <span className="chatgpt-online-dot" />
              </div>

              <p className="settings-note">
                A website cannot create a device-wide VPN tunnel by itself. For real encrypted traffic routing, connect a VPN provider or your device's VPN service.
              </p>
            </>
          )}
        </div>

        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-icon">
              <ShieldCheck size={17} />
            </div>
            <div>
              <h2>Security status</h2>
              <p>Current VK Browser privacy controls.</p>
            </div>
          </div>

          <div className="protection-grid">
            <ProtectionCard
              icon={<ShieldCheck />}
              title="Ad blocker"
              description="Known advertising and tracker destinations."
              active={adBlocker}
            />
            <ProtectionCard
              icon={<Lock />}
              title="VPN control"
              description="Browser-side VPN state and guidance."
              active={vpnConnected}
            />
          </div>
        </div>
      </div>
    </section>
  );
}


/* ============================================================
   WALLPAPER PAGE
   ============================================================ */

function WallpaperPage({
  wallpaper,
  wallpaperName,
  wallpaperOpacity,
  setWallpaperOpacity,
  openWallpaperPicker,
  removeWallpaper,
  theme,
  changeTheme,
}) {
  return (
    <section className="content-page wallpaper-page">

      <div className="page-header">

        <div className="page-header-copy">

          <div className="page-title-row">

            <Wallpaper
              size={24}
            />

            <h1>
              Wallpaper
            </h1>

          </div>

          <p>
            Turn VK Browser into
            your personal digital space.
          </p>

        </div>

      </div>


      <div className="wallpaper-studio">

        <div className="wallpaper-preview">

          {wallpaper ? (
            <img
              src={wallpaper}
              alt="Current wallpaper"
            />
          ) : (
            <div className="wallpaper-preview-empty">
              <ImageIcon
                size={32}
              />

              <strong>
                No custom wallpaper
              </strong>

              <span>
                Choose an image to personalize your browser.
              </span>
            </div>
          )}

          <div className="wallpaper-preview-ui">

            <div className="preview-browser-bar">
              <span />
              <span />
              <span />

              <div />
            </div>

            <div className="preview-search" />

            <div className="preview-cards">
              <span />
              <span />
              <span />
            </div>

          </div>

        </div>


        <div className="wallpaper-controls">

          <div className="wallpaper-control-card">

            <span className="section-kicker">
              PERSONAL SPACE
            </span>

            <h2>
              Make it yours.
            </h2>

            <p>
              Your selected wallpaper is
              saved locally in this browser
              and remains after refreshing
              the page.
            </p>


            <div className="wallpaper-actions">

              <button
                className="primary-button"
                onClick={
                  openWallpaperPicker
                }
              >
                <Upload
                  size={15}
                />

                Choose image
              </button>


              {wallpaper && (
                <button
                  className="danger-outline"
                  onClick={
                    removeWallpaper
                  }
                >
                  <Trash2
                    size={14}
                  />

                  Remove
                </button>
              )}

            </div>


            {wallpaperName && (
              <div className="current-wallpaper">

                <FileImage
                  size={16}
                />

                <span>
                  {wallpaperName}
                </span>

                <Check
                  size={15}
                />

              </div>
            )}

          </div>


          <div className="wallpaper-control-card">

            <div className="control-heading">
              <strong>
                Background intensity
              </strong>

              <span>
                {Math.round(
                  wallpaperOpacity *
                    100
                )}
                %
              </span>
            </div>

            <input
              className="wallpaper-range"
              type="range"
              min="0.25"
              max="1"
              step="0.05"
              value={
                wallpaperOpacity
              }
              onChange={(
                event
              ) =>
                setWallpaperOpacity(
                  Number(
                    event.target
                      .value
                  )
                )
              }
            />

            <small>
              Lower values make the futuristic
              browser interface more visible.
            </small>

          </div>


          <div className="wallpaper-control-card">

            <div className="control-heading">
              <strong>
                Interface theme
              </strong>

              <span>
                {theme}
              </span>
            </div>


            <div className="theme-selector-grid">

              <ThemeButton
                icon={<Moon />}
                title="Midnight"
                active={
                  theme ===
                  "midnight"
                }
                onClick={() =>
                  changeTheme(
                    "midnight"
                  )
                }
              />

              <ThemeButton
                icon={<Sun />}
                title="Daylight"
                active={
                  theme ===
                  "daylight"
                }
                onClick={() =>
                  changeTheme(
                    "daylight"
                  )
                }
              />

              <ThemeButton
                icon={<Zap />}
                title="Neon"
                active={
                  theme ===
                  "neon"
                }
                onClick={() =>
                  changeTheme(
                    "neon"
                  )
                }
              />

            </div>

          </div>

        </div>

      </div>

    </section>
  );
}


/* ============================================================
   THEME BUTTON
   ============================================================ */

function ThemeButton({
  icon,
  title,
  active,
  onClick,
}) {
  return (
    <button
      className={`theme-button ${
        active
          ? "active"
          : ""
      }`}
      onClick={onClick}
    >
      {React.cloneElement(
        icon,
        {
          size: 16,
        }
      )}

      <span>
        {title}
      </span>

      {active && (
        <Check
          size={13}
        />
      )}
    </button>
  );
}


/* ============================================================
   PRIVACY PAGE
   ============================================================ */

function PrivacyPage({
  shields,
  setShields,
}) {
  return (
    <section className="content-page">

      <div className="page-header">

        <div className="page-header-copy">

          <div className="page-title-row">

            <ShieldCheck
              size={24}
            />

            <h1>
              Privacy
            </h1>

          </div>

          <p>
            Control the privacy layer
            of your VK Browser experience.
          </p>

        </div>

      </div>


      <div className="privacy-hero-card">

        <div className="privacy-orbit">

          <div className="privacy-orbit-ring" />

          <div className="privacy-orbit-core">
            <ShieldCheck
              size={38}
            />
          </div>

        </div>


        <div className="privacy-hero-copy">

          <span>
            VK SHIELDS
          </span>

          <h2>
            Privacy,
            always visible.
          </h2>

          <p>
            Keep privacy controls close
            without hiding them inside
            complicated menus.
          </p>


          <button
            className={`large-toggle-button ${
              shields
                ? "active"
                : ""
            }`}
            onClick={() =>
              setShields(
                (current) =>
                  !current
              )
            }
          >
            <span />

            {shields
              ? "Protection active"
              : "Protection paused"}
          </button>

        </div>

      </div>


      <div className="section-block">

        <div className="protection-grid">

          <ProtectionCard
            icon={<ShieldCheck />}
            title="Tracking protection"
            description="Privacy controls are enabled in the browser interface."
            active={shields}
          />

          <ProtectionCard
            icon={<Lock />}
            title="Secure navigation"
            description="HTTPS destinations are shown clearly in the address bar."
            active
          />

          <ProtectionCard
            icon={<Search />}
            title="Private search"
            description="Search requests are handled through the browser backend."
            active
          />

          <ProtectionCard
            icon={<Globe />}
            title="Real web"
            description="Websites open as real browser destinations instead of iframe copies."
            active
          />

        </div>

      </div>

    </section>
  );
}


/* ============================================================
   PROTECTION CARD
   ============================================================ */

function ProtectionCard({
  icon,
  title,
  description,
  active,
}) {
  return (
    <div
      className={`protection-card ${
        active
          ? "active"
          : ""
      }`}
    >
      <div className="protection-icon">
        {React.cloneElement(
          icon,
          {
            size: 18,
          }
        )}
      </div>

      <h3>
        {title}
      </h3>

      <p>
        {description}
      </p>

      <div className="protection-status">
        <span
          className={
            active
              ? "secure-dot"
              : "status-paused-dot"
          }
        />

        {active
          ? "Active"
          : "Paused"}
      </div>
    </div>
  );
}


/* ============================================================
   SETTINGS PAGE
   ============================================================ */

function SettingsPage({
  engine,
  setEngine,
  theme,
  changeTheme,
  shields,
  setShields,
  wallpaper,
  wallpaperName,
  wallpaperOpacity,
  setWallpaperOpacity,
  openWallpaperPicker,
  removeWallpaper,
  adBlocker,
  setAdBlocker,
  vpnConnected,
  setVpnConnected,
  blockedAds,
}) {
  return (
    <section className="content-page">

      <div className="page-header">

        <div className="page-header-copy">

          <div className="page-title-row">

            <Settings
              size={24}
            />

            <h1>
              Settings
            </h1>

          </div>

          <p>
            Customize your browser
            experience.
          </p>

        </div>

      </div>


      <div className="settings-layout">

        <div className="settings-card">

          <div className="settings-card-header">

            <div className="settings-icon">
              <Search
                size={17}
              />
            </div>

            <div>
              <h2>
                Search engine
              </h2>

              <p>
                Choose the search service shown by VK Browser.
              </p>
            </div>

          </div>


          <div className="engine-options">

            {[
              "DuckDuckGo",
              "Bing",
              "Google",
              "Brave Search",
            ].map(
              (item) => (
                <button
                  key={item}
                  className={`engine-option ${
                    engine ===
                    item
                      ? "selected"
                      : ""
                  }`}
                  onClick={() =>
                    setEngine(
                      item
                    )
                  }
                >
                  <span>
                    {item}
                  </span>

                  {engine ===
                    item && (
                    <Check
                      size={14}
                    />
                  )}
                </button>
              )
            )}

          </div>

        </div>


        <div className="settings-card">

          <div className="settings-card-header">

            <div className="settings-icon">
              <ShieldCheck
                size={17}
              />
            </div>

            <div>
              <h2>
                Security
              </h2>

              <p>
                Control ad blocking and VPN privacy features.
              </p>
            </div>

          </div>

          <div className="chatgpt-settings-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setAdBlocker((current) => !current)}
            >
              <ShieldCheck size={13} />
              Ad blocker {adBlocker ? "On" : "Off"}
            </button>

            <button
              type="button"
              className="primary-button"
              onClick={() => setVpnConnected((current) => !current)}
            >
              <Lock size={13} />
              VPN {vpnConnected ? "On" : "Off"}
            </button>
          </div>

          <div className="chatgpt-settings-badge">
            <span className="chatgpt-settings-icon">
              <ShieldCheck size={16} />
            </span>
            <span>
              <strong>{adBlocker ? "Protection active" : "Protection paused"}</strong>
              <small>{blockedAds} advertising/tracking destinations blocked</small>
            </span>
            <span className="chatgpt-online-dot" />
          </div>

          <p className="settings-note">
            VPN note: a normal web app cannot create a device-wide encrypted VPN tunnel. The VPN control here manages the browser privacy state; a real tunnel requires a VPN provider or operating-system VPN service.
          </p>

        </div>


        <div className="settings-card">

          <div className="settings-card-header">

            <div className="settings-icon">
              <Palette
                size={17}
              />
            </div>

            <div>
              <h2>
                Appearance
              </h2>

              <p>
                Change the browser interface theme.
              </p>
            </div>

          </div>


          <div className="theme-options">

            <ThemeOption
              title="Midnight"
              description="Deep futuristic dark"
              active={
                theme ===
                "midnight"
              }
              onClick={() =>
                changeTheme(
                  "midnight"
                )
              }
              type="midnight"
            />

            <ThemeOption
              title="Daylight"
              description="Bright modern"
              active={
                theme ===
                "daylight"
              }
              onClick={() =>
                changeTheme(
                  "daylight"
                )
              }
              type="daylight"
            />

            <ThemeOption
              title="Neon"
              description="High-tech future"
              active={
                theme ===
                "neon"
              }
              onClick={() =>
                changeTheme(
                  "neon"
                )
              }
              type="neon"
            />

          </div>

        </div>


        <div className="settings-card">

          <div className="settings-card-header">

            <div className="settings-icon">
              <Shield
                size={17}
              />
            </div>

            <div>
              <h2>
                Privacy
              </h2>

              <p>
                Toggle your browser privacy layer.
              </p>
            </div>

          </div>


          <button
            className="setting-toggle-row"
            onClick={() =>
              setShields(
                (current) =>
                  !current
              )
            }
          >

            <div>

              <strong>
                VK Shields
              </strong>

              <span>
                Privacy protection
                interface
              </span>

            </div>

            <span
              className={`toggle ${
                shields
                  ? "on"
                  : ""
              }`}
            >
              <span />
            </span>

          </button>

        </div>


        <div className="settings-card">

          <div className="settings-card-header">

            <div className="settings-icon">
              <Wallpaper
                size={17}
              />
            </div>

            <div>
              <h2>
                Wallpaper
              </h2>

              <p>
                Your custom browser background.
              </p>
            </div>

          </div>


          <div className="settings-wallpaper-row">

            <div className="settings-wallpaper-preview">

              {wallpaper ? (
                <img
                  src={
                    wallpaper
                  }
                  alt="Wallpaper"
                />
              ) : (
                <ImageIcon
                  size={18}
                />
              )}

            </div>


            <div className="settings-wallpaper-info">

              <strong>
                {wallpaperName ||
                  "Default futuristic background"}
              </strong>

              <span>
                Intensity:
                {" "}
                {Math.round(
                  wallpaperOpacity *
                    100
                )}
                %
              </span>

            </div>


            <button
              className="secondary-button"
              onClick={
                openWallpaperPicker
              }
            >
              Change
            </button>

          </div>


          {wallpaper && (
            <button
              className="danger-outline"
              onClick={
                removeWallpaper
              }
            >
              <Trash2
                size={13}
              />

              Remove wallpaper
            </button>
          )}

        </div>


        <div className="settings-card">

          <div className="settings-card-header">

            <div className="settings-icon">
              <Smartphone
                size={17}
              />
            </div>

            <div>
              <h2>
                Responsive UI
              </h2>

              <p>
                Designed for every screen.
              </p>
            </div>

          </div>


          <div className="device-icons">
            <Smartphone
              size={20}
            />

            <Tablet
              size={20}
            />

            <Monitor
              size={20}
            />
          </div>

        </div>


        <div className="settings-card">

          <div className="settings-card-header">

            <div className="settings-icon">
              <Keyboard
                size={17}
              />
            </div>

            <div>
              <h2>
                Keyboard shortcuts
              </h2>

              <p>
                Ctrl + L address bar · Ctrl + T new tab · Ctrl + W close tab · Ctrl + K command center
              </p>
            </div>

          </div>

        </div>


        <div className="settings-card">

          <div className="settings-card-header">

            <div className="settings-icon">
              <Monitor
                size={17}
              />
            </div>

            <div>
              <h2>
                Browser system
              </h2>

              <p>
                Current browser environment.
              </p>
            </div>

          </div>


          <div className="system-metrics">

            <div className="metric">
              <span>
                Engine
              </span>

              <strong>
                VK Web
              </strong>
            </div>

            <div className="metric">
              <span>
                UI
              </span>

              <strong>
                2050
              </strong>
            </div>

            <div className="metric">
              <span>
                Storage
              </span>

              <strong>
                Local
              </strong>
            </div>

            <div className="metric">
              <span>
                Security
              </span>

              <strong>
                {adBlocker ? "Protected" : "Paused"}
              </strong>
            </div>

          </div>

        </div>

      </div>

    </section>
  );
}


/* ============================================================
   THEME OPTION
   ============================================================ */

function ThemeOption({
  title,
  description,
  active,
  onClick,
  type,
}) {
  return (
    <button
      className={`theme-option ${
        active
          ? "selected"
          : ""
      } theme-${type}`}
      onClick={onClick}
    >

      <div className="theme-preview">

        <span />
        <span />
        <span />

      </div>

      <div className="theme-option-copy">

        <strong>
          {title}
        </strong>

        <span>
          {description}
        </span>

      </div>

    </button>
  );
}


/* ============================================================
   DOWNLOADS
   ============================================================ */

function DownloadsPage({
  downloads,
}) {
  return (
    <section className="content-page">

      <div className="page-header">

        <div className="page-header-copy">

          <div className="page-title-row">

            <Download
              size={24}
            />

            <h1>
              Downloads
            </h1>

          </div>

          <p>
            Download activity from your browser.
          </p>

        </div>

      </div>


      {downloads.length ===
      0 ? (
        <div className="empty-panel">

          <div className="empty-panel-icon">
            <Download
              size={26}
            />
          </div>

          <h2>
            No downloads
          </h2>

          <p>
            Downloads will appear here
            when supported by the browser environment.
          </p>

        </div>
      ) : (
        <div className="resource-grid">

          {downloads.map(
            (item) => (
              <div
                className="resource-card"
                key={
                  item.id
                }
              >
                <div className="resource-card-icon">
                  <Download
                    size={18}
                  />
                </div>

                <div className="resource-card-content">

                  <h3>
                    {item.filename ||
                      "Download"}
                  </h3>

                  <p>
                    {item.url}
                  </p>

                </div>

              </div>
            )
          )}

        </div>
      )}

    </section>
  );
}


/* ============================================================
   LIST PAGE
   ============================================================ */

function ListPage({
  title,
  subtitle,
  icon,
  items,
  empty,
  onOpen,
  onDelete,
}) {
  return (
    <section className="content-page">

      <div className="page-header">

        <div className="page-header-copy">

          <div className="page-title-row">

            {React.cloneElement(
              icon,
              {
                size: 24,
              }
            )}

            <h1>
              {title}
            </h1>

            <span className="page-count">
              {items.length}
            </span>

          </div>

          <p>
            {subtitle}
          </p>

        </div>

      </div>


      {items.length ===
      0 ? (
        <div className="empty-panel">

          <div className="empty-panel-icon">
            {React.cloneElement(
              icon,
              {
                size: 25,
              }
            )}
          </div>

          <h2>
            {empty}
          </h2>

          <p>
            Your saved items will
            appear here.
          </p>

        </div>
      ) : (
        <div className="resource-grid">

          {items.map(
            (item) => (
              <div
                className="resource-card"
                key={
                  item.id
                }
              >

                <div className="resource-card-icon">
                  <Globe
                    size={17}
                  />
                </div>


                <div className="resource-card-content">

                  <button
                    className="resource-open"
                    onClick={() =>
                      onOpen(
                        item
                      )
                    }
                  >
                    <h3>
                      {item.title ||
                        item.url}
                    </h3>
                  </button>

                  <p>
                    {item.url}
                  </p>

                  {item.time && (
                    <span>
                      {new Date(
                        item.time
                      ).toLocaleString()}
                    </span>
                  )}

                </div>


                <div className="resource-card-actions">

                  <button
                    onClick={() =>
                      onOpen(
                        item
                      )
                    }
                  >
                    <ExternalLink
                      size={14}
                    />
                  </button>

                  <button
                    onClick={() =>
                      onDelete(
                        item
                      )
                    }
                  >
                    <Trash2
                      size={14}
                    />
                  </button>

                </div>

              </div>
            )
          )}

        </div>
      )}

    </section>
  );
}


/* ============================================================
   HELPERS
   ============================================================ */

function getHost(value) {
  try {
    return new URL(
      value
    ).hostname.replace(
      /^www\./,
      ""
    );
  } catch {
    return value;
  }
}


function capitalize(value) {
  return (
    value
      .charAt(0)
      .toUpperCase() +
    value.slice(1)
  );
}


function tabsSafeId() {
  return (
    load(
      "tabs",
      [INITIAL_TAB]
    )[0]?.id ||
    INITIAL_TAB.id
  );
}
