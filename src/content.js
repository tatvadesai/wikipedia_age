// Style for the age annotations
const AGE_STYLE = {
    color: '#666',
    backgroundColor: '#f8f9fa',
    padding: '2px 4px',
    borderRadius: '3px',
    fontSize: '0.9em',
    marginLeft: '2px'
};

console.log('Wikipedia Age Calculator extension loaded');

// Track processed nodes to prevent infinite loops
let processedNodes = new WeakSet();

function findBirthYear() {
    console.log('Looking for birth year...');
    
    // First try to find birth year in the infobox
    const infobox = document.querySelector('.infobox, .infobox_v3');
    if (infobox) {
        // Method 1: Look for "Born" row with various formats
        const birthRows = Array.from(infobox.querySelectorAll('tr, th, td')).filter(row => 
            row.textContent.toLowerCase().includes('born') || 
            row.textContent.toLowerCase().includes('b.') ||
            row.textContent.toLowerCase().includes('birth date'));
            
        for (const row of birthRows) {
            // Try various date formats
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
                        console.log('Found birth year in infobox:', yearMatch[0]);
                        return parseInt(yearMatch[0]);
                    }
                }
            }
        }
    }

    // If not found in infobox, try the main content area
    const mainContent = document.querySelector('.mw-parser-output');
    if (!mainContent) {
        console.log('No main content area found');
        return null;
    }

    // Method 2: Look in the first few paragraphs for birth year patterns
    const paragraphs = mainContent.querySelectorAll('p');
    const firstFewParagraphs = Array.from(paragraphs).slice(0, 5); // Increased to 5 paragraphs
    
    // Try different patterns in the first few paragraphs
    for (const paragraph of firstFewParagraphs) {
        const patterns = [
            /\(born\s+(?:[A-Za-z]+\s+\d+,\s+)?(\d{4})\)/i,  // (born YYYY) or (born Month Day, YYYY)
            /born\s+(?:[A-Za-z]+\s+\d+,\s+)?(\d{4})/i,  // born YYYY or born Month Day, YYYY
            /\b(?:b\.|born)\s+(\d{4})\b/i,  // b. YYYY or born YYYY
            /\b(?:b\.|born)\s+(?:[A-Za-z]+\s+\d+,\s+)?(\d{4})\b/i,  // b. Month Day, YYYY
            /\b((?:b\.\s+)?\d{4})\s*(?:–|-|—)\s*\d{4}\b/i,  // YYYY-YYYY or b. YYYY-YYYY
            /birth date\s*=\s*(\d{4})/i,  // birth date = YYYY
            /date of birth\s*=\s*(\d{4})/i  // date of birth = YYYY
        ];
        
        for (const pattern of patterns) {
            const match = paragraph.textContent.match(pattern);
            if (match) {
                const year = match[1] || match[0].match(/\b\d{4}\b/)[0];
                console.log('Found birth year in paragraph:', year);
                return parseInt(year);
            }
        }
    }
    
    // Method 3: Look for birth year in the page title or first heading
    const title = document.querySelector('h1#firstHeading') || document.querySelector('.mw-page-title-main');
    if (title) {
        const titleText = title.textContent;
        const patterns = [
            /\((\d{4})(?:\s*[-–—]\s*\d{4})?\)/,  // (YYYY) or (YYYY-YYYY)
            /\(born\s+(\d{4})\)/i,  // (born YYYY)
            /\b(\d{4})\s*[-–—]\s*\d{4}\b/  // YYYY-YYYY
        ];
        
        for (const pattern of patterns) {
            const match = titleText.match(pattern);
            if (match) {
                console.log('Found birth year in title:', match[1]);
                return parseInt(match[1]);
            }
        }
    }

    console.log('No birth year found using any method');
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
        // Pattern 1: Look for "died Month Day, YYYY" pattern
        const deathDateMatch = paragraph.textContent.match(/(?:died|d\.) (?:[A-Za-z]+ \d+, )?(\d{4})/);
        if (deathDateMatch) {
            return parseInt(deathDateMatch[1]);
        }
        
        // Pattern 2: Look for "YYYY-YYYY" pattern
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
    Object.assign(span.style, AGE_STYLE);
    return span;
}

