
// websites ke shortcuts
const SITES = [
    { key: "Y", label: "youtube.com", url: "https://youtube.com" },
    { key: "G", label: "github.com", url: "https://github.com" },
];

//
const KEY = "home.workspace.v4";
const OLD_KEYS = ["home.workspace.v3", "home.workspace.v2", "home.workspace.v1"];

const $ = (id) => document.getElementById(id);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
};

const searchBox = $("search");
const workspace = $("workspace");
const tree = $("tree");
const folderInput = $("folder-input");
const taskInput = $("task-input");
const taskDue = $("task-due");
const taskList = $("task-list");
const noteList = $("note-list");
const showDoneBtn = $("show-done");
const views = { tasks: $("view-tasks"), notes: $("view-notes") };

// search box
searchBox.closest("form").addEventListener("submit", (e) => {
    searchBox.value = searchBox.value.trim();
    if (!searchBox.value) e.preventDefault();
});

// task, notes storage systummmm
function normalize(d) {
    const items = (k) =>
        (Array.isArray(d?.[k]) ? d[k] : [])
            .filter((i) => i && typeof i.text === "string")
            .map((i) => ({ id: i.id || uid(), node: i.node ?? i.cat, text: i.text, done: !!i.done, due: typeof i.due === "string" ? i.due : "", desc: typeof i.desc === "string" ? i.desc : "" }));
    const raw = Array.isArray(d?.nodes) ? d.nodes : Array.isArray(d?.cats) ? d.cats : [];
    const s = {
        nodes: raw.filter((n) => n && n.id && n.name).map((n) => ({ id: n.id, name: n.name, parent: n.parent ?? null, open: n.open !== false })),
        tasks: items("tasks"),
        notes: items("notes"),
    };
    if (!s.nodes.length) s.nodes = [{ id: uid(), name: "Personal", parent: null, open: true }];

    const ids = new Set(s.nodes.map((n) => n.id));
    s.nodes.forEach((n) => { if (!ids.has(n.parent) || n.parent === n.id) n.parent = null; });

    // items without a valid, general me jaenge
    const orphans = [...s.tasks, ...s.notes].filter((i) => !ids.has(i.node));
    if (orphans.length) {
        const general = { id: uid(), name: "General", parent: null, open: true };
        s.nodes.push(general);
        ids.add(general.id);
        orphans.forEach((i) => (i.node = general.id));
    }

    s.sel = [d?.sel, d?.panes?.[0]?.node].find((x) => ids.has(x)) ?? s.nodes[0].id;
    s.view = d?.view === "notes" ? "notes" : "tasks";
    s.showDone = !!d?.showDone;
    return s;
}

function load() {
    try {
        const raw = [KEY, ...OLD_KEYS].map((k) => localStorage.getItem(k)).find(Boolean);
        return normalize(raw ? JSON.parse(raw) : null);
    } catch {
        return normalize(null);
    }
}

const state = load();
const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage unavailable */ }
};
save();

const nodeById = (id) => state.nodes.find((n) => n.id === id);
const childrenOf = (id) => state.nodes.filter((n) => n.parent === id);
function pathOf(id) {
    const parts = [];
    for (let n = nodeById(id); n && parts.length < 20; n = nodeById(n.parent)) parts.unshift(n.name);
    return parts.join(" / ");
}
function today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// folder management (not hotel management)
let addParent = null; 

function folder(node) {
    const kids = childrenOf(node.id);
    const li = el("li");
    const row = el("div", node.id === state.sel ? "t-row current" : "t-row");

    let chev;
    if (kids.length) {
        chev = el("button", "chev", node.open ? "▾" : "▸");
        chev.type = "button";
        chev.setAttribute("aria-expanded", String(node.open));
        chev.setAttribute("aria-label", `${node.open ? "Collapse" : "Expand"} ${node.name}`);
        chev.addEventListener("click", () => { node.open = !node.open; save(); renderTree(); });
    } else {
        chev = el("span", "chev");
    }

    const btn = el("button", "t-btn", node.name);
    btn.type = "button";
    if (node.id === state.sel) btn.setAttribute("aria-current", "true");
    btn.addEventListener("click", () => selectNode(node.id));

    const n = state[state.view === "notes" ? "notes" : "tasks"].filter((i) => i.node === node.id && (state.view === "notes" || !i.done)).length;
    const count = el("span", "count", n ? String(n) : "");

    const add = el("button", "icon-btn", "+");
    add.type = "button";
    add.setAttribute("aria-label", `New folder inside ${node.name}`);
    add.addEventListener("click", () => startAdd(node.id));

    const rm = el("button", "icon-btn", "×");
    rm.type = "button";
    rm.setAttribute("aria-label", `Delete ${node.name}`);
    rm.addEventListener("click", () => removeNode(node));

    row.append(chev, btn, count, add, rm);
    li.append(row);
    if (node.open && kids.length) {
        const ul = el("ul");
        kids.forEach((c) => ul.append(folder(c)));
        li.append(ul);
    }
    return li;
}

