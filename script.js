// search box
const searchBox = document.getElementById("search");
const searchForm = searchBox.closest("form");

// Trim whitespace and block empty searches before the form submits
searchForm.addEventListener("submit", (event) => {
    searchBox.value = searchBox.value.trim();
    if (searchBox.value === "") {
        event.preventDefault();
    }
});

// shortcuts
document.addEventListener("keydown", (event) => {
    const typing = document.activeElement === searchBox;

    // Escape clears the box
    if (event.key === "Escape" && typing) {
        searchBox.value = "";
        return;
    }

    // Ignore everything below while already typing, or for key combos (Ctrl+C, Cmd+R...)
    if (typing || event.ctrlKey || event.altKey || event.metaKey) return;

    // "/" focuses the box without typing the slash
    if (event.key === "/") {
        event.preventDefault();
        searchBox.focus();
        return;
    }

    // Any printable key focuses the box, and the character lands in it
    if (event.key.length === 1) {
        searchBox.focus();
    }
});

// Start fresh when returning with the browser back button
window.addEventListener("pageshow", () => {
    searchBox.value = "";
    searchBox.focus();
});