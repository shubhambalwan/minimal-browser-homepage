// ---------- config: add your own shortcuts here ----------
const SHORTCUTS = [
    { keys: ["Alt", "S"], label: "Show / hide shortcuts" },
    { keys: ["Alt", "T"], label: "Open / close tasks and notes" },
    { keys: ["/"], label: "Focus the search box" },
    { keys: ["Esc"], label: "Clear search, close panel" },
    { keys: ["Enter"], label: "Search / add item" },
    // Entries with a url open that site: press the last key while this panel is open, or use Alt + key anywhere.
    { keys: ["Alt", "Y"], label: "Open youtube.com", url: "https://youtube.com" },
    { keys: ["Alt", "G"], label: "Open github.com", url: "https://github.com" },
];

const KEY = "home.workspace.v2";
const OLD_KEY = "home.workspace.v1"; // read once for migration
const DEFAULT_CATEGORIES = ["Personal", "College", "Projects"];

const $ = (id) => document.getElementById(id);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
};

const searchBox = $("search");
const shortcutsPanel = $("shortcuts");
const workspace = $("workspace");
const field = $("field");
const itemsEl = $("items");
const emptyEl = $("empty");
const catList = $("cat-list");
const catInput = $("cat-input");

// ---------- search ----------
searchBox.closest("form").addEventListener("submit", (e) => {
    searchBox.value = searchBox.value.trim();
    if (!searchBox.value) e.preventDefault();
});

// ---------- data (localStorage, with v1 migration) ----------
function normalize(d) {
    const items = (k) =>
        (Array.isArray(d?.[k]) ? d[k] : [])
            .filter((i) => i && typeof i.text === "string")
            .map((i) => ({ id: i.id || uid(), cat: i.cat, text: i.text, done: !!i.done }));

    const s = { cats: [], tasks: items("tasks"), notes: items("notes"), sel: null, mode: d?.mode === "notes" ? "notes" : "tasks" };
    if (Array.isArray(d?.cats)) s.cats = d.cats.filter((c) => c && c.id && c.name);
    if (!s.cats.length) s.cats = DEFAULT_CATEGORIES.map((name) => ({ id: uid(), name }));

    // items without a valid category (e.g. from v1) go into "General"
    const ids = new Set(s.cats.map((c) => c.id));
    const orphans = [...s.tasks, ...s.notes].filter((i) => !ids.has(i.cat));
    if (orphans.length) {
        const general = { id: uid(), name: "General" };
        s.cats.push(general);
        orphans.forEach((i) => (i.cat = general.id));
    }
    s.sel = s.cats.some((c) => c.id === d?.sel) ? d.sel : s.cats[0].id;
    return s;
}

function load() {
    try {
        return normalize(JSON.parse(localStorage.getItem(KEY) || localStorage.getItem(OLD_KEY)));
    } catch {
        return normalize(null);
    }
}

const state = load();
const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage unavailable */ }
};
save();

// ---------- categories ----------
const selectedCat = () => state.cats.find((c) => c.id === state.sel);

function renderCats() {
    catList.replaceChildren(
        ...state.cats.map((cat) => {
            const li = el("li", cat.id === state.sel ? "selected" : "");
            const btn = el("button", "cat-btn", cat.name);
            btn.type = "button";
            if (cat.id === state.sel) btn.setAttribute("aria-current", "true");
            btn.addEventListener("click", () => selectCat(cat.id));

            const rm = el("button", "remove", "×");
            rm.type = "button";
            rm.setAttribute("aria-label", `Delete category ${cat.name}`);
            rm.addEventListener("click", () => removeCat(cat));
            li.append(btn, rm);
            return li;
        })
    );
}

function selectCat(id) {
    state.sel = id;
    save();
    renderCats();
    renderItems();
}

function removeCat(cat) {
    const count = [...state.tasks, ...state.notes].filter((i) => i.cat === cat.id).length;
    if (count && !confirm(`Delete "${cat.name}" and its ${count} item(s)?`)) return;
    state.cats = state.cats.filter((c) => c.id !== cat.id);
    state.tasks = state.tasks.filter((i) => i.cat !== cat.id);
    state.notes = state.notes.filter((i) => i.cat !== cat.id);
    if (!state.cats.length) state.cats.push({ id: uid(), name: "General" });
    if (state.sel === cat.id) state.sel = state.cats[0].id;
    save();
    renderCats();
    renderItems();
}

function toggleCatInput(show) {
    catInput.hidden = !show;
    if (show) catInput.focus();
    else catInput.value = "";
}

$("add-cat").addEventListener("click", () => toggleCatInput(catInput.hidden));
catInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        const name = catInput.value.trim();
        if (!name) return;
        const cat = { id: uid(), name };
        state.cats.push(cat);
        toggleCatInput(false);
        selectCat(cat.id);
    } else if (e.key === "Escape") {
        e.stopPropagation();
        toggleCatInput(false);
        $("add-cat").focus();
    }
});

// ---------- tasks + notes ----------
function makeItem(item, kind) {
    const li = el("li");
    const text = el("span", "text", item.text); // textContent keeps user text safe

    if (kind === "tasks") {
        const check = el("input");
        check.type = "checkbox";
        check.checked = item.done;
        check.setAttribute("aria-label", "Mark task done");
        check.addEventListener("change", () => {
            item.done = check.checked;
            li.classList.toggle("done", item.done);
            save();
        });
        li.classList.toggle("done", item.done);
        li.append(check, text);
    } else {
        li.append(text);
    }

    const rm = el("button", "remove", "×");
    rm.type = "button";
    rm.setAttribute("aria-label", kind === "tasks" ? "Remove task" : "Remove note");
    rm.addEventListener("click", () => removeItem(item, kind, li));
    li.append(rm);
    return li;
}