const renderTree = () => tree.replaceChildren(...childrenOf(null).map(folder));

function selectNode(id) {
    state.sel = id;
    save();
    renderAll();
}

function removeNode(node) {
    const doomed = new Set([node.id]);
    for (let grew = true; grew; ) {
        grew = false;
        state.nodes.forEach((n) => { if (doomed.has(n.parent) && !doomed.has(n.id)) { doomed.add(n.id); grew = true; } });
    }
    const count = [...state.tasks, ...state.notes].filter((i) => doomed.has(i.node)).length;
    if (count && !confirm(`Delete "${node.name}" and its ${count} item(s)?`)) return;

    state.nodes = state.nodes.filter((n) => !doomed.has(n.id));
    state.tasks = state.tasks.filter((i) => !doomed.has(i.node));
    state.notes = state.notes.filter((i) => !doomed.has(i.node));
    if (!state.nodes.length) state.nodes.push({ id: uid(), name: "Personal", parent: null, open: true });
    if (doomed.has(state.sel)) state.sel = state.nodes[0].id;
    save();
    renderAll();
}

function startAdd(parent) {
    addParent = parent;
    folderInput.placeholder = parent ? `New folder in ${nodeById(parent).name}` : "New folder";
    folderInput.hidden = false;
    folderInput.focus();
}
function stopAdd() {
    folderInput.hidden = true;
    folderInput.value = "";
}

$("add-folder").addEventListener("click", () => (folderInput.hidden ? startAdd(null) : stopAdd()));
folderInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        const name = folderInput.value.trim();
        if (!name) return;
        const node = { id: uid(), name, parent: addParent, open: true };
        if (addParent) nodeById(addParent).open = true;
        state.nodes.push(node);
        state.sel = node.id;
        save();
        stopAdd();
        renderAll();
    } else if (e.key === "Escape") {
        e.stopPropagation();
        stopAdd();
        $("add-folder").focus();
    }
});

// tasks functionaliy
function renderTasks(newId) {
    const mine = state.tasks.filter((t) => t.node === state.sel);
    const open = mine.filter((t) => !t.done).sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999"));
    const done = mine.filter((t) => t.done);
    const shown = state.showDone ? [...open, ...done] : open;

    showDoneBtn.hidden = done.length === 0;
    showDoneBtn.textContent = `${state.showDone ? "Hide" : "Show"} completed (${done.length})`;
    showDoneBtn.setAttribute("aria-pressed", String(state.showDone));

    taskList.replaceChildren(...shown.map((t) => makeTask(t, t.id === newId)));
    $("task-empty").hidden = shown.length > 0;
}

function makeTask(t, isNew) {
    const li = el("li", isNew ? "new" : "");
    li.classList.toggle("done", t.done);

    const check = el("input");
    check.type = "checkbox";
    check.checked = t.done;
    check.setAttribute("aria-label", "Mark done");
    check.addEventListener("change", () => {
        t.done = check.checked;
        li.classList.toggle("done", t.done);
        save();
        setTimeout(() => { renderTasks(); renderTree(); }, 450); // completed tasks tuck away
    });

    const title = el("input", "t-title");
    title.type = "text";
    title.maxLength = 200;
    title.value = t.text;
    title.setAttribute("aria-label", "Task");
    title.addEventListener("input", () => { if (title.value.trim()) { t.text = title.value; save(); } });
    title.addEventListener("blur", () => { t.text = t.text.trim(); title.value = t.text; save(); });
    title.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === "Escape") { e.stopPropagation(); title.blur(); }
    });

    const due = el("input", "due");
    due.type = "date";
    due.value = t.due;
    due.setAttribute("aria-label", "Deadline");
    due.classList.toggle("empty", !t.due);
    due.classList.toggle("overdue", !!t.due && t.due < today() && !t.done);
    due.addEventListener("change", () => { t.due = due.value; save(); renderTasks(); });

    const rm = el("button", "remove", "×");
    rm.type = "button";
    rm.setAttribute("aria-label", "Remove task");
    rm.addEventListener("click", () => removeItem("tasks", t, li));

    li.append(check, title, due, rm);
    return li;
}

