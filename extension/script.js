
const searchBox = document.getElementById("search");
const searchForm = document.getElementById("search-form");
const suggestionBox = document.getElementById("suggestions");
const searchClear = document.getElementById("search-clear");

let suggestionItems = [];
let selectedSuggestion = -1;
let suggestionRequest = 0;
let suggestionTimer = null;

// to make plugin work on website
function getResourceURL(path) {
    if (
        typeof chrome !== "undefined" &&
        chrome.runtime &&
        typeof chrome.runtime.getURL === "function"
    ) {
        return chrome.runtime.getURL(path);
    }

    return new URL(path, document.baseURI).href;
}


// search

function normalizeUrl(value) {
    const candidate = value.trim();

    if (/^(https?:\/\/|ftp:\/\/)/i.test(candidate)) {
        return candidate;
    }

    if (
        /^(localhost|([\w-]+\.)+[a-z]{2,})(:\d+)?([/?#].*)?$/i.test(candidate) &&
        !/\s/.test(candidate)
    ) {
        return `https://${candidate}`;
    }

    return null;
}

function runSearch(raw) {
    const query = raw.trim();

    if (!query) return;

    hideSuggestions();

    const url = normalizeUrl(query);

    window.location.assign(
        url || `https://www.google.com/search?q=${encodeURIComponent(query)}`
    );
}

// suggestions

function hideSuggestions() {
    suggestionBox.hidden = true;
    searchBox.setAttribute("aria-expanded", "false");
    searchBox.removeAttribute("aria-activedescendant");
    selectedSuggestion = -1;
}

function showSuggestions(items) {
    suggestionItems = items.slice(0, 8);
    selectedSuggestion = -1;
    suggestionBox.replaceChildren();

    if (!suggestionItems.length) {
        hideSuggestions();
        return;
    }

    suggestionItems.forEach((text, index) => {
        const button = document.createElement("button");

        button.className = "suggestion";
        button.type = "button";
        button.id = `suggestion-${index}`;
        button.setAttribute("role", "option");
        button.setAttribute("aria-selected", "false");

        const icon = document.createElement("span");
        icon.className = "suggestion-icon";
        icon.textContent = "⌕";

        const label = document.createElement("span");
        label.className = "suggestion-text";
        label.textContent = text;

        button.append(icon, label);

        button.addEventListener("pointerdown", event => {
            event.preventDefault();
        });

        button.addEventListener("click", () => {
            searchBox.value = text;
            runSearch(text);
        });

        suggestionBox.append(button);
    });

    suggestionBox.hidden = false;
    searchBox.setAttribute("aria-expanded", "true");
}

async function loadSuggestions(query, requestId) {
    try {
        const response = await fetch(
            `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`
        );

        if (!response.ok) return;

        const data = await response.json();

        if (
            requestId !== suggestionRequest ||
            document.activeElement !== searchBox
        ) {
            return;
        }

        const list = Array.isArray(data[1]) ? data[1] : [];

        showSuggestions(list);
    } catch {
        // Search suggestions are optional.
    }
}

function updateSuggestions() {
    searchClear.hidden = !searchBox.value;

    clearTimeout(suggestionTimer);

    const query = searchBox.value.trim();
    const requestId = ++suggestionRequest;

    if (query.length < 2 || /^https?:\/\//i.test(query)) {
        hideSuggestions();
        return;
    }

    suggestionTimer = setTimeout(() => {
        loadSuggestions(query, requestId);
    }, 150);
}

function setSelectedSuggestion(next) {
    const buttons = [...suggestionBox.querySelectorAll(".suggestion")];

    if (!buttons.length) return;

    selectedSuggestion = (next + buttons.length) % buttons.length;

    buttons.forEach((button, index) => {
        button.setAttribute(
            "aria-selected",
            String(index === selectedSuggestion)
        );

        button.classList.toggle(
            "selected",
            index === selectedSuggestion
        );
    });

    searchBox.setAttribute(
        "aria-activedescendant",
        buttons[selectedSuggestion].id
    );

    searchBox.value = suggestionItems[selectedSuggestion];
    searchClear.hidden = !searchBox.value;
}

// event handler

searchForm.addEventListener("submit", event => {
    event.preventDefault();
    runSearch(searchBox.value);
});

searchBox.addEventListener("input", updateSuggestions);

searchBox.addEventListener("keydown", event => {
    const open = !suggestionBox.hidden;

    if (event.key === "ArrowDown" && open) {
        event.preventDefault();
        setSelectedSuggestion(selectedSuggestion + 1);
    } else if (event.key === "ArrowUp" && open) {
        event.preventDefault();

        setSelectedSuggestion(
            selectedSuggestion <= 0
                ? suggestionItems.length - 1
                : selectedSuggestion - 1
        );
    } else if (event.key === "Escape") {
        if (open) {
            hideSuggestions();
        } else {
            searchBox.value = "";
            searchClear.hidden = true;
        }
    } else if (event.key === "Tab" && open) {
        hideSuggestions();
    }
});

searchClear.addEventListener("click", () => {
    searchBox.value = "";
    searchClear.hidden = true;
    hideSuggestions();
    searchBox.focus();
});

document.addEventListener("pointerdown", event => {
    if (!event.target.closest(".search-wrap")) {
        hideSuggestions();
    }
});

// Focus handling

document.addEventListener("keydown", event => {
    if (
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        document.activeElement === searchBox
    ) {
        return;
    }

    if (event.key === "/") {
        event.preventDefault();
        searchBox.focus();
    } else if (event.key.length === 1) {
        searchBox.focus();
    }
});

if (location.search !== "?focus") {
    location.search = "?focus";
} else {
    window.addEventListener("DOMContentLoaded", () => {
        searchBox.focus();
    });
}

// plugins

async function loadPlugins() {
    try {
        const response = await fetch(
            getResourceURL("plugins/plugins.conf")
        );

        if (!response.ok) {
            throw new Error(
                `Could not load plugins.conf: HTTP ${response.status}`
            );
        }

        const config = await response.text();

        const plugins = config
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line && !line.startsWith("#"))
            .map(line => {
                const separator = line.indexOf("=");

                if (separator === -1) return null;

                return {
                    name: line.slice(0, separator).trim(),
                    entry: line.slice(separator + 1).trim()
                };
            })
            .filter(plugin =>
                plugin &&
                /^[a-zA-Z0-9_-]+$/.test(plugin.name) &&
                plugin.entry.endsWith(".js") &&
                !plugin.entry.startsWith("/") &&
                !plugin.entry.includes("..") &&
                !plugin.entry.includes(":")
            );

        for (const plugin of plugins) {
            try {
                const pluginUrl = getResourceURL(plugin.entry);
                const module = await import(pluginUrl);

                if (typeof module.init === "function") {
                    await module.init();
                }

                console.info(`Loaded plugin: ${plugin.name}`);
            } catch (error) {
                console.error(
                    `Failed to load plugin "${plugin.name}":`,
                    error
                );
            }
        }
    } catch (error) {
        console.error("Plugin loader failed:", error);
    }
}

loadPlugins();