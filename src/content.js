// Style for the age annotations
const AGE_STYLE = {
    color: '#555', // Slightly darker grey for better contrast
    padding: '1px 3px', // Slightly reduce padding
    borderRadius: '2px', // Slightly smaller radius
    fontSize: '0.88em', // Slightly smaller font size
    fontStyle: 'italic', // Add italics
    marginLeft: '3px', // Slightly increase margin for separation
    verticalAlign: 'baseline' // Ensure alignment with surrounding text
};

// Track processed nodes to prevent infinite loops
let processedNodes = new WeakSet();
let observer = null;
let processingTimeout = null;
const DEBOUNCE_DELAY = 300; // ms to wait before processing after DOM changes

function findBirthYear() {
    // First try to find birth year in the infobox
    const infobox = document.querySelector('.infobox, .infobox_v3');
    if (infobox) {
        const birthRows = Array.from(infobox.querySelectorAll('tr, th, td')).filter(row =>
            row.textContent.toLowerCase().includes('born') ||
            row.textContent.toLowerCase().includes('b.') ||
            row.textContent.toLowerCase().includes('birth date'));

        for (const row of birthRows) {
            const formats = [
                /\b\d{4}\b/,  // Simple year
                /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\b.*\b\d{4}\b/,  // Month Year
                /\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/,  // Day Month Year
                /\b(?:b\.|born)\s+\d{4}\b/,  // b. YYYY or born YYYY
                /\b(?:b\.|born)\s+(?:[A-Za-z]+\s+\d+,\s+)?\d{4}\b/  // b. Month Day, YYYY
            ];

            for (const format of formats) {
                const match = row.textContent.match(format);
                if (match) {
                    const yearMatch = match[0].match(/\b\d{4}\b/);
                    if (yearMatch) {
                        return parseInt(yearMatch[0]);
                    }
                }
            }
        }
    }

    // If not found in infobox, try the main content area
    const mainContent = document.querySelector('.mw-parser-output');
    if (!mainContent) {
        return null;
    }

    // Method 2: Look in the first few paragraphs for birth year patterns
    const paragraphs = mainContent.querySelectorAll('p');
    const firstFewParagraphs = Array.from(paragraphs).slice(0, 5);

    for (const paragraph of firstFewParagraphs) {
        const patterns = [
            /\(born\s+(?:[A-Za-z]+\s+\d+,\s+)?(\d{4})\)/i,
            /born\s+(?:[A-Za-z]+\s+\d+,\s+)?(\d{4})/i,
            /\b(?:b\.|born)\s+(\d{4})\b/i,
            /\b(?:b\.|born)\s+(?:[A-Za-z]+\s+\d+,\s+)?(\d{4})\b/i,
            /\b((?:b\.\s+)?\d{4})\s*(?:–|-|—)\s*\d{4}\b/i,
            /birth date\s*=\s*(\d{4})/i,
            /date of birth\s*=\s*(\d{4})/i
        ];

        for (const pattern of patterns) {
            const match = paragraph.textContent.match(pattern);
            if (match) {
                const year = match[1] || match[0].match(/\b\d{4}\b/)[0];
                return parseInt(year);
            }
        }
    }

    // Method 3: Look for birth year in the page title or first heading
    const title = document.querySelector('h1#firstHeading') || document.querySelector('.mw-page-title-main');
    if (title) {
        const titleText = title.textContent;
        const patterns = [
            /\((\d{4})(?:\s*[-–—]\s*\d{4})?\)/,
            /\(born\s+(\d{4})\)/i,
            /\b(\d{4})\s*[-–—]\s*\d{4}\b/
        ];

        for (const pattern of patterns) {
            const match = titleText.match(pattern);
            if (match) {
                return parseInt(match[1]);
            }
        }
    }

    return null;
}

function findDeathYear() {
    // Try to find death year in the infobox
    const infobox = document.querySelector('.infobox, .infobox_v3');
    if (infobox) {
        const deathText = Array.from(infobox.querySelectorAll('tr, th, td')).find(row =>
            row.textContent.toLowerCase().includes('died'));
        if (deathText) {
            const yearMatch = deathText.textContent.match(/\b\d{4}\b/);
            if (yearMatch) return parseInt(yearMatch[0]);
        }
    }

    // If not found in infobox, try the main content area
    const mainContent = document.querySelector('.mw-parser-output');
    if (!mainContent) return null;

    // Look for death year in the first few paragraphs
    const paragraphs = mainContent.querySelectorAll('p');
    for (let i = 0; i < Math.min(3, paragraphs.length); i++) {
        const paragraph = paragraphs[i];
        const deathDateMatch = paragraph.textContent.match(/(?:died|d\.) (?:[A-Za-z]+ \d+, )?(\d{4})/);
        if (deathDateMatch) {
            return parseInt(deathDateMatch[1]);
        }
        const yearRangePattern = paragraph.textContent.match(/\b\d{4}\s*(?:–|-|—)\s*(\d{4})\b/);
        if (yearRangePattern) {
            return parseInt(yearRangePattern[1]);
        }
    }

    // Look for death year in the page title
    const title = document.querySelector('h1#firstHeading') || document.querySelector('.mw-page-title-main');
    if (title) {
        const titleText = title.textContent;
        const deathYearMatch = titleText.match(/\(\d{4}\s*[-–—]\s*(\d{4})\)/);
        if (deathYearMatch) {
            return parseInt(deathYearMatch[1]);
        }
    }

    return null;
}

function createAgeSpan(age) {
    const span = document.createElement('span');
    span.textContent = `(age ${age})`;
    span.classList.add('wiki-age-annotation');
    Object.assign(span.style, AGE_STYLE);
    return span;
}