$("task-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const text = taskInput.value.trim();
    if (!text) return;
    const t = { id: uid(), node: state.sel, text, done: false, due: taskDue.value, desc: "" };
    state.tasks.unshift(t);
    taskInput.value = "";
    taskDue.value = "";
    save();
    renderTasks(t.id);
    renderTree();
});
taskInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && taskInput.value) { e.stopPropagation(); taskInput.value = ""; }
});
showDoneBtn.addEventListener("click", () => { state.showDone = !state.showDone; save(); renderTasks(); });

// notes fucntionality
function autosize(ta) {
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
}

function renderNotes(newId) {
    const mine = state.notes.filter((n) => n.node === state.sel);
    noteList.replaceChildren(...mine.map((n) => makeNote(n, n.id === newId)));
    noteList.querySelectorAll("textarea").forEach(autosize);
    $("note-empty").hidden = mine.length > 0;
}

function makeNote(n, isNew) {
    const li = el("li", isNew ? "new" : "");

    const ta = el("textarea", "note-text");
    ta.value = n.text;
    ta.placeholder = "Write something…";
    ta.setAttribute("aria-label", "Note");
    ta.addEventListener("input", () => { n.text = ta.value; autosize(ta); save(); });
    ta.addEventListener("blur", () => {
        if (ta.value.trim()) return;
        state.notes = state.notes.filter((x) => x.id !== n.id); // empty notes discard themselves
        save();
        renderNotes();
        renderTree();
    });
    ta.addEventListener("keydown", (e) => {
        if (e.key === "Escape") { e.stopPropagation(); ta.blur(); }
    });

    const rm = el("button", "remove", "×");
    rm.type = "button";
    rm.setAttribute("aria-label", "Remove note");
    rm.addEventListener("click", () => removeItem("notes", n, li));
    li.append(ta, rm);
    return li;
}

$("add-note").addEventListener("click", () => {
    const n = { id: uid(), node: state.sel, text: "", done: false, due: "", desc: "" };
    state.notes.unshift(n);
    save();
    renderNotes(n.id);
    renderTree();
    noteList.querySelector("textarea")?.focus();
});

function removeItem(kind, item, li) {
    state[kind] = state[kind].filter((x) => x.id !== item.id);
    save();
    li.classList.add("leaving");
    setTimeout(() => { renderTasks(); renderNotes(); renderTree(); }, 240); 
}

function renderAll() {
    // $("crumb").textContent = pathOf(state.sel);
    renderTree();
    renderTasks();
    renderNotes();
}


let active = null;

function show(view) {
    const changedView = view && view !== state.view;
    active = view;
    if (view) { state.view = view; save(); }
    const v = state.view;

    workspace.dataset.view = v;
    Object.entries(views).forEach(([k, node]) => {
        node.classList.toggle("on", k === v);
        node.inert = k !== v;
    });
    document.querySelectorAll(".tab").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.view === v)));
    document.body.classList.toggle("ws-open", !!view);
    workspace.inert = !view;
    workspace.setAttribute("aria-hidden", String(!view));

    if (changedView) renderTree(); // folder counts follow the active view
    if (view) (view === "tasks" ? taskInput : $("add-note")).focus({ preventScroll: true });
    else searchBox.focus({ preventScroll: true });
}
const toggle = (view) => show(active === view ? null : view);

document.querySelectorAll(".tab").forEach((b) => b.addEventListener("click", () => show(b.dataset.view)));

// keyboard (mechanical nahi h)
document.addEventListener("keydown", (e) => {
    const a = document.activeElement;
    const inSearch = a === searchBox;
    const inField = a.matches("input, textarea");

    if (e.altKey && !e.ctrlKey && !e.metaKey) {
        if (e.code === "KeyT") { e.preventDefault(); toggle("tasks"); }
        else if (e.code === "KeyN") { e.preventDefault(); toggle("notes"); }
        else {
            const site = SITES.find((s) => e.code === `Key${s.key}`);
            if (site) { e.preventDefault(); window.location.href = site.url; }
        }
        return;
    }

    if (e.key === "Escape") {
        if (inSearch && searchBox.value) searchBox.value = "";
        else if (active) show(null);
        return;
    }

    if (inField || e.ctrlKey || e.metaKey) return;

    // slash daba ke likhenge toh searchbox me likha jaega
    if (e.key === "/") { e.preventDefault(); searchBox.focus(); return; }

    // keyboard me kuch bhi dabenge toh search box me aaega
    if (!active && e.key.length === 1) searchBox.focus();
});

window.addEventListener("pageshow", () => {
    searchBox.value = "";
    if (!active) searchBox.focus();
});

// init
renderAll();
show(null);