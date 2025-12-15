/**
 * rKTs Tibetan Buddhist Collections Explorer
 * Shared utility functions
 */

/**
 * Debounce function to limit how often a function is called
 * @param {Function} func - The function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

/**
 * Parse search term to support advanced search queries
 * @param {string} searchTerm - The search term to parse
 * @returns {string} - The parsed search term
 */
function parseSearchTerm(searchTerm) {
    // If the search term is empty, return an empty string
    if (!searchTerm || searchTerm.trim() === '') {
        return '';
    }
    
    // If the search term already contains field specifiers like 'title:' or boolean operators,
    // assume it's an advanced query and return as is
    if (/\w+:|\+|\-|~|\*|\^|\"/.test(searchTerm)) {
        return searchTerm;
    }
    
    // Check if it's a sigla search (typically short codes with specific formats)
    if (/^[A-Z]{1,3}\d*$/.test(searchTerm)) {
        return `sigla:${searchTerm}`; // Search for exact sigla
    }
    
    // For multi-word searches, create a simple query that works with basic lunr
    if (searchTerm.includes(' ')) {
        // Just use the terms directly - lunr will handle tokenization
        return searchTerm;
    }
    
    // For single-word searches, just use the term directly
    // Add a wildcard for prefix matching if the term is long enough
    return searchTerm.length >= 3 ? `${searchTerm}*` : searchTerm;
}

/**
 * Generic search function that can be used across different pages
 * @param {Object} config - Configuration object
 * @param {string} config.searchInputId - ID of the search input element
 * @param {string} config.searchPreviewId - ID of the search preview container
 * @param {string} config.searchResultsContainerId - ID of the search results container
 * @param {string} config.searchResultsCountId - ID of the search results count element
 * @param {Array} config.collections - Array of collection objects to search
 * @param {Object} config.lunrIndex - Lunr index for search
 * @param {Function} config.showDetailsCallback - Function to call when a result is clicked
 * @param {boolean} [config.updateFilteredCollections=false] - Whether to update the global filteredCollections array
 * @param {Function} [config.onResultsUpdated] - Callback to run after results are updated
 */
