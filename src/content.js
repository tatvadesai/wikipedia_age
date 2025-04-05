(() => {
    // --- Constants ---
    const AGE_STYLE = {
        color: '#555',
        padding: '1px 3px',
        borderRadius: '2px',
        fontSize: '0.88em',
        fontStyle: 'italic',
        marginLeft: '3px',
        verticalAlign: 'baseline',
        cursor: 'default', // Indicate it's not interactive
        whiteSpace: 'nowrap' // Prevent wrapping
    };
    const MAIN_CONTENT_SELECTOR = '.mw-parser-output';
    const INFOBOX_SELECTOR = '.infobox, .infobox_v3';
    const WRAPPER_CLASS = 'wiki-year-age-wrapper'; // Class for the wrapper span
    const EXCLUDED_SELECTORS = `.reference, .mw-references-wrap, .mw-editsection, .mw-cite-backlink, .noprint, .metadata, .navbox, .catlinks, .thumb, .gallery, .wikitable, .infobox, .infobox_v3, .${WRAPPER_CLASS}`; // Add wrapper class here
    const DEBOUNCE_DELAY = 300; // ms

    // --- State ---
    let birthYear = null;
    let deathYear = null;
    let observer = null;
    let processingTimeout = null;
    const processedNodes = new WeakSet(); // Track processed text nodes

    // --- Utility Functions ---
    function log(...args) {
        // console.log('[WikiAge]', ...args); // Uncomment for debugging
    }

    function createAgeSpan(age) {
        const span = document.createElement('span');
        span.textContent = `(age ${age})`;
        span.classList.add('wiki-age-annotation'); // Add class for potential future styling/selection
        Object.assign(span.style, AGE_STYLE);
        return span;
    }

    /**
     * Creates a wrapper span containing the year text and the age span.
     * @param {string} yearText The original year text (e.g., "1995").
     * @param {number} age The calculated age.
     * @returns {Element} The wrapper span element.
     */
    function createYearAgeWrapper(yearText, age) {
        const wrapper = document.createElement('span');
        wrapper.classList.add(WRAPPER_CLASS);
        wrapper.style.whiteSpace = 'nowrap'; // Keep year and age together

        wrapper.appendChild(document.createTextNode(yearText)); // Add original year text
        wrapper.appendChild(createAgeSpan(age)); // Add the age span

        return wrapper;
    }


    // --- Core Logic ---

    /**
     * Finds the birth and death years from the page content (infobox primarily).
     */
    function findYears() {
        const infobox = document.querySelector(INFOBOX_SELECTOR);
        let foundBirth = null;
        let foundDeath = null;

        if (infobox) {
            // Try finding birth year in infobox
            const birthRows = Array.from(infobox.querySelectorAll('tr, th, td')).filter(row =>
                /born|birth date/i.test(row.textContent)
            );
            for (const row of birthRows) {
                const match = row.textContent.match(/\b(\d{4})\b/); // Find the first 4-digit year
                if (match) {
                    foundBirth = parseInt(match[1], 10);
                    break; // Take the first match in the 'born' rows
                }
            }

            // Try finding death year in infobox
            const deathRows = Array.from(infobox.querySelectorAll('tr, th, td')).filter(row =>
                /died|death date/i.test(row.textContent)
            );
            for (const row of deathRows) {
                const match = row.textContent.match(/\b(\d{4})\b/); // Find the first 4-digit year
                if (match) {
                    foundDeath = parseInt(match[1], 10);
                    break; // Take the first match in the 'died' rows
                }
            }
        }

        // Basic fallback: Check first paragraph if birth year not found in infobox
        if (!foundBirth) {
            const firstParagraph = document.querySelector(`${MAIN_CONTENT_SELECTOR} > p`);
            if (firstParagraph) {
                // Look for patterns like (born 1950), (1950–...), b. 1950
                 const match = firstParagraph.textContent.match(/(?:\(|b\.\s)\s*(\d{4})\s*(?:–|-|—|\))/);
                 if (match) {
                     foundBirth = parseInt(match[1], 10);
                 }
            }
        }

        log(`Found years: Birth=${foundBirth}, Death=${foundDeath}`);
        return { birthYear: foundBirth, deathYear: foundDeath };
    }

    /**
     * Processes a single text node to insert age annotations.
     * @param {Node} textNode The text node to process.
     */
    function processNode(textNode) {
        if (!textNode || !textNode.textContent || processedNodes.has(textNode) || !birthYear) {
            return;
        }

        // Avoid processing nodes inside excluded elements that might have slipped through the walker filter
        if (textNode.parentElement && textNode.parentElement.closest(EXCLUDED_SELECTORS)) {
            return;
        }

        const text = textNode.textContent;
        // Regex to find 4-digit numbers that look like years (basic check)
        // Avoid matching things like 'ISO 8601' or numbers clearly not years.
        // This regex looks for 4 digits, not preceded by another digit or / (like in dates 12/2024)
        // and not immediately followed by 'px', 'em', '%', etc. or another digit.
        const yearRegex = /(?<![\d/])(\b\d{4}\b)(?!\s*(?:px|em|%|deg)|[\d])/g;
        let match;
        let lastIndex = 0;
        const fragment = document.createDocumentFragment();
        let replaced = false;

        while ((match = yearRegex.exec(text)) !== null) {
            const year = parseInt(match[1], 10);
            const currentYear = new Date().getFullYear();

            // Basic sanity check for year range
            if (year >= birthYear && year <= (deathYear || currentYear)) {
                const age = year - birthYear;

                // Add text before the year
                fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
                // Add the wrapper containing the year and age span
                fragment.appendChild(createYearAgeWrapper(match[0], age));

                lastIndex = yearRegex.lastIndex; // Use regex lastIndex after match
                replaced = true;
            }
        }

        if (replaced) {
            // Add any remaining text after the last match
            fragment.appendChild(document.createTextNode(text.substring(lastIndex)));

            // Replace the original text node with the fragment
            try {
                if (textNode.parentNode) {
                    // Mark original node as processed *before* replacing
                    processedNodes.add(textNode);
                    textNode.parentNode.replaceChild(fragment, textNode);
                    log('Replaced node with age:', textNode);
                }
            } catch (error) {
                log('Error replacing node:', error);
                // Node might have been removed by other scripts or DOM changes
            }
        } else {
             // Mark as processed even if no replacement happened to avoid re-checking
             processedNodes.add(textNode);
        }
    }

    /**
     * Finds and processes all relevant text nodes within a given root element.
     * @param {Element} rootElement The element to search within.
     */
    function processRelevantNodes(rootElement) {
        if (!rootElement || !birthYear) return; // Don't process if no birth year or root

        log('Processing nodes under:', rootElement);
        const walker = document.createTreeWalker(
            rootElement,
            NodeFilter.SHOW_TEXT,
            { // Filter function
                acceptNode: function(node) {
                    // Basic checks: non-empty, not already processed
                    if (!node.textContent.trim() || processedNodes.has(node)) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    // Skip nodes within explicitly excluded sections (including our own wrapper)
                    if (node.parentElement && node.parentElement.closest(EXCLUDED_SELECTORS)) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    // Skip script/style tags content
                    const parentTag = node.parentElement?.tagName?.toUpperCase();
                    if (parentTag === 'SCRIPT' || parentTag === 'STYLE') {
                        return NodeFilter.FILTER_REJECT;
                    }
                    // Check if text likely contains a 4-digit year
                    if (/\b\d{4}\b/.test(node.textContent)) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                    return NodeFilter.FILTER_REJECT;
                }
            }
        );

        let node;
        const nodesToProcess = [];
        // Collect nodes first to avoid issues with modifying the DOM during traversal
        while (node = walker.nextNode()) {
            nodesToProcess.push(node);
        }

        log(`Found ${nodesToProcess.length} potential text nodes to process.`);
        // Process collected nodes
        nodesToProcess.forEach(processNode);
    }

    /**
     * Observes the main content area for changes and triggers reprocessing.
     */
    function observeContentChanges() {
        const targetNode = document.querySelector(MAIN_CONTENT_SELECTOR);
        if (!targetNode) {
            log('Main content area not found for observation.');
            return;
        }

        if (observer) {
            observer.disconnect(); // Disconnect previous observer if any
        }

        observer = new MutationObserver((mutationsList) => {
            let needsProcessing = false;
            for (const mutation of mutationsList) {
                // We are interested if nodes were added or removed, or if character data changed
                 if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    needsProcessing = true;
                    break;
                 }
                 // Less common, but handle text changes directly within observed nodes
                 if (mutation.type === 'characterData') {
                     needsProcessing = true;
                     break;
                 }
            }

            if (needsProcessing) {
                log('DOM change detected, debouncing processing...');
                clearTimeout(processingTimeout);
                processingTimeout = setTimeout(() => {
                    log('Processing nodes after DOM change.');
                    // Re-process the entire content area on change, as identifying
                    // exactly which new nodes need processing can be complex.
                    // The `processedNodes` WeakSet prevents redundant work.
                    processRelevantNodes(targetNode);
                }, DEBOUNCE_DELAY);
            }
        });

        const config = {
            childList: true, // Observe direct children additions/removals
            subtree: true,   // Observe all descendants
            characterData: true // Observe text changes within nodes
        };
        observer.observe(targetNode, config);
        log('MutationObserver set up on:', targetNode);
    }

    /**
     * Initializes the extension on the current page.
     */
    function init() {
        log('Initializing Wikipedia Age Calculator...');

        // Don't run on main page, special pages, or non-article pages
        if (location.pathname === '/wiki/Main_Page' || location.pathname.startsWith('/wiki/Special:') || !location.pathname.startsWith('/wiki/')) {
             log('Skipping non-article page:', location.pathname);
             return;
        }

        // Remove any annotations from previous runs (e.g., after back/forward navigation)
        document.querySelectorAll('.wiki-age-annotation').forEach(span => span.remove());

        const years = findYears();
        birthYear = years.birthYear;
        deathYear = years.deathYear;

        if (!birthYear) {
            log('No birth year found. Aborting.');
            return; // Essential info missing
        }

        const mainContent = document.querySelector(MAIN_CONTENT_SELECTOR);
        if (!mainContent) {
             log('Main content area not found. Aborting.');
             return;
        }

        // Initial processing of the page content
        processRelevantNodes(mainContent);

        // Set up observer for dynamic content loading
        observeContentChanges();

        log('Initialization complete.');
    }

    // --- Run ---
    // Since run_at is document_idle, the DOM should be ready.
    init();

})(); // IIFE to avoid polluting global scope
