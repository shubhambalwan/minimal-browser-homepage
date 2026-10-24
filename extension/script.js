////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

// Alt + key shortcuts
const SITES = [
    { key: "Y", url: "https://youtube.com" },
    { key: "G", url: "https://github.com" },
    // { key: "M", url: "https://mail.google.com" },
];

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

const searchBox = document.getElementById("search");
const searchForm = document.getElementById("search-form");
const suggestionBox = document.getElementById("suggestions");
const searchClear = document.getElementById("search-clear");

let suggestionItems = [];
let selectedSuggestion = -1;
let suggestionRequest = 0;
let suggestionTimer = null;

function normalizeUrl(value) {
    const candidate = value.trim();
    if (/^(https?:\/\/|ftp:\/\/)/i.test(candidate)) return candidate;
    if (/^(localhost|([\w-]+\.)+[a-z]{2,})(:\d+)?([/?#].*)?$/i.test(candidate) && !/\s/.test(candidate)) return `https://${candidate}`;
    return null;
}

function runSearch(raw) {
    const query = raw.trim();
    if (!query) return;
    hideSuggestions();
    window.location.assign(normalizeUrl(query) || `https://www.google.com/search?q=${encodeURIComponent(query)}`);
}

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
    if (!suggestionItems.length) { hideSuggestions(); return; }

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
        button.addEventListener("pointerdown", (e) => e.preventDefault());
        button.addEventListener("click", () => { searchBox.value = text; runSearch(text); });
        suggestionBox.append(button);
    });

    suggestionBox.hidden = false;
    searchBox.setAttribute("aria-expanded", "true");
}

async function loadSuggestions(query, requestId) {
    try {
        const response = await fetch(`https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`);
        if (!response.ok) return;
        const data = await response.json();
        if (requestId !== suggestionRequest || document.activeElement !== searchBox) return;
        const list = Array.isArray(data[1]) ? data[1] : [];
        showSuggestions(list);
    } catch { /* suggestions are optional */ }
}

function updateSuggestions() {
    searchClear.hidden = !searchBox.value;
    clearTimeout(suggestionTimer);
    const query = searchBox.value.trim();
    const requestId = ++suggestionRequest;
    if (query.length < 2 || /^https?:\/\//i.test(query)) { hideSuggestions(); return; }
    suggestionTimer = setTimeout(() => loadSuggestions(query, requestId), 150);
}

function setSelectedSuggestion(next) {
    const buttons = [...suggestionBox.querySelectorAll(".suggestion")];
    if (!buttons.length) return;
    selectedSuggestion = (next + buttons.length) % buttons.length;
    buttons.forEach((button, index) => {
        button.setAttribute("aria-selected", String(index === selectedSuggestion));
        button.classList.toggle("selected", index === selectedSuggestion);
    });
    searchBox.setAttribute("aria-activedescendant", buttons[selectedSuggestion].id);
    searchBox.value = suggestionItems[selectedSuggestion];
    searchClear.hidden = !searchBox.value;
}

searchForm.addEventListener("submit", (e) => { e.preventDefault(); runSearch(searchBox.value); });
searchBox.addEventListener("input", updateSuggestions);
searchBox.addEventListener("keydown", (e) => {
    const open = !suggestionBox.hidden;
    if (e.key === "ArrowDown" && open) { e.preventDefault(); setSelectedSuggestion(selectedSuggestion + 1); }
    else if (e.key === "ArrowUp" && open) { e.preventDefault(); setSelectedSuggestion(selectedSuggestion <= 0 ? suggestionItems.length - 1 : selectedSuggestion - 1); }
    else if (e.key === "Escape") {
        if (open) hideSuggestions();
        else { searchBox.value = ""; searchClear.hidden = true; }
    }
    else if (e.key === "Tab" && open) hideSuggestions();
});
searchClear.addEventListener("click", () => {
    searchBox.value = "";
    searchClear.hidden = true;
    hideSuggestions();
    searchBox.focus();
});
document.addEventListener("pointerdown", (e) => { if (!e.target.closest(".search-wrap")) hideSuggestions(); });

// typing anywhere focuses the search box; "/" also focuses it
document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || document.activeElement === searchBox) return;
    if (e.key === "/") { e.preventDefault(); searchBox.focus(); }
    else if (e.key.length === 1) searchBox.focus();
});

// forces focus into the page (not the address bar) on a new tab
if (location.search !== "?focus") {
    location.search = "?focus";
} else {
    window.addEventListener("DOMContentLoaded", () => searchBox.focus());
}

document.addEventListener("keydown", (e) => {
    if (!e.altKey || e.ctrlKey || e.metaKey) return;
    const site = SITES.find((s) => e.code === `Key${s.key}`);
    if (site) {
        e.preventDefault();
        window.location.href = site.url;
    }
});