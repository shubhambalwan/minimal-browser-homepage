const searchBox = document.getElementById("search");

searchBox.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        const query = searchBox.value.trim();

        if (query !== "") {
            window.location.href =
                "https://www.google.com/search?q=" +
                encodeURIComponent(query);
        }
    }
});