function visibleItems() {
    return state[state.mode].filter((i) => i.cat === state.sel);
}

function syncEmpty() {
    const none = itemsEl.children.length === 0;
    emptyEl.hidden = !none;
    emptyEl.textContent = state.mode === "tasks" ? "Nothing to do here yet." : "No notes in this category yet.";
}

function renderItems() {
    const mode = state.mode;
    $("cat-title").textContent = selectedCat().name;
    document.querySelectorAll(".tabs button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
    field.placeholder = mode === "tasks" ? "Add a task, press Enter" : "Write a note, Enter to save (Shift+Enter for a new line)";
    itemsEl.className = `items ${mode} skip-anim`; // no entrance animation when switching views
    itemsEl.replaceChildren(...visibleItems().map((i) => makeItem(i, mode)));
    requestAnimationFrame(() => itemsEl.classList.remove("skip-anim"));
    syncEmpty();
}

function addItem(text) {
    const item = { id: uid(), cat: state.sel, text, done: false };
    state[state.mode].unshift(item);
    save();
    itemsEl.prepend(makeItem(item, state.mode));
    syncEmpty();
}

function removeItem(item, kind, li) {
    state[kind] = state[kind].filter((i) => i.id !== item.id);
    save();
    li.classList.add("leaving");
    const done = () => { li.remove(); syncEmpty(); };
    li.addEventListener("transitionend", done, { once: true });
    setTimeout(done, 400); // fallback if no transition fires
}

document.querySelectorAll(".tabs button").forEach((b) =>
    b.addEventListener("click", () => {
        state.mode = b.dataset.mode;
        save();
        renderItems();
    })
);

field.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !(e.shiftKey && state.mode === "notes")) {
        e.preventDefault();
        const text = field.value.trim();
        if (!text) return;
        addItem(text);
        field.value = "";
    } else if (e.key === "Escape") {
        e.stopPropagation(); // first Esc leaves the field, second closes the workspace
        field.blur();
    }
});

// ---------- shortcuts panel ----------
const siteLinks = SHORTCUTS.filter((s) => s.url);
const hotkey = (s) => s.keys[s.keys.length - 1].toLowerCase();

shortcutsPanel.querySelector("#shortcut-list").replaceChildren(
    ...SHORTCUTS.map(({ keys, label, url }, i) => {
        const li = el("li");
        li.style.setProperty("--i", i);
        const combo = el("div");
        keys.forEach((k) => combo.append(el("kbd", "", k)));
        const text = el("span", "label", label);
        if (url) {
            const a = el("a");
            a.href = url;
            a.append(combo, text);
            li.append(a);
        } else {
            li.append(combo, text);
        }
        return li;
    })
);

// ---------- panels: only one active at a time ----------
let active = null; // null | "tasks" | "shortcuts"

function setPanel(name) {
    active = name;
    document.body.classList.toggle("tasks-open", name === "tasks");
    document.body.classList.toggle("shortcuts-open", name === "shortcuts");
    [[workspace, "tasks"], [shortcutsPanel, "shortcuts"]].forEach(([node, key]) => {
        node.inert = name !== key;
        node.setAttribute("aria-hidden", String(name !== key));
    });
    if (name === "tasks") field.focus({ preventScroll: true });
    else if (name === "shortcuts") shortcutsPanel.focus({ preventScroll: true });
    else searchBox.focus({ preventScroll: true });
}
const togglePanel = (name) => setPanel(active === name ? null : name);

// ---------- global keyboard ----------
document.addEventListener("keydown", (e) => {
    const a = document.activeElement;
    const inSearch = a === searchBox;
    const inField = a.matches("input, textarea");

    if (e.altKey && !e.ctrlKey && !e.metaKey) {
        if (e.code === "KeyS") { e.preventDefault(); togglePanel("shortcuts"); }
        else if (e.code === "KeyT") { e.preventDefault(); togglePanel("tasks"); }
        else {
            const site = siteLinks.find((s) => e.code === `Key${hotkey(s).toUpperCase()}`);
            if (site) { e.preventDefault(); window.location.href = site.url; }
        }
        return;
    }

    if (active === "shortcuts" && !e.ctrlKey && !e.metaKey) {
        const site = siteLinks.find((s) => hotkey(s) === e.key.toLowerCase());
        if (site) { e.preventDefault(); window.location.href = site.url; return; }
    }

    if (e.key === "Escape") {
        if (active === "shortcuts") setPanel(null);
        else if (inSearch && searchBox.value) searchBox.value = "";
        else if (active === "tasks") setPanel(null);
        return;
    }

    if (inField || e.ctrlKey || e.metaKey) return;

    if (e.key === "/") { e.preventDefault(); searchBox.focus(); return; }
    if (e.key.length === 1) searchBox.focus(); // printable key lands in the search box
});

window.addEventListener("pageshow", () => {
    searchBox.value = "";
    if (!active) searchBox.focus();
});

// ---------- init ----------
renderCats();
renderItems();