function insertAges(birthYear, deathYear) {
    console.log('Starting insertAges function');
    
    const mainContent = document.querySelector('.mw-parser-output');
    if (!mainContent) {
        console.log('Could not find main content area (.mw-parser-output)');
        return;
    }
    
    console.log('Found main content area');
    
    // Define year pattern - match any 4-digit year
    const yearRegex = /\b\d{4}\b/g;
    
    // Process all paragraph elements directly - include 'a' tag to catch linked years
    const paragraphs = mainContent.querySelectorAll('p, li, td, th, dd, dt, h1, h2, h3, h4, h5, h6, a, span');
    console.log(`Found ${paragraphs.length} potential elements to process`);
    
    let totalYearsProcessed = 0;
    
    // Create a copy of the paragraphs array to avoid live collection issues
    Array.from(paragraphs).forEach((paragraph, paragraphIndex) => {
        // Skip if already processed
        if (processedNodes.has(paragraph)) {
            return;
        }
        
        // Skip if in a reference or other special section
        if (paragraph.closest('.reference, .mw-references-wrap, .mw-editsection, .mw-cite-backlink')) {
            return;
        }
        
        // Mark as processed
        processedNodes.add(paragraph);
        
        // Special case for simple elements that directly contain a year
        if (paragraph.childNodes.length === 1 && 
            paragraph.firstChild.nodeType === Node.TEXT_NODE && 
            yearRegex.test(paragraph.textContent)) {
            
            const textNode = paragraph.firstChild;
            if (!processedNodes.has(textNode)) {
                processNodes([textNode], birthYear, deathYear);
                processedNodes.add(textNode);
                return; // Continue to next paragraph
            }
        }
        
        // Get all text nodes inside this paragraph
        const textNodes = [];
        const walker = document.createTreeWalker(
            paragraph,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        let node;
        while (node = walker.nextNode()) {
            if (yearRegex.test(node.textContent) && !processedNodes.has(node)) {
                textNodes.push(node);
                // Mark text node as processed
                processedNodes.add(node);
            }
        }
        
        // Process collected text nodes
        processNodes(textNodes, birthYear, deathYear);
    });
    
    // Helper function to process a batch of text nodes
    function processNodes(textNodes, birthYear, deathYear) {
        textNodes.forEach((textNode, nodeIndex) => {
            const text = textNode.textContent;
            const matches = Array.from(text.matchAll(yearRegex));
            
            if (matches.length === 0) return;
            
            console.log(`Processing node ${nodeIndex+1}: Found ${matches.length} years`);
            totalYearsProcessed += matches.length;
            
            // Create a document fragment to hold the new content
            const fragment = document.createDocumentFragment();
            let lastIndex = 0;
            
            matches.forEach((match, matchIndex) => {
                const year = parseInt(match[0]);
                
                // Add text before the year
                fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
                
                // Add the year
                fragment.appendChild(document.createTextNode(match[0]));
                
                // Calculate and add age if appropriate
                if (year >= birthYear) {
                    const age = year - birthYear;
                    // Only show age if person was alive at that time
                    if (!deathYear || year <= deathYear) {
                        console.log(`Adding age ${age} for year ${year}`);
                        fragment.appendChild(createAgeSpan(age));
                    }
                }
                
                lastIndex = match.index + match[0].length;
            });
            
            // Add any remaining text
            fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
            
            // Replace the original text node with our fragment
            try {
                textNode.parentNode.replaceChild(fragment, textNode);
            } catch (error) {
                console.error('Error replacing text node:', error);
            }
        });
    }
    
    // Also process year-containing links directly
    const links = mainContent.querySelectorAll('a');
    const yearLinks = Array.from(links).filter(link => 
        yearRegex.test(link.textContent) && 
        !processedNodes.has(link) && 
        !link.closest('.reference, .mw-references-wrap')
    );
    
    yearLinks.forEach(link => {
        if (processedNodes.has(link)) return;
        
        processedNodes.add(link);
        const year = parseInt(link.textContent.match(yearRegex)[0]);
        
        if (year >= birthYear && (!deathYear || year <= deathYear)) {
            const age = year - birthYear;
            console.log(`Adding age ${age} for year link ${year}`);
            
            // Create and add age span
            const ageSpan = createAgeSpan(age);
            if (link.nextSibling) {
                link.parentNode.insertBefore(ageSpan, link.nextSibling);
            } else {
                link.parentNode.appendChild(ageSpan);
            }
            
            totalYearsProcessed++;
        }
    });
    
    console.log(`Total years processed: ${totalYearsProcessed}`);
}

function initializeExtension() {
    if (!isWikipediaArticle()) {
        console.log('Not a Wikipedia article page, skipping initialization');
        return;
    }

    // Check if already processed
    if (document.documentElement.hasAttribute('data-age-processed')) {
        console.log('Page already processed, skipping initialization');
        return;
    }

    console.log('Initializing Wikipedia Age Calculator...');
    
    // Create a new WeakSet instead of clearing (WeakSet has no clear method)
    processedNodes = new WeakSet();
    
    // Wait a short moment to ensure the page is fully loaded
    setTimeout(() => {
        const birthYear = findBirthYear();
        if (!birthYear) {
            console.log('Could not find birth year, stopping');
            return;
        }

        const deathYear = findDeathYear();
        console.log('Processing ages with birth year:', birthYear, 'death year:', deathYear);
        insertAges(birthYear, deathYear);
        
        // Set flag to prevent multiple processing
        document.documentElement.setAttribute('data-age-processed', 'true');
    }, 1500);
}

// Function to check if we're on a Wikipedia article page
function isWikipediaArticle() {
    // Check if we're on Wikipedia
    if (!window.location.hostname.includes('wikipedia.org')) {
        return false;
    }
    
    // Check if we're on an article page
    if (!window.location.pathname.includes('/wiki/')) {
        return false;
    }
    
    // Exclude special pages
    if (window.location.pathname.includes('Special:') ||
        window.location.pathname.includes('File:') ||
        window.location.pathname.includes('Template:') ||
        window.location.pathname.includes('Category:') ||
        window.location.pathname.includes('Wikipedia:') ||
        window.location.pathname.includes('Portal:') ||
        window.location.pathname.includes('Help:')) {
        return false;
    }
    
    return true;
}

// Run when the page is ready
function initializeExtension() {
    if (!isWikipediaArticle()) {
        console.log('Not a Wikipedia article page, skipping initialization');
        return;
    }

    // Check if already processed
    if (document.documentElement.hasAttribute('data-age-processed')) {
        console.log('Page already processed, skipping initialization');
        return;
    }

    console.log('Initializing Wikipedia Age Calculator...');
    
    // Create a new WeakSet instead of clearing (WeakSet has no clear method)
    processedNodes = new WeakSet();
    
    // Wait a short moment to ensure the page is fully loaded
    setTimeout(() => {
        const birthYear = findBirthYear();
        if (!birthYear) {
            console.log('Could not find birth year, stopping');
            return;
        }

        const deathYear = findDeathYear();
        console.log('Processing ages with birth year:', birthYear, 'death year:', deathYear);
        insertAges(birthYear, deathYear);
        
        // Set flag to prevent multiple processing
        document.documentElement.setAttribute('data-age-processed', 'true');
    }, 1500);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    console.log('Document still loading, waiting for DOMContentLoaded');
    document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
    console.log('Document already loaded, running init immediately');
    initializeExtension();
}

// Fix the MutationObserver to be more selective about when to reinitialize
const observer = new MutationObserver((mutations) => {
    // Only reinitialize if the page hasn't been processed and is a Wikipedia article
    if (isWikipediaArticle() && !document.documentElement.hasAttribute('data-age-processed')) {
        initializeExtension();
    }
});

// Start observing the document with the configured parameters
observer.observe(document.body, { 
    childList: true, 
    subtree: true, 
    characterData: false,
    attributes: true,
    attributeFilter: ['data-age-processed']
}); 