function performGenericSearch(config) {
    const {
        searchInputId,
        searchPreviewId,
        searchResultsContainerId,
        searchResultsCountId,
        collections,
        lunrIndex,
        showDetailsCallback,
        updateFilteredCollections = false,
        onResultsUpdated = null
    } = config;
    
    const searchInput = document.getElementById(searchInputId);
    const searchTerm = searchInput ? searchInput.value.trim() : '';
    const searchPreview = document.getElementById(searchPreviewId);
    const searchResultsContainer = document.getElementById(searchResultsContainerId);
    const searchResultsCount = document.getElementById(searchResultsCountId);
    
    // Clear previous results
    searchResultsContainer.innerHTML = '';
    
    // Hide preview if search term is empty
    if (!searchTerm) {
        searchPreview.style.display = 'none';
        
        // If we're updating filteredCollections and search is cleared, show all collections
        if (updateFilteredCollections && typeof window.filteredCollections !== 'undefined') {
            window.filteredCollections = [...collections];
            if (onResultsUpdated && typeof onResultsUpdated === 'function') {
                onResultsUpdated(window.filteredCollections);
            }
        }
        return;
    }
    
    // Show loading indicator
    searchResultsContainer.innerHTML = '<div class="p-3 text-center">Searching...</div>';
    searchPreview.style.display = 'block';
    
    try {
        let results = [];
        
        if (lunrIndex) {
            // Parse search term for advanced queries
            const parsedTerm = parseSearchTerm(searchTerm);
            
            // Perform the search using Lunr with the parsed term
            results = lunrIndex.search(parsedTerm);
            
            // If no results found with exact search, try a more flexible approach
            if (results.length === 0 && searchTerm.length >= 2) {
                // Try wildcard search
                results = lunrIndex.search(`${searchTerm}*`);
                
                // If still no results and term is long enough, try fuzzy search
                if (results.length === 0 && searchTerm.length >= 3) {
                    results = lunrIndex.search(`${searchTerm}~1`);
                }
                
                // If still no results, try term splitting for multi-word searches
                if (results.length === 0 && searchTerm.includes(' ')) {
                    const terms = searchTerm.split(' ')
                        .filter(t => t.length > 1)
                        .map(t => t + '*');
                    if (terms.length > 0) {
                        results = lunrIndex.search(terms.join(' '));
                    }
                }
            }
        } else {
            // Fallback to basic search if Lunr index is not available
            results = collections.map((collection, index) => {
                const score = calculateBasicSearchScore(collection, searchTerm);
                return score > 0 ? { ref: index.toString(), score } : null;
            }).filter(result => result !== null);
        }
        
        // Sort results by score (highest first)
        results.sort((a, b) => b.score - a.score);
        
        // Update search results count
        searchResultsCount.textContent = results.length;
        
        // Update filteredCollections if requested
        if (updateFilteredCollections && typeof window.filteredCollections !== 'undefined') {
            // Create a new array with only the collections that match the search
            window.filteredCollections = results.map(result => collections[parseInt(result.ref)])
                .filter(collection => collection !== undefined);
                
            // Call the callback if provided
            if (onResultsUpdated && typeof onResultsUpdated === 'function') {
                onResultsUpdated(window.filteredCollections);
            }
        }
        
        // Clear results container
        searchResultsContainer.innerHTML = '';
        
        if (results.length === 0) {
            searchResultsContainer.innerHTML = '<div class="p-3 text-center">No results found</div>';
            return;
        }
        
        // Display results (limit to top 10)
        results.slice(0, 10).forEach(result => {
            const collection = collections[parseInt(result.ref)];
            if (!collection) return;
            
            // Create result item
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item';
            resultItem.dataset.id = result.ref;
            
            // Create title with highlighted search term
            const title = highlightSearchTerm(collection.title || 'Untitled', searchTerm);
            const sigla = collection.sigla ? `<span class="search-result-sigla">${collection.sigla}</span>` : '';
            
            // Create category badge
            const category = collection.genre ? 
                `<span class="search-result-category">${collection.genre}</span>` : '';
            
            // Create snippet from description/abstract
            let snippet = '';
            if (collection.abstract || collection.description) {
                const text = collection.abstract || collection.description;
                snippet = `<div class="search-result-snippet">${createSnippet(text, searchTerm)}</div>`;
            }
            
            // Assemble result item content
            resultItem.innerHTML = `
                <div class="search-result-title">${sigla}${title}</div>
                ${category}
                ${snippet}
            `;
            
            // Add click handler to show collection details
            resultItem.addEventListener('click', () => {
                // Show collection details using the provided callback
                showDetailsCallback(collection);
                // Hide the search preview after selection
                searchPreview.style.display = 'none';
                // Clear the search input after selection
                searchInput.value = '';
            });
            
            searchResultsContainer.appendChild(resultItem);
        });
    } catch (e) {
        console.error('Search error:', e);
        searchResultsContainer.innerHTML = '<div class="p-3 text-center">Search error occurred</div>';
    }
}

/**
 * Helper function to highlight search terms in text
 * @param {string} text - Text to highlight terms in
 * @param {string} searchTerm - Term to highlight
 * @returns {string} - Text with highlighted search terms
 */
function highlightSearchTerm(text, searchTerm) {
    if (!text || !searchTerm) return text;
    const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');
    return text.replace(regex, '<span class="search-result-highlight">$1</span>');
}

/**
 * Helper function to create a snippet with highlighted search term
 * @param {string} text - Source text
 * @param {string} searchTerm - Term to highlight
 * @param {number} maxLength - Maximum length of the snippet
 * @returns {string} - Formatted snippet with highlighted search term
 */
function createSnippet(text, searchTerm, maxLength = 100) {
    if (!text) return '';
    
    // Escape the search term for regex
    const escapedSearchTerm = escapeRegExp(searchTerm);
    
    // Find the position of the search term
    const regex = new RegExp(escapedSearchTerm, 'i');
    const match = text.match(regex);
    
    if (!match) {
        // If no match, just return the first part of the text
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }
    
    const matchIndex = match.index;
    let startIndex = Math.max(0, matchIndex - Math.floor(maxLength / 2));
    let endIndex = Math.min(text.length, startIndex + maxLength);
    
    // Adjust start index if we're near the end of the text
    if (endIndex === text.length) {
        startIndex = Math.max(0, endIndex - maxLength);
    }
    
    // Extract the snippet
    let snippet = text.substring(startIndex, endIndex);
    
    // Add ellipsis if needed
    if (startIndex > 0) snippet = '...' + snippet;
    if (endIndex < text.length) snippet = snippet + '...';
    
    // Highlight the search term
    return highlightSearchTerm(snippet, searchTerm);
}

