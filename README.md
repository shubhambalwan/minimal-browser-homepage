# Minimal Browser Homepage

A minimal, keyboard-focused browser homepage with a lightweight workspace for managing **tasks, notes**.

## Features

- **Alt + T** — Open Tasks
- **Alt + N** — Open Notes
- **Alt + Y** — Open YouTube
- **Alt + G** — Open GitHub
- **/** — Focus the search bar
- Any printable key focuses search when the workspace is closed
- Create and organize folders
- Add, edit, complete, and delete tasks
- Tasks and notes are automatically saved using `localStorage`

The workspace contains a folder sidebar and separate Tasks/Notes views.

## Tech Stack

- HTML
- CSS
- Vanilla JavaScript
- Browser `localStorage`

No frameworks or external dependencies are required.

## Custom Shortcuts

Additional websites can be added in `script.js` through the `SITES` array:

```js
const SITES = [
    { key: "Y", label: "youtube.com", url: "https://youtube.com" },
    { key: "G", label: "github.com", url: "https://github.com" },
];
```
## Project Structure

```text
.
├── home.html
├── script.js
├── style.css
└── README.md
```

## License

Free to use and modify for personal projects.