# Minimal Browser Homepage

A minimal browser homepage with Google search, search suggestions, and customizable keyboard shortcuts for opening websites.

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Alt + Y` | Open YouTube |
| `Alt + G` | Open GitHub |
| `/` | Focus the search bar |
| `Esc` | Hide suggestions or clear the search |

You can also start typing anywhere on the page to focus the search bar.

## Customizations

### Customize Cursor

Open style.css and find the Cursor Visibility.

To hide the blinking cursor, comment this line:

`#search:focus { border-color: var(--border-focus); caret-color: var(--text); }`

### Customize Shortcuts

Open `script.js` and find the `SITES` array at the top:

```js
const SITES = [
    { key: "Y", url: "https://youtube.com" },
    { key: "G", url: "https://github.com" },
];
```

Add, remove, or modify entries to customize your shortcuts.

For example, to add Reddit with `Alt + R`:

```js
{ key: "R", url: "https://reddit.com" },
```

Use a single uppercase letter for `key` and the website's URL for `url`. Save the file and reload the extension.

## Installation

1. Download or clone this repository.
2. Open `chrome://extensions` in your Chromium-based browser.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the project folder containing `manifest.json`.
6. Open a new tab to use your homepage.

To apply changes after editing files, click the **Reload** icon on the extension's card.