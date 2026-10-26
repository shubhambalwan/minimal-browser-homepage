const CONFIG_PATH = "plugins/shortcuts/shortcuts.conf";

async function loadShortcuts() {
    const response = await fetch(
    typeof chrome !== "undefined" &&
    chrome.runtime &&
    typeof chrome.runtime.getURL === "function"
        ? chrome.runtime.getURL(CONFIG_PATH)
        : new URL(CONFIG_PATH, document.baseURI).href
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const shortcuts = new Map();

    for (const line of (await response.text()).split(/\r?\n/)) {
        const [rawKey, ...rest] = line.split("=");
        const key = rawKey.trim().toUpperCase();
        const url = rest.join("=").trim();

        if (!url || key.startsWith("#") || !/^[A-Z0-9]$/.test(key)) continue;

        try {
            const { protocol, href } = new URL(url);
            if (protocol === "http:" || protocol === "https:") {
                shortcuts.set(key, href);
            }
        } catch {
            console.warn(`Invalid URL for shortcut ${key}:`, url);
        }
    }

    return shortcuts;
}

export async function init() {
    let shortcuts;
    try {
        shortcuts = await loadShortcuts();
    } catch (error) {
        console.error("Could not initialize shortcuts plugin:", error);
        return;
    }

    document.addEventListener("keydown", (event) => {
        if (!event.altKey || event.ctrlKey || event.metaKey ||
            event.shiftKey || event.repeat) return;

        const url = shortcuts.get(event.key.toUpperCase());
        if (!url) return;

        event.preventDefault();
        window.location.assign(url);
    });

    console.info(`Shortcuts plugin loaded: ${shortcuts.size} shortcuts`);
}