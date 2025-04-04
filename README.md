# Wikipedia Age Calculator Chrome Extension

A lightweight Chrome extension that automatically detects birth and death years on Wikipedia pages and displays the corresponding age next to every year mentioned in the article.

## Features

- **Automatic Detection**: No manual clicks needed - the extension works as soon as you load a Wikipedia page
- **Robust Birth/Death Year Detection**: Extracts data from infoboxes, article text, and titles
- **Responsive to Page Changes**: Uses MutationObserver to detect dynamic content changes and Wikipedia's internal navigation
- **Minimal Visual Impact**: Subtle age annotations that complement Wikipedia's design

## Installation

### From Chrome Web Store
*(Coming soon)*

### Manual Installation
1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in the top-right corner)
4. Click "Load unpacked" and select the `src` folder from this repository
5. The extension is now installed and will automatically activate on Wikipedia pages

## How It Works

When you visit any Wikipedia biography page, the extension:

1. Automatically scans the page for birth and death years
2. Identifies all years mentioned in the article text
3. For each year that falls between birth and death (or after birth if person is alive), calculates the person's age at that point
4. Inserts a subtle age annotation next to the year

## Example

Original text:
```
Einstein published his theory of general relativity in 1915.
```

With extension:
```
Einstein published his theory of general relativity in 1915 (age 36).
```

## Privacy

This extension:
- Works entirely within your browser
- Does not collect any data
- Does not require any special permissions beyond accessing Wikipedia
- Does not communicate with any external servers

## License

MIT 