/**
 * Helper function to escape special characters in regex
 * @param {string} string - String to escape
 * @returns {string} - Escaped string safe for regex
 */
function escapeRegExp(string) {
    if (!string) return '';
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Calculate basic search score for fallback search
 * @param {Object} item - Item to search in
 * @param {string} searchTerm - Term to search for
 * @returns {number} - Search score (higher is better match)
 */
function calculateBasicSearchScore(item, searchTerm) {
    if (!searchTerm || !item) return 0;
    
    const searchLower = searchTerm.toLowerCase();
    let score = 0;
    
    // Check sigla (highest priority)
    if (item.sigla && item.sigla.toLowerCase().includes(searchLower)) {
        score += 10;
    }
    
    // Check title (high weight)
    if (item.title && item.title.toLowerCase().includes(searchLower)) {
        score += 5;
        // Bonus for title starting with the search term
        if (item.title.toLowerCase().startsWith(searchLower)) {
            score += 3;
        }
    }
    
    // Check alternative title / Tibetan title
    if ((item.alternative_title && item.alternative_title.toLowerCase().includes(searchLower)) ||
        (item.title_tibetan && item.title_tibetan.toLowerCase().includes(searchLower))) {
        score += 3;
    }
    
    // Check place of production
    if (item.place_of_production && item.place_of_production.toLowerCase().includes(searchLower)) {
        score += 2;
    }
    
    // Check genre/category
    if (item.genre && item.genre.toLowerCase().includes(searchLower)) {
        score += 2;
    }
    
    // Check description/abstract
    if ((item.abstract && item.abstract.toLowerCase().includes(searchLower)) ||
        (item.description && item.description.toLowerCase().includes(searchLower))) {
        score += 1;
    }
    
    return score;
}

/**
 * Truncate text to a specified length and add ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} - Truncated text
 */
function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) {
        return text;
    }
    
    return text.substring(0, maxLength) + '...';
}

/**
 * Export filtered collections as JSON
 * @param {Array} items - Items to export
 * @param {string} filename - Output filename
 */
function exportJSON(items, filename = 'export.json') {
    const dataStr = JSON.stringify(items, null, 2);
    const blob = new Blob([dataStr], {type: 'application/json'});
    saveAs(blob, filename);
}

/**
 * Export filtered collections as CSV
 * @param {Array} items - Items to export
 * @param {Array} headers - CSV headers
 * @param {string} filename - Output filename
 */
