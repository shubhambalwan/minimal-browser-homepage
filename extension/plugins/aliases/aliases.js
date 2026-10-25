const CONFIG_PATH = "plugins/aliases/aliases.conf";
const PLACEHOLDER = "{searchTerms}";
const ORIGIN = /^https?:\/\/[^/?#]+/;

async function loadAliases() {
    const response = await fetch(chrome.runtime.getURL(CONFIG_PATH));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const aliases = new Map();

    for (const line of (await response.text()).split(/\r?\n/)) {
        // Split on the first "=" only, since URLs can contain "=" too
        const [name, ...rest] = line.split("=");
        const alias = name.trim().toLowerCase();
        const url = rest.join("=").trim();

        // Comments, blank lines and bad entries all fail these checks
        if (/^[a-z0-9_-]+$/.test(alias) && ORIGIN.test(url)) {
            aliases.set(alias, url);
        }
    }

    return aliases;
}

function resolveTarget(aliases, input) {
    const [key, ...words] = input.trim().split(/\s+/);
    const url = aliases.get(key.toLowerCase());
    if (!url) return null;

    const terms = words.join(" ");

    if (url.includes(PLACEHOLDER)) {
        return terms
            ? url.replaceAll(PLACEHOLDER, encodeURIComponent(terms))
            : url.match(ORIGIN)[0];
    }

    // Plain alias: only matches when nothing follows it
    return terms ? null : url;
}

export async function init() {
    const form = document.getElementById("search-form");
    const input = document.getElementById("search");
    if (!form || !input) return console.error("Aliases plugin: search form not found.");

    let aliases;
    try {
        aliases = await loadAliases();
    } catch (error) {
        return console.error("Could not load aliases:", error);
    }

    form.addEventListener("submit", (event) => {
        const target = resolveTarget(aliases, input.value);
        if (!target) return; // not an alias, let the normal search run

        event.preventDefault();
        window.location.assign(target);
    });
}