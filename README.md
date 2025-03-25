# Wikipedia Age Calculator

A Chrome extension that automatically calculates and displays the age of individuals at mentioned years in Wikipedia articles.

## Features

- Automatically detects birth and death years of people in Wikipedia articles
- Adds age annotations next to all years mentioned in the article
- Works for historical figures and modern individuals
- Handles different Wikipedia page formats and structures
- Supports mobile and desktop Wikipedia pages

## How It Works

The extension:
1. Finds the birth year (and death year if applicable) from the Wikipedia page
2. Identifies all years mentioned throughout the article
3. Calculates the person's age at each mentioned year
4. Displays the age in a subtle annotation next to each year

## Installation

### From Chrome Web Store
*(Coming soon)*

### Manual Installation
1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the `src` folder from this repository
5. The extension is now installed and will work on any Wikipedia article about a person

## Usage

1. Navigate to any Wikipedia article about a person (e.g., [Albert Einstein](https://en.wikipedia.org/wiki/Albert_Einstein))
2. The extension automatically adds age annotations next to years mentioned in the article
3. No configuration needed - it works right out of the box!

## Examples

- For someone born in 1960, the year 1985 in text would show: 1985 (age 25)
- For historical figures, it works the same way (e.g., for Leonardo da Vinci, 1503 would show: 1503 (age 51))

## Contributing

Contributions are welcome! Feel free to submit issues or pull requests.

## License

MIT License 