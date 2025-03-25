# Wikipedia Age Calculator Chrome Extension

This Chrome extension automatically calculates and displays ages next to years mentioned in Wikipedia articles. When reading about a person, it shows how old they were at different points in their life, making biographical articles more engaging and easier to understand.

## Features

- Automatically detects birth year (and death year if applicable) from Wikipedia pages
- Calculates and displays ages next to all years mentioned in the article
- Works with both living and deceased persons
- Stylish, unobtrusive age annotations
- Handles both infobox and article text parsing

## Installation

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the `src` directory from this repository
5. The extension is now installed and ready to use!

## Usage

1. Visit any Wikipedia page about a person
2. The extension will automatically detect their birth year
3. Ages will be displayed next to any years mentioned in the article
4. For deceased persons, ages will only be shown up to their death year

## Examples

Before:
```
In 2014, she appeared in her first film...
```

After:
```
In 2014 (age 15), she appeared in her first film...
```

## Contributing

Feel free to open issues or submit pull requests if you have suggestions for improvements! 