function exportCSV(items, headers, filename = 'export.csv') {
    // Create CSV content
    let csvContent = headers.join(',') + '\n';
    
    // Add data rows
    items.forEach(item => {
        const row = headers.map(header => {
            let value = item[header] || '';
            // Handle arrays
            if (Array.isArray(value)) {
                value = value.join('; ');
            }
            // Escape quotes and wrap in quotes if contains comma
            value = String(value).replace(/"/g, '""');
            if (value.includes(',')) {
                value = `"${value}"`;
            }
            return value;
        });
        csvContent += row.join(',') + '\n';
    });
    
    // Create and download blob
    const blob = new Blob([csvContent], {type: 'text/csv;charset=utf-8'});
    saveAs(blob, filename);
}

/**
 * Helper function to show error message
 * @param {string} message - Error message to display
 * @param {string} containerId - ID of the container element (default: 'collections-container')
 */
function showError(message, containerId = 'collections-container') {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger" role="alert">
                    ${message}
                </div>
            </div>
        `;
    } else {
        console.error(`Error container with ID '${containerId}' not found. Error message: ${message}`);
    }
}

/**
 * Download XML file for a collection
 * @param {string} fileName - Name of the XML file to download
 */
function downloadCollectionXML(fileName) {
    if (!fileName) {
        console.error('No file name provided for XML download');
        alert('Error: Could not identify the XML file to download.');
        return;
    }
    
    // Get the base URL (removing any path components)
    const baseUrl = window.location.protocol + '//' + window.location.host;
    
    // Encode the filename to handle spaces and special characters
    const encodedFileName = encodeURIComponent(fileName);
    
    // Construct the XML file path to use the symbolic link in the static directory
    const xmlFilePath = `${baseUrl}/static/xml_files/${encodedFileName}`;
    
    console.log(`Attempting to download XML from: ${xmlFilePath}`);
    
    // Fetch the XML file
    fetch(xmlFilePath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.text();
        })
        .then(xmlContent => {
            // Create a blob with the XML content
            const blob = new Blob([xmlContent], {type: 'application/xml'});
            
            // Use FileSaver.js to save the file
            saveAs(blob, fileName);
            
            console.log(`Successfully downloaded XML file: ${fileName}`);
        })
        .catch(error => {
            console.error('Error downloading XML file:', error);
            alert(`Error downloading XML file: ${error.message}\nPlease check the browser console for more details.`);
        });
}

/**
 * Generic function to update a category chart
 * @param {Array} collections - Array of collection objects to chart
 * @param {string} chartId - ID of the canvas element for the chart
 * @param {object} chartInstance - Reference to existing Chart instance if any
 * @param {string} chartTitle - Title for the chart
 * @returns {object} - The created or updated Chart instance
 */
function updateGenericCategoryChart(collections, chartId, chartInstance, chartTitle = 'Collections by Category') {
    const ctx = document.getElementById(chartId);
    if (!ctx) {
        console.error(`Chart canvas with ID '${chartId}' not found`);
        return chartInstance;
    }
    
    // Count collections by genre/category
    const categoryCounts = {};
    collections.forEach(collection => {
        const genre = collection.genre || 'Unknown';
        categoryCounts[genre] = (categoryCounts[genre] || 0) + 1;
    });
    
    // Sort categories by count (descending)
    const sortedCategories = Object.keys(categoryCounts).sort((a, b) => {
        return categoryCounts[b] - categoryCounts[a];
    });
    
    // Limit to top 5 categories if there are more
    const topCategories = sortedCategories.length > 5 ? 
        sortedCategories.slice(0, 5) : 
        sortedCategories;
    
    // Prepare data for chart
    const labels = topCategories;
    const data = topCategories.map(category => categoryCounts[category]);
    
    // Generate colors
    const colors = [
        '#e41a1c', // Red
        '#377eb8', // Blue
        '#4daf4a', // Green
        '#984ea3', // Purple
        '#ff7f00'  // Orange
    ];
    
    // Create or update chart
    if (chartInstance) {
        chartInstance.data.labels = labels;
        chartInstance.data.datasets[0].data = data;
        chartInstance.update();
        return chartInstance;
    } else {
        return new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: chartTitle,
                    data: data,
                    backgroundColor: colors,
                    borderColor: colors.map(color => color.replace('0.8', '1')),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        });
    }
}

/**
 * Update the URL with filter parameters for sharing
 * @param {Object} config - Configuration object
 * @param {Object} config.filters - Object containing filter values
 * @param {Object} [config.elementIds] - Object mapping filter names to element IDs
 * @param {boolean} [config.replaceState=true] - Whether to replace browser history state
 */
/**
 * Parses a date string into a numerical year range.
 * Handles formats like "17th cent.", "14th-17th cent.", "1684-1692", and "ca. 1410".
 * @param {string} dateStr - The date string to parse.
 * @returns {Array|null} - An array [startYear, endYear] or null if unparseable.
 */
function parseDateRange(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') {
        return null;
    }

    dateStr = dateStr.toLowerCase().trim();

    // Case 1: Century range (e.g., "14th-17th cent.")
    let match = dateStr.match(/(\d{1,2})(?:st|nd|rd|th)\s*-\s*(\d{1,2})(?:st|nd|rd|th)\s+cent/);
    if (match) {
        const startCentury = parseInt(match[1]);
        const endCentury = parseInt(match[2]);
        const startYear = (startCentury - 1) * 100 + 1;
        const endYear = endCentury * 100;
        return [startYear, endYear];
    }

    // Case 2: Single century (e.g., "17th cent.")
    match = dateStr.match(/(\d{1,2})(?:st|nd|rd|th)\s+cent/);
    if (match) {
        const century = parseInt(match[1]);
        const startYear = (century - 1) * 100 + 1;
        const endYear = century * 100;
        return [startYear, endYear];
    }

    // Case 3: Year range (e.g., "1684-1692", "1684/92")
    match = dateStr.match(/(\d{4})\s*[-\/]\s*(\d{2,4})/);
    if (match) {
        const startYear = parseInt(match[1]);
        let endYear = parseInt(match[2]);
        if (match[2].length === 2) {
            endYear = parseInt(match[1].substring(0, 2) + match[2]);
        }
        return [startYear, endYear];
    }

    // Case 4: Single year (e.g., "1684", "ca. 1410")
    match = dateStr.match(/(\d{4})/);
    if (match) {
        const year = parseInt(match[1]);
        return [year, year];
    }

    return null; // Return null if no format matches
}

function updateShareableUrl(config) {
    const {
        filters = {},
        elementIds = {},
        replaceState = true
    } = config;
    
    const searchParams = new URLSearchParams();
    
    // Process filters object directly if provided
    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '' && value !== 'all') {
            searchParams.set(key, value);
        }
    });
    
    // Process element IDs if provided
    Object.entries(elementIds).forEach(([paramName, elementId]) => {
        const element = document.getElementById(elementId);
        if (element && element.value && element.value !== '' && element.value !== 'all') {
            searchParams.set(paramName, element.value);
        }
    });
    
    // Update browser history without reloading the page
    const newUrl = window.location.pathname + (searchParams.toString() ? '?' + searchParams.toString() : '');
    
    if (replaceState) {
        window.history.replaceState({}, '', newUrl);
    } else {
        window.history.pushState({}, '', newUrl);
    }
    
    return newUrl;
}

/**
 * Filter collections based on various criteria
 * @param {Array} collections - Array of collection objects to filter
 * @param {Object} filters - Object containing filter criteria
 * @param {string} [filters.searchTerm] - Search term to filter by
 * @param {string} [filters.category] - Category/genre to filter by
 * @param {string} [filters.place] - Place to filter by
 * @param {number} [filters.minYear] - Minimum year for date filtering
 * @param {string|string[]} [filters.medium] - Medium or array of media to filter by
 * @param {number} [filters.maxYear] - Maximum year for date filtering
 * @param {Function} [customFilterFn] - Optional custom filter function
 * @returns {Array} - Filtered collections
 */
function filterCollections(collections, filters = {}, customFilterFn = null) {
    if (!collections || !Array.isArray(collections)) {
        console.error('Invalid collections array provided to filterCollections');
        return [];
    }
    
    // Start with all collections
    let filtered = [...collections];
    
    // Apply search term filter if provided
    if (filters.searchTerm && filters.searchTerm.trim() !== '') {
        const searchTerms = parseSearchTerm(filters.searchTerm);
        
        filtered = filtered.filter(collection => {
            // For each collection, calculate a search score
            const score = calculateBasicSearchScore(collection, searchTerms);
            return score > 0; // Keep only collections with a positive score
        });
    }
    
    // Apply category/genre filter if provided
    if (filters.category && filters.category !== 'all') {
        filtered = filtered.filter(collection => {
            const genre = (collection.genre || '').toLowerCase();
            return genre === filters.category.toLowerCase();
        });
    }
    
    // Apply place filter if provided
    if (filters.place && filters.place !== 'all') {
        filtered = filtered.filter(collection => {
            const place = (collection.place_of_production || '').toLowerCase();
            return place.includes(filters.place.toLowerCase());
        });
    }
    
    // Apply medium filter if provided
    if (filters.medium && filters.medium !== 'all') {
        let mediaArr = Array.isArray(filters.medium) ? filters.medium : [filters.medium];
        filtered = filtered.filter(collection => collection.medium && mediaArr.includes(collection.medium));
    }

    // Apply date range filter if provided
    if ((filters.minYear !== undefined && filters.minYear !== null) || 
        (filters.maxYear !== undefined && filters.maxYear !== null)) {
        
        const minYear = filters.minYear !== undefined ? parseInt(filters.minYear) : -Infinity;
        const maxYear = filters.maxYear !== undefined ? parseInt(filters.maxYear) : Infinity;
        
        filtered = filtered.filter(collection => {
            // Try to parse the date string into a range
            const itemDateRange = parseDateRange(collection.date_created);

            // If the date is unparseable or missing, keep the item (treat as unspecified)
            if (!itemDateRange) {
                return true;
            }

            const [itemStart, itemEnd] = itemDateRange;

            // Check for overlap:
            // The item's range must start before or at the same time as the filter's end,
            // AND the item's range must end after or at the same time as the filter's start.
            return itemStart <= maxYear && itemEnd >= minYear;
        });
    }
    
    // Apply custom filter function if provided
    if (customFilterFn && typeof customFilterFn === 'function') {
        filtered = filtered.filter(customFilterFn);
    }
    
    return filtered;
}

/**
 * Create a collection card element for display in the UI
 * @param {Object} collection - The collection object to display
 * @param {Function} clickHandler - Function to call when the card is clicked
 * @param {boolean} includeDetails - Whether to include additional details in the card
 * @returns {HTMLElement} - The created card element
 */
function createCollectionCard(collection, clickHandler, includeDetails = false) {
    // Create card container
    const card = document.createElement('div');
    card.className = 'collection-card card mb-3';
    card.setAttribute('data-id', collection.id || '');
    
    // Add hover effect
    card.style.cursor = 'pointer';
    card.style.transition = 'transform 0.2s, box-shadow 0.2s';
    
    // Add click handler if provided
    if (clickHandler) {
        card.addEventListener('click', () => clickHandler(collection));
    }
    
    // Create card body
    const cardBody = document.createElement('div');
    cardBody.className = 'card-body';
    
    // Add sigla badge if available
    if (collection.sigla) {
        const siglaBadge = document.createElement('span');
        siglaBadge.className = 'badge bg-primary float-end';
        siglaBadge.textContent = collection.sigla;
        cardBody.appendChild(siglaBadge);
    }
    
    // Add title
    const title = document.createElement('h5');
    title.className = 'card-title';
    title.textContent = collection.title || 'Untitled Collection';
    cardBody.appendChild(title);
    
    // Add Tibetan title if available
    if (collection.title_tibetan) {
        const tibetanTitle = document.createElement('h6');
        tibetanTitle.className = 'card-subtitle mb-2 text-muted';
        tibetanTitle.textContent = collection.title_tibetan;
        cardBody.appendChild(tibetanTitle);
    }
    
    // Add place and date if available
    if (collection.place_of_production || collection.date_created) {
        const placeDate = document.createElement('p');
        placeDate.className = 'card-text small';
        
        if (collection.place_of_production) {
            const placeIcon = document.createElement('i');
            placeIcon.className = 'fas fa-map-marker-alt me-1';
            placeDate.appendChild(placeIcon);
            placeDate.appendChild(document.createTextNode(` ${collection.place_of_production}`));
        }
        
        if (collection.date_created) {
            if (collection.place_of_production) {
                placeDate.appendChild(document.createElement('br'));
            }
            const dateIcon = document.createElement('i');
            dateIcon.className = 'fas fa-calendar-alt me-1';
            placeDate.appendChild(dateIcon);
            placeDate.appendChild(document.createTextNode(` ${collection.date_created}`));
        }
        
        cardBody.appendChild(placeDate);
    }
    
    // Add additional details if requested
    if (includeDetails) {
        // Add abstract/description if available
        if (collection.abstract || collection.description) {
            const abstract = document.createElement('p');
            abstract.className = 'card-text';
            abstract.textContent = truncateText(collection.abstract || collection.description, 150);
            cardBody.appendChild(abstract);
        }
        
        // Add genre/category if available
        if (collection.genre) {
            const genre = document.createElement('p');
            genre.className = 'card-text';
            const genreBadge = document.createElement('span');
            genreBadge.className = 'badge bg-secondary';
            genreBadge.textContent = collection.genre;
            genre.appendChild(genreBadge);
            cardBody.appendChild(genre);
        }
    }
    
    card.appendChild(cardBody);
    return card;
}

/**
 * Region mapping configuration for Tibetan Buddhist collections
 * Used for grouping places into geographical regions
 */
const REGION_MAPPING = {
    'Central Tibet': {
        bounds: { north: 32.0, south: 28.0, east: 92.0, west: 85.0 },
        keywords: ['lhasa', 'sakya', 'narthang', 'zhalu', 'samye', 'ganden', 'drepung', 'sera', 
                   'central tibet', 'ü-tsang', 'u-tsang', 'tsang', 'shigatse', 'gyantse']
    },
    'Eastern Tibet': {
        bounds: { north: 36.0, south: 28.0, east: 103.0, west: 91.0 },
        keywords: ['derge', 'chamdo', 'kham', 'amdo', 'eastern tibet', 'batang', 'lithang', 
                   'jyekundo', 'qinghai', 'sichuan', 'yunnan', 'gansu']
    },
    'Ladakh': {
        bounds: { north: 35.0, south: 32.0, east: 80.0, west: 75.5 },
        keywords: ['leh', 'ladakh', 'basgo', 'hemis', 'alchi', 'thiksey', 'shey', 'jammu', 'kashmir']
    },
    'Bhutan': {
        bounds: { north: 28.5, south: 26.5, east: 92.5, west: 88.5 },
        keywords: ['thimphu', 'bhutan', 'paro', 'punakha', 'trongsa', 'bumthang', 'druk']
    },
    'Tibetan-Nepalese Borderlands': {
        bounds: { north: 29.5, south: 27.0, east: 88.5, west: 82.0 },
        keywords: ['kathmandu', 'nepal', 'mustang', 'dolpo', 'jumla', 'tshethang', 'himalaya', 'border']
    },
    'Beijing and Mongolia': {
        bounds: { north: 50.0, south: 35.0, east: 125.0, west: 95.0 },
        keywords: ['beijing', 'mongol', 'ulaanbaatar', 'hohhot', 'erdene zuu', 'urga', 'china', 'peking']
    },
    'Other': {
        bounds: null,
        keywords: []
    }
};

/**
 * Match a collection to a geographical region
 * @param {Object} collection - Collection object with place_of_production and optionally coordinates
 * @returns {string} - The matched region name
 */
function matchCollectionToRegion(collection) {
    const place = (collection.place_of_production || '').toLowerCase();
    
    // Try to extract coordinates
    let lat = null, lng = null;
    if (collection.coordinates) {
        const coords = collection.coordinates.split(',');
        if (coords.length === 2) {
            lat = parseFloat(coords[0]);
            lng = parseFloat(coords[1]);
        }
    }
    
    // First try coordinate-based matching
    if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
        for (const [region, data] of Object.entries(REGION_MAPPING)) {
            if (data.bounds) {
                const { north, south, east, west } = data.bounds;
                if (lat <= north && lat >= south && lng <= east && lng >= west) {
                    return region;
                }
            }
        }
    }
    
    // Fallback to keyword-based matching
    for (const [region, data] of Object.entries(REGION_MAPPING)) {
        if (region === 'Other') continue;
        if (data.keywords.some(keyword => place.includes(keyword))) {
            return region;
        }
    }
    
    // Special case: generic "tibet" without "eastern tibet" -> Central Tibet
    if (place.includes('tibet') && !place.includes('eastern tibet')) {
        return 'Central Tibet';
    }
    
    return 'Other';
}

/**
 * Count collections by region
 * @param {Array} collections - Array of collection objects
 * @returns {Object} - Object with region names as keys and counts as values
 */
function countCollectionsByRegion(collections) {
    const regionCounts = {};
    Object.keys(REGION_MAPPING).forEach(region => {
        regionCounts[region] = 0;
    });
    
    collections.forEach(collection => {
        const region = matchCollectionToRegion(collection);
        regionCounts[region] = (regionCounts[region] || 0) + 1;
    });
    
    return regionCounts;
}

/**
 * Generic function to update a regional place chart (pie chart)
 * @param {Array} collections - Array of collection objects to chart
 * @param {string} chartId - ID of the canvas element for the chart
 * @param {object} chartInstance - Reference to existing Chart instance if any
 * @param {string} chartTitle - Title for the chart
 * @returns {object} - The created or updated Chart instance
 */
function updateGenericRegionalChart(collections, chartId, chartInstance, chartTitle = 'Regional Distribution') {
    const ctx = document.getElementById(chartId);
    if (!ctx) {
        return chartInstance;
    }
    
    const regionCounts = countCollectionsByRegion(collections);
    
    // Sort regions by count (descending)
    const sortedRegions = Object.keys(regionCounts).sort((a, b) => regionCounts[b] - regionCounts[a]);
    
    const labels = sortedRegions;
    const data = sortedRegions.map(region => regionCounts[region]);
    
    const colors = [
        '#e41a1c', '#377eb8', '#4daf4a', '#984ea3', 
        '#ff7f00', '#a65628', '#f781bf', '#999999'
    ];
    
    if (chartInstance) {
        chartInstance.data.labels = labels;
        chartInstance.data.datasets[0].data = data;
        chartInstance.update();
        return chartInstance;
    } else {
        return new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Collections by Region',
                    data: data,
                    backgroundColor: colors,
                    borderColor: '#fff',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: { display: true, text: chartTitle },
                    legend: { position: 'right', labels: { boxWidth: 15 } },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
}


