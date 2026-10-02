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

    // "/" focuses the search box from anywhere
    if (event.key === "/" && !typing) {
        event.preventDefault();
        searchBox.focus();
    }

    // Escape clears the box
    if (event.key === "Escape" && typing) {
        searchBox.value = "";
    }
});

// empty search when returning with the browser back button
window.addEventListener("pageshow", () => {
    searchBox.value = "";
    searchBox.focus();
});