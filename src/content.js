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
const processedNodes = new WeakSet();

function findBirthYear() {
    console.log('Looking for birth year...');
    
    // First try to find birth year in the infobox
    const infobox = document.querySelector('.infobox, .infobox_v3');
    if (infobox) {
        const birthText = Array.from(infobox.querySelectorAll('tr, th, td')).find(row => 
            row.textContent.toLowerCase().includes('born'));
        if (birthText) {
            const yearMatch = birthText.textContent.match(/\b\d{4}\b/);
            if (yearMatch) {
                console.log('Found birth year in infobox:', yearMatch[0]);
                return parseInt(yearMatch[0]);
            }
        }
    }

    // If not found in infobox, try the main content area
    const mainContent = document.querySelector('.mw-parser-output');
    if (!mainContent) {
        console.log('No main content area found');
        return null;
    }

    // Look for birth year in the first few paragraphs
    const paragraphs = mainContent.querySelectorAll('p');
    for (let i = 0; i < Math.min(3, paragraphs.length); i++) {
        const paragraph = paragraphs[i];
        // Look for patterns like "(born 1999)" or "born January 1, 1999"
        const birthDateMatch = paragraph.textContent.match(/(?:born|b\.) (?:[A-Za-z]+ \d+, )?(\d{4})/);
        if (birthDateMatch) {
            console.log('Found birth year in paragraph:', birthDateMatch[1]);
            return parseInt(birthDateMatch[1]);
        }
    }

    console.log('No birth year found');
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
    
    // Process all paragraph elements directly
    const paragraphs = mainContent.querySelectorAll('p, li, td, th, dd, dt, h1, h2, h3, h4, h5, h6');
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
        
        // Process each text node
        textNodes.forEach((textNode, nodeIndex) => {
            const text = textNode.textContent;
            const matches = Array.from(text.matchAll(yearRegex));
            
            if (matches.length === 0) return;
            
            console.log(`Processing paragraph ${paragraphIndex+1}, node ${nodeIndex+1}: Found ${matches.length} years`);
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
    });
    
    console.log(`Total years processed: ${totalYearsProcessed}`);
}

function init() {
    console.log('Initializing Wikipedia Age Calculator...');
    
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
    }, 1000);
}

// Function to check if we're on a Wikipedia article page
function isWikipediaArticle() {
    return window.location.hostname.includes('wikipedia.org') && 
           window.location.pathname.includes('/wiki/') &&
           !window.location.pathname.includes('Special:') &&
           !window.location.pathname.includes('File:') &&
           !window.location.pathname.includes('Template:') &&
           !window.location.pathname.includes('Category:');
}

// Run when the page is ready
if (document.readyState === 'loading') {
    console.log('Document still loading, waiting for DOMContentLoaded');
    document.addEventListener('DOMContentLoaded', () => {
        if (isWikipediaArticle()) {
            init();
        }
    });
} else {
    console.log('Document already loaded, running init immediately');
    if (isWikipediaArticle()) {
        init();
    }
}

// Fix the MutationObserver to prevent reprocessing
const observer = new MutationObserver((mutations) => {
    if (isWikipediaArticle() && !document.documentElement.hasAttribute('data-age-processed')) {
        document.documentElement.setAttribute('data-age-processed', 'true');
        init();
    }
});

// Start observing the document with the configured parameters
observer.observe(document.body, { childList: true, subtree: true }); 