function insertAges(birthYear, deathYear) {
    const mainContent = document.querySelector('.mw-parser-output');
    if (!mainContent) {
        return;
    }

    const yearRegex = /\b\d{4}\b/g;
    const excludedSelectors = '.reference, .mw-references-wrap, .mw-editsection, .mw-cite-backlink, .noprint, .infobox, .metadata, .navbox, .catlinks';

    // Use TreeWalker to find all relevant text nodes in the main content area
    const walker = document.createTreeWalker(
        mainContent,
        NodeFilter.SHOW_TEXT,
        { // Filter function to accept nodes
            acceptNode: function(node) {
                // Skip nodes within excluded sections
                if (node.parentElement && node.parentElement.closest(excludedSelectors)) {
                    return NodeFilter.FILTER_REJECT;
                }
                // Skip nodes that don't contain a 4-digit year
                if (!yearRegex.test(node.textContent)) {
                     // Reset regex lastIndex
                    yearRegex.lastIndex = 0;
                    return NodeFilter.FILTER_REJECT;
                }
                 // Reset regex lastIndex before accepting
                yearRegex.lastIndex = 0;
                return NodeFilter.FILTER_ACCEPT;
            }
        },
        false
    );

    let node;
    const nodesToProcess = [];
    // Collect all nodes first to avoid issues with modifying the DOM during traversal
    while (node = walker.nextNode()) {
        nodesToProcess.push(node);
    }

    // Process collected text nodes
    nodesToProcess.forEach(textNode => {
        // Double-check if already processed (might happen with complex DOM changes)
        if (processedNodes.has(textNode)) return;

        const text = textNode.textContent;
        const matches = Array.from(text.matchAll(yearRegex));
        if (matches.length === 0) return; // Should not happen due to filter, but safe check

        const fragment = document.createDocumentFragment();
        let lastIndex = 0;

        matches.forEach((match) => {
            const year = parseInt(match[0]);
            // Add text before the year
            fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
            // Add the year itself
            fragment.appendChild(document.createTextNode(match[0]));

            // Calculate and add age span if applicable
            if (year >= birthYear && (!deathYear || year <= deathYear)) {
                const age = year - birthYear;
                fragment.appendChild(createAgeSpan(age));
            }
            lastIndex = match.index + match[0].length;
        });

        // Add any remaining text after the last match
        fragment.appendChild(document.createTextNode(text.substring(lastIndex)));

        // Replace the original text node with the fragment
        try {
            if (textNode.parentNode) {
                textNode.parentNode.replaceChild(fragment, textNode);
                // Mark the original node as processed
                processedNodes.add(textNode);
            }
        } catch (error) {
            // Silently fail - node might have been removed during processing
        }
    });
}

// Main function to initialize the extension logic
function processWikipediaPage() {
    // Don't process non-article pages
    if (location.href.includes('/wiki/Main_Page') || 
        location.href.includes('/wiki/Special:') || 
        !location.href.includes('/wiki/')) {
        return;
    }
    
    // Reset internal flags and processed nodes
    document.documentElement.removeAttribute('data-age-processed');
    processedNodes = new WeakSet();
    
    // Remove any previously added age annotations
    document.querySelectorAll('.wiki-age-annotation').forEach(span => {
        if (span.parentNode) {
            span.parentNode.removeChild(span);
        }
    });

    const birthYear = findBirthYear();
    if (!birthYear) {
        // Skip processing if no birth year found
        return;
    }

    const deathYear = findDeathYear();
    insertAges(birthYear, deathYear);

    // Set flag to indicate processing is complete for this page view
    document.documentElement.setAttribute('data-age-processed', 'true');
}

// Debounced function to avoid multiple rapid processings
function debouncedProcessPage() {
    clearTimeout(processingTimeout);
    processingTimeout = setTimeout(() => {
        processWikipediaPage();
    }, DEBOUNCE_DELAY);
}

// Setup MutationObserver to watch for DOM changes
function setupObserver() {
    if (observer) {
        observer.disconnect();
    }
    
    // Watch the entire body for changes instead of just content container
    const bodyElement = document.body;
    if (!bodyElement) return;
    
    observer = new MutationObserver((mutations) => {
        // Process page on any significant DOM changes
        const relevantMutation = mutations.some(mutation => 
            mutation.type === 'childList' || 
            (mutation.type === 'attributes' && 
             (mutation.attributeName === 'class' || mutation.attributeName === 'id'))
        );
        
        if (relevantMutation) {
            debouncedProcessPage();
        }
    });
    
    observer.observe(bodyElement, { 
        childList: true, 
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'id'] 
    });
}

// Handle navigation events for Wikipedia's client-side routing
function setupNavigationListeners() {
    // Listen for popstate events (browser back/forward)
    window.addEventListener('popstate', () => {
        setTimeout(debouncedProcessPage, 300);
    });
    
    // Listen for pageshow events
    window.addEventListener('pageshow', (event) => {
        if (event.persisted) {
            // Page was restored from the bfcache
            setTimeout(debouncedProcessPage, 300);
        }
    });
    
    // Use URL change detection as a fallback
    let lastUrl = location.href;
    setInterval(() => {
        if (lastUrl !== location.href) {
            lastUrl = location.href;
            setTimeout(debouncedProcessPage, 300);
        }
    }, 500);
}

// Initialize on page load
function initializeExtension() {
    // Process the page initially
    debouncedProcessPage();
    
    // Setup observer for content changes
    setupObserver();
    
    // Setup navigation event listeners
    setupNavigationListeners();
}

// Run immediately if document is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
    initializeExtension();
}

// Force processing after a short delay to ensure complete page load
setTimeout(debouncedProcessPage, 1000);
