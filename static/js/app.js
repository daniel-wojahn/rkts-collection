/**
 * Resources for Kanjur & Tanjur Studies (rKTs) Collections Explorer
 * Main application JavaScript
 */

// Global variables
let map;
let markers = [];
let markerCluster;
let heatLayer;
let isHeatmapActive = false;
let collections = [];
let filteredCollections = []; // Store filtered collections
let geojson;
let categoryFilter = '';
let groupFilter = '';
let placeFilter = '';
let lunrIndex; // Lunr search index
let categoryOptions = new Set();
let groupOptions = new Set();
let placeOptions = new Set();
let minYear = 1000;
let maxYear = 2000;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initMap();
    loadData();
    
    // Set up event listeners
    document.getElementById('apply-filters').addEventListener('click', applyFilters);
    document.getElementById('reset-filters').addEventListener('click', resetFilters);
    
    // Add debounced search input event listener
    const searchInput = document.getElementById('search');
    const clearSearchBtn = document.getElementById('clear-search');
    
    if (searchInput) {
        searchInput.addEventListener('input', debounce(performSearch, 100)); // Search as you type
        
        // Close search preview when clicking outside
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.search-container')) {
                document.getElementById('search-preview').style.display = 'none';
            }
        });
    }
    
    // Add clear search button event listener
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', function() {
            if (searchInput) {
                searchInput.value = '';
                document.getElementById('search-preview').style.display = 'none';
                applyFilters(); // Apply other filters without search
            }
        });
    }
    
    // Set up map view toggle buttons
    const markerViewBtn = document.getElementById('marker-view-btn');
    const heatmapViewBtn = document.getElementById('heatmap-view-btn');
    
    if (markerViewBtn && heatmapViewBtn) {
        markerViewBtn.addEventListener('click', function() {
            if (isHeatmapActive) {
                switchToMarkerView();
                markerViewBtn.classList.add('active');
                heatmapViewBtn.classList.remove('active');
            }
        });
        
        heatmapViewBtn.addEventListener('click', function() {
            if (!isHeatmapActive) {
                switchToHeatmapView();
                heatmapViewBtn.classList.add('active');
                markerViewBtn.classList.remove('active');
            }
        });
    }
    
    // Set up date slider event listeners
    const dateSliderMin = document.getElementById('date-slider-min');
    const dateSliderMax = document.getElementById('date-slider-max');
    const selectedDateMin = document.getElementById('selected-date-min');
    const selectedDateMax = document.getElementById('selected-date-max');
    
    console.log('Setting up date slider event listeners');
    
    if (dateSliderMin) {
        dateSliderMin.addEventListener('input', function() {
            const value = parseInt(this.value);
            console.log('Min slider changed to:', value);
            if (value > parseInt(dateSliderMax.value)) {
                this.value = dateSliderMax.value;
                selectedDateMin.textContent = this.value;
            } else {
                selectedDateMin.textContent = value;
            }
        });
        
        // Apply filters immediately when slider stops
        dateSliderMin.addEventListener('change', function() {
            console.log('Min slider final value:', this.value);
            applyFilters();
        });
    }
    
    if (dateSliderMax) {
        dateSliderMax.addEventListener('input', function() {
            const value = parseInt(this.value);
            console.log('Max slider changed to:', value);
            if (value < parseInt(dateSliderMin.value)) {
                this.value = dateSliderMin.value;
                selectedDateMax.textContent = this.value;
            } else {
                selectedDateMax.textContent = value;
            }
        });
        
        // Apply filters immediately when slider stops
        dateSliderMax.addEventListener('change', function() {
            console.log('Max slider final value:', this.value);
            applyFilters();
        });
    }
    
    // Set up export buttons if they exist on this page
    const exportJsonBtn = document.getElementById('export-json');
    const exportCsvBtn = document.getElementById('export-csv');
    const shareLinkBtn = document.getElementById('share-link');
    
    if (exportJsonBtn) exportJsonBtn.addEventListener('click', exportJSON);
    if (exportCsvBtn) exportCsvBtn.addEventListener('click', exportCSV);
    if (shareLinkBtn) shareLinkBtn.addEventListener('click', shareLink);
});

// Initialize the Leaflet map
function initMap() {
    // Create map centered on Tibet
    map = L.map('map').setView([30.0, 90.0], 5);
    
    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18
    }).addTo(map);
    
    // Create a marker cluster group instead of a simple layer group
    markerCluster = L.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 50,
        iconCreateFunction: function(cluster) {
            const count = cluster.getChildCount();
            let size = 50; // Base size
            
            // Increase size based on number of points
            if (count > 10) size = 60;
            if (count > 20) size = 70;
            
            return L.divIcon({
                html: '<div class="cluster-icon">' + count + '</div>',
                className: 'marker-cluster-large',
                iconSize: L.point(size, size)
            });
        }
    });
    
    // Add the marker cluster group to the map
    map.addLayer(markerCluster);
    
    // Create a regular layer group for individual markers when needed
    markers = L.layerGroup().addTo(map);
}

// Load data from JSON files
async function loadData() {
    try {
        showLoading(true);
        
        // Add cache-busting parameter to prevent browser caching
        const cacheBuster = `?t=${new Date().getTime()}`;
        
        // Fetch collections data with cache-busting
        const response = await fetch(`/static/data/collections.json${cacheBuster}`);
        collections = await response.json();
        
        // Fetch GeoJSON data with cache-busting
        const geoResponse = await fetch(`/static/data/collections.geojson${cacheBuster}`);
        const geoData = await geoResponse.json();
        
        // Update statistics
        document.getElementById('total-collections').textContent = collections.length;
        document.getElementById('mapped-collections').textContent = geoData.features.length;
        
        // Analyze date ranges and find min/max years
        let foundMinYear = 2000;
        let foundMaxYear = 1000;
        
        // Extract filter options and analyze dates
        collections.forEach(collection => {
            // Extract date ranges
            if (collection.date_created) {
                const dateRange = parseDateString(collection.date_created);
                if (dateRange.minYear !== null && dateRange.maxYear !== null) {
                    foundMinYear = Math.min(foundMinYear, dateRange.minYear);
                    foundMaxYear = Math.max(foundMaxYear, dateRange.maxYear);
                }
            }
            
            // Extract other filter options
            if (collection.genre) categoryOptions.add(collection.genre);
            if (collection.place_of_production) placeOptions.add(collection.place_of_production);
            if (collection.classifications) {
                collection.classifications.forEach(cls => groupOptions.add(cls));
            }
        });
        
        // Round min/max years to nearest century for better UX
        minYear = Math.floor(foundMinYear / 100) * 100;
        maxYear = Math.ceil(foundMaxYear / 100) * 100;
        
        // Update date slider values and labels
        const dateSliderMin = document.getElementById('date-slider-min');
        const dateSliderMax = document.getElementById('date-slider-max');
        const dateRangeMin = document.getElementById('date-range-min');
        const dateRangeMax = document.getElementById('date-range-max');
        const selectedDateMin = document.getElementById('selected-date-min');
        const selectedDateMax = document.getElementById('selected-date-max');
        
        if (dateSliderMin && dateSliderMax && dateRangeMin && dateRangeMax && selectedDateMin && selectedDateMax) {
            dateSliderMin.min = minYear;
            dateSliderMin.max = maxYear;
            dateSliderMin.value = minYear;
            dateSliderMax.min = minYear;
            dateSliderMax.max = maxYear;
            dateSliderMax.value = maxYear;
            
            dateRangeMin.textContent = minYear;
            dateRangeMax.textContent = maxYear;
            selectedDateMin.textContent = minYear;
            selectedDateMax.textContent = maxYear;
        } else {
            console.warn('Date sliders not found in the DOM');
        }
        
        // Initialize filteredCollections with all collections
        filteredCollections = [...collections];
        
        // Create Lunr search index
        createSearchIndex();
        
        // Populate filter dropdowns
        populateFilterDropdowns();
        
        // Update UI
        updateCollectionsDisplay();
        updateMapWithFiltered();
        updateCharts();
        
        showLoading(false);
    } catch (error) {
        console.error('Error loading data:', error);
        showLoading(false);
        showError('Failed to load collection data. Please try again later.');
    }
}

// Create Lunr.js search index
function createSearchIndex() {
    console.log('Creating Lunr search index...');
    lunrIndex = lunr(function() {
        // Define fields to search
        this.field('sigla', { boost: 10 });
        this.field('title', { boost: 5 });
        this.field('title_tibetan');
        this.field('place_of_production');
        this.field('genre');
        this.field('classifications');
        this.field('description', { boost: 3 });
        
        // Add ref field for document lookup
        this.ref('id');
        
        // Add each collection to the index
        collections.forEach((collection, index) => {
            // Create a document with an ID for reference
            const doc = {
                id: index,
                sigla: collection.sigla || '',
                title: collection.title || '',
                title_tibetan: collection.title_tibetan || '',
                place_of_production: collection.place_of_production || '',
                genre: collection.genre || '',
                classifications: Array.isArray(collection.classifications) ? collection.classifications.join(' ') : '',
                description: collection.abstract || collection.description || ''
            };
            this.add(doc);
        });
    });
    console.log('Lunr search index created');
}

// Populate filter checkboxes
function populateFilterDropdowns() {
    const categoryContainer = document.getElementById('category-filter');
    const groupContainer = document.getElementById('group-filter');
    const placeContainer = document.getElementById('place-filter');
    
    // Clear existing content
    categoryContainer.innerHTML = '';
    groupContainer.innerHTML = '';
    placeContainer.innerHTML = '';
    
    // Sort options alphabetically
    const sortedCategories = Array.from(categoryOptions).sort();
    const sortedGroups = Array.from(groupOptions).sort();
    const sortedPlaces = Array.from(placeOptions).sort();
    
    // Count occurrences of each category
    const categoryCounts = {};
    const groupCounts = {};
    const placeCounts = {};
    
    collections.forEach(collection => {
        if (collection.genre) {
            categoryCounts[collection.genre] = (categoryCounts[collection.genre] || 0) + 1;
        }
        
        if (collection.place_of_production) {
            placeCounts[collection.place_of_production] = (placeCounts[collection.place_of_production] || 0) + 1;
        }
        
        if (collection.classifications) {
            collection.classifications.forEach(group => {
                groupCounts[group] = (groupCounts[group] || 0) + 1;
            });
        }
    });
    
    // Add category checkboxes
    sortedCategories.forEach(category => {
        const count = categoryCounts[category] || 0;
        const item = createCheckboxItem(category, 'category', count);
        categoryContainer.appendChild(item);
    });
    
    // Add group checkboxes
    sortedGroups.forEach(group => {
        const count = groupCounts[group] || 0;
        const item = createCheckboxItem(group, 'group', count);
        groupContainer.appendChild(item);
    });
    
    // Add place checkboxes
    sortedPlaces.forEach(place => {
        const count = placeCounts[place] || 0;
        const item = createCheckboxItem(place, 'place', count);
        placeContainer.appendChild(item);
    });
}

// Create a checkbox item for filters
function createCheckboxItem(value, type, count) {
    const item = document.createElement('div');
    item.className = 'filter-checkbox-item';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `${type}-${value.replace(/\s+/g, '-').toLowerCase()}`;
    checkbox.value = value;
    checkbox.className = `${type}-checkbox filter-checkbox`;
    
    // Add event listener to apply filters when checkbox is changed
    checkbox.addEventListener('change', applyFilters);
    
    const label = document.createElement('label');
    label.htmlFor = checkbox.id;
    label.textContent = value;
    
    const countSpan = document.createElement('span');
    countSpan.className = 'filter-checkbox-count';
    countSpan.textContent = `(${count})`;
    
    item.appendChild(checkbox);
    item.appendChild(label);
    item.appendChild(countSpan);
    
    return item;
}

// Parse date string to extract year range
function parseDateString(dateStr) {
    if (!dateStr) return { minYear: null, maxYear: null };
    
    // Convert to string if it's not already
    dateStr = String(dateStr);
    console.log('Parsing date:', dateStr);
    
    // Handle century ranges like "11th-12th cent." or "11.-12. Jh."
    const centuryMatch = dateStr.match(/(\d+)(?:st|nd|rd|th|\.)?\s*-\s*(\d+)(?:st|nd|rd|th|\.)?\s*(?:cent|Jh|Jahrhundert|century)/i);
    if (centuryMatch) {
        const startCentury = parseInt(centuryMatch[1]);
        const endCentury = parseInt(centuryMatch[2]);
        const result = {
            minYear: (startCentury - 1) * 100 + 1,  // e.g., 11th century starts at 1001
            maxYear: endCentury * 100               // e.g., 12th century ends at 1200
        };
        console.log('Century range match:', result);
        return result;
    }
    
    // Handle single century like "15th cent." or "15. Jh."
    const singleCenturyMatch = dateStr.match(/(\d+)(?:st|nd|rd|th|\.)?\s*(?:cent|Jh|Jahrhundert|century)/i);
    if (singleCenturyMatch) {
        const century = parseInt(singleCenturyMatch[1]);
        const result = {
            minYear: (century - 1) * 100 + 1,  // e.g., 15th century starts at 1401
            maxYear: century * 100             // e.g., 15th century ends at 1500
        };
        console.log('Single century match:', result);
        return result;
    }
    
    // Handle year ranges like "1640-1650" or "ca. 1640-1650"
    const yearRangeMatch = dateStr.match(/(?:ca\.?|circa|around|about)?\s*(\d{3,4})\s*-\s*(\d{3,4})/i);
    if (yearRangeMatch) {
        const result = {
            minYear: parseInt(yearRangeMatch[1]),
            maxYear: parseInt(yearRangeMatch[2])
        };
        console.log('Year range match:', result);
        return result;
    }
    
    // Handle single years like "1731" or "ca. 1731"
    const singleYearMatch = dateStr.match(/(?:ca\.?|circa|around|about)?\s*(\d{3,4})/i);
    if (singleYearMatch) {
        const year = parseInt(singleYearMatch[1]);
        const result = {
            minYear: year,
            maxYear: year
        };
        console.log('Single year match:', result);
        return result;
    }
    
    console.log('No date pattern matched for:', dateStr);
    return { minYear: null, maxYear: null };
}

// Perform search with mkdocs-style preview dropdown
function performSearch() {
    const searchInput = document.getElementById('search');
    const searchTerm = searchInput ? searchInput.value.trim() : '';
    const searchPreview = document.getElementById('search-preview');
    const searchResultsContainer = document.getElementById('search-preview-results');
    const searchResultsCount = document.getElementById('search-results-count');
    
    // Clear previous results
    searchResultsContainer.innerHTML = '';
    
    // Hide preview if search term is empty
    if (!searchTerm) {
        searchPreview.style.display = 'none';
        return;
    }
    
    // Show loading indicator
    searchResultsContainer.innerHTML = '<div class="p-3 text-center">Searching...</div>';
    searchPreview.style.display = 'block';
    
    try {
        let results = [];
        
        if (lunrIndex) {
            // Perform the search using Lunr
            results = lunrIndex.search(searchTerm);
            
            // If no results found with exact search, try wildcard search
            if (results.length === 0 && searchTerm.length >= 2) {
                results = lunrIndex.search(`${searchTerm}*`);
            }
            
            // If still no results, try fuzzy search
            if (results.length === 0 && searchTerm.length >= 3) {
                results = lunrIndex.search(`${searchTerm}~1`);
            }
        } else {
            // Fallback to basic search if Lunr index is not available
            results = collections.map((collection, index) => {
                const score = calculateBasicSearchScore(collection, searchTerm);
                return score > 0 ? { ref: index.toString(), score } : null;
            }).filter(result => result !== null);
        }
        
        // Update search results count
        searchResultsCount.textContent = results.length;
        
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
                // Use the existing showCollectionDetails function to display the modal
                showCollectionDetails(collection);
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

// Helper function to highlight search terms in text
function highlightSearchTerm(text, searchTerm) {
    if (!text || !searchTerm) return text;
    
    const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');
    return text.replace(regex, '<span class="search-result-highlight">$1</span>');
}

// Helper function to create a snippet with highlighted search term
function createSnippet(text, searchTerm, maxLength = 100) {
    if (!text || !searchTerm) return text;
    
    // Find position of search term in text
    const position = text.toLowerCase().indexOf(searchTerm.toLowerCase());
    
    if (position === -1) {
        // If term not found, return beginning of text
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }
    
    // Calculate start and end positions for snippet
    let start = Math.max(0, position - 40);
    let end = Math.min(text.length, position + searchTerm.length + 40);
    
    // Adjust if snippet is too long
    if (end - start > maxLength) {
        end = start + maxLength;
    }
    
    // Add ellipsis if needed
    const prefix = start > 0 ? '...' : '';
    const suffix = end < text.length ? '...' : '';
    
    // Extract snippet
    let snippet = text.substring(start, end);
    
    // Highlight search term
    snippet = highlightSearchTerm(snippet, searchTerm);
    
    return prefix + snippet + suffix;
}

// Helper function to escape special characters in regex
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Calculate basic search score for fallback search
function calculateBasicSearchScore(collection, searchTerm) {
    let score = 0;
    const term = searchTerm.toLowerCase();
    
    // Check sigla (highest weight)
    if (collection.sigla && collection.sigla.toLowerCase().includes(term)) {
        score += 10;
    }
    
    // Check title (high weight)
    if (collection.title && collection.title.toLowerCase().includes(term)) {
        score += 5;
    }
    
    // Check Tibetan title
    if (collection.title_tibetan && collection.title_tibetan.toLowerCase().includes(term)) {
        score += 3;
    }
    
    // Check place of production
    if (collection.place_of_production && collection.place_of_production.toLowerCase().includes(term)) {
        score += 2;
    }
    
    // Check description/abstract
    if ((collection.abstract && collection.abstract.toLowerCase().includes(term)) ||
        (collection.description && collection.description.toLowerCase().includes(term))) {
        score += 3;
    }
    
    return score;
}

// Apply filters to collections
function applyFilters() {
    const searchInput = document.getElementById('search');
    const searchTerm = searchInput ? searchInput.value.trim() : '';
    let searchResults = [];

    // Get selected category checkboxes
    const categoryCheckboxes = document.querySelectorAll('.category-checkbox:checked');
    const selectedCategories = Array.from(categoryCheckboxes).map(cb => cb.value);

    // Get selected group checkboxes
    const groupCheckboxes = document.querySelectorAll('.group-checkbox:checked');
    const selectedGroups = Array.from(groupCheckboxes).map(cb => cb.value);

    // Get selected place checkboxes
    const placeCheckboxes = document.querySelectorAll('.place-checkbox:checked');
    const selectedPlaces = Array.from(placeCheckboxes).map(cb => cb.value);

    console.log('Selected filters:', {
        search: searchTerm,
        categories: selectedCategories,
        groups: selectedGroups,
        places: selectedPlaces
    });

    // Get date range filter values
    const dateSliderMin = document.getElementById('date-slider-min');
    const dateSliderMax = document.getElementById('date-slider-max');
    const dateMinFilter = dateSliderMin ? parseInt(dateSliderMin.value) : minYear;
    const dateMaxFilter = dateSliderMax ? parseInt(dateSliderMax.value) : maxYear;

    console.log('Filtering with date range:', dateMinFilter, 'to', dateMaxFilter);
    
        // Search is handled by the performSearch function

    // Search term is not used for filtering in the main view anymore
    // It's handled by the search preview dropdown
    filteredCollections = collections.filter((collection, index) => {

        // Category filter
        if (selectedCategories.length > 0 && (!collection.genre || !selectedCategories.includes(collection.genre))) {
            return false;
        }

        // Group filter
        if (selectedGroups.length > 0) {
            if (!collection.classifications) return false;

            // Check if any of the collection's classifications match any of the selected groups
            const hasMatchingGroup = collection.classifications.some(cls => selectedGroups.includes(cls));
            if (!hasMatchingGroup) return false;
        }

        // Place filter
        if (selectedPlaces.length > 0 && (!collection.place_of_production || !selectedPlaces.includes(collection.place_of_production))) {
            return false;
        }

        // Date filter - check if date slider has been moved from default position
        const dateRangeMin = parseInt(document.getElementById('date-range-min').textContent);
        const dateRangeMax = parseInt(document.getElementById('date-range-max').textContent);
        const isDateFilterActive = dateMinFilter !== dateRangeMin || dateMaxFilter !== dateRangeMax;
        
        if (isDateFilterActive) {
            // If date filter is active, exclude entries without valid date ranges
            if (!collection.date_created) {
                console.log('Excluding collection without date:', collection.sigla);
                return false;
            }
            
            const dateRange = parseDateString(collection.date_created);
            
            // If we couldn't parse a date range, exclude the collection
            if (dateRange.minYear === null || dateRange.maxYear === null) {
                console.log('Excluding collection with unparseable date:', collection.sigla, collection.date_created);
                return false;
            }
            
            // Check if the collection's date range overlaps with the filter range
            if (dateRange.maxYear < dateMinFilter || dateRange.minYear > dateMaxFilter) {
                console.log('Filtering out collection by date:', collection.sigla, collection.date_created, 
                            'Collection range:', dateRange.minYear, '-', dateRange.maxYear, 
                            'Filter range:', dateMinFilter, '-', dateMaxFilter);
                return false;
            }
        } else {
            // If date filter is not active, include all entries regardless of date
            console.log('Date filter not active, including all entries');
        }
        
        return true;
    });
    
    // Update the filtered collections count
    document.getElementById('filtered-collections').textContent = filteredCollections.length;
    
    // Update the mapped collections count
    const mappedCollections = filteredCollections.filter(c => c.coordinates).length;
    document.getElementById('mapped-collections').textContent = mappedCollections;
    
    // Update the collections list
    updateCollectionsDisplay();
    
    // Update the map
    updateMapWithFiltered();
    
    // Update URL with current filters for sharing
    updateShareableUrl();
    
    // Update charts
    updateCharts();
}

// Reset all filters
function resetFilters() {
    // Reset search input
    document.getElementById('search').value = '';
    
    // Reset all checkboxes
    document.querySelectorAll('.filter-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Reset date sliders
    const dateSliderMin = document.getElementById('date-slider-min');
    const dateSliderMax = document.getElementById('date-slider-max');
    const selectedDateMin = document.getElementById('selected-date-min');
    const selectedDateMax = document.getElementById('selected-date-max');
    
    if (dateSliderMin && dateSliderMax) {
        dateSliderMin.value = minYear;
        dateSliderMax.value = maxYear;
        selectedDateMin.textContent = minYear;
        selectedDateMax.textContent = maxYear;
    }
    
    // Apply the reset filters
    applyFilters();
}

// Update the collections display
function updateCollectionsDisplay() {
    const container = document.getElementById('collections-container');
    container.innerHTML = '';
    
    if (filteredCollections.length === 0) {
        container.innerHTML = '<div class="col-12"><p>No collections match your filters.</p></div>';
        return;
    }
    
    // Display collections in cards
    filteredCollections.forEach(collection => {
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4 mb-3';
        
        const card = document.createElement('div');
        card.className = 'card collection-card h-100';
        card.dataset.fileName = collection.file_name;
        card.addEventListener('click', () => showCollectionDetails(collection));
        
        const cardBody = document.createElement('div');
        cardBody.className = 'card-body';
        
        // Title with sigla
        const title = document.createElement('h5');
        title.className = 'card-title';
        title.textContent = `${collection.sigla ? collection.sigla + ' — ' : ''}${collection.title || 'Untitled Collection'}`;
        
        // Place of production
        const place = document.createElement('p');
        place.className = 'card-text';
        place.innerHTML = collection.place_of_production ? 
            `<strong>Place:</strong> ${collection.place_of_production}` : '';
        
        // Category, classifications, and date
        const metadata = document.createElement('p');
        metadata.className = 'card-text';
        
        if (collection.genre) {
            const badge = document.createElement('span');
            badge.className = 'badge bg-primary';
            badge.textContent = collection.genre;
            metadata.appendChild(badge);
        }
        
        if (collection.classifications && collection.classifications.length > 0) {
            collection.classifications.forEach(cls => {
                const badge = document.createElement('span');
                badge.className = 'badge bg-secondary ms-1';
                badge.textContent = cls;
                metadata.appendChild(badge);
            });
        }
        
        // Add date badge if available
        if (collection.date_created) {
            const dateBadge = document.createElement('span');
            dateBadge.className = 'badge bg-info ms-1';
            dateBadge.textContent = collection.date_created;
            metadata.appendChild(dateBadge);
        }
        
        // Append elements
        cardBody.appendChild(title);
        cardBody.appendChild(place);
        cardBody.appendChild(metadata);
        card.appendChild(cardBody);
        col.appendChild(card);
        container.appendChild(col);
    });
}

// Legacy function maintained for compatibility
// Now just calls updateMapWithFiltered
function updateMap() {
    updateMapWithFiltered();
}

// Legacy function maintained for compatibility
// Now just calls updateMapWithFiltered
function updateMapMarkers() {
    updateMapWithFiltered();
}

function switchToMarkerView() {
    // Remove heatmap layer if it exists
    if (heatLayer) {
        map.removeLayer(heatLayer);
    }
    
    // Remove heatmap legend if it exists
    if (document.getElementById('heatmap-legend')) {
        document.getElementById('heatmap-legend').remove();
    }
    
    // Show markers
    markerCluster.addTo(map);
    
    isHeatmapActive = false;
    console.log('Switched to marker view');
}

// Switch to heatmap view
function switchToHeatmapView() {
    // Hide markers by removing the marker layer
    if (markerCluster) {
        map.removeLayer(markerCluster);
    }
    
    // Update heatmap
    updateHeatmap();
    
    isHeatmapActive = true;
    console.log('Switched to heatmap view');
}

// Update heatmap with filtered collections
function updateHeatmap() {
    // Remove existing heatmap layer if it exists
    if (heatLayer) {
        map.removeLayer(heatLayer);
    }
    
    // Get filtered collections with coordinates
    const filteredWithCoords = filteredCollections.filter(c => c.coordinates);
    
    // Show a message if no points to display
    if (filteredWithCoords.length === 0) {
        showError('No collections with coordinates to display in heatmap. Try adjusting your filters.');
        return;
    }
    
    // Create heat data points with weighted intensity based on collection attributes
    const heatData = filteredWithCoords.map(collection => {
        try {
            const coords = collection.coordinates.split(',');
            const lat = parseFloat(coords[0]);
            const lon = parseFloat(coords[1]);
            
            // Calculate intensity based on collection attributes
            // More constituents or classifications = higher intensity
            let intensity = 0.5; // Base intensity
            
            // Add intensity for constituents
            if (collection.constituents && collection.constituents.length) {
                // Cap at 10 constituents for intensity calculation
                intensity += Math.min(collection.constituents.length, 10) * 0.1;
            }
            
            // Add intensity for classifications
            if (collection.classifications && collection.classifications.length) {
                intensity += collection.classifications.length * 0.15;
            }
            
            // Add intensity for date (newer collections slightly higher intensity)
            if (collection.date_created) {
                const year = parseInt(collection.date_created);
                if (!isNaN(year) && year > 1000) {
                    // Normalize year between 1000-2000 to add 0-0.2 intensity
                    const normalizedYear = Math.min(Math.max(year, 1000), 2000);
                    intensity += ((normalizedYear - 1000) / 1000) * 0.2;
                }
            }
            
            return [lat, lon, intensity];
        } catch (error) {
            console.error(`Error creating heat point for ${collection.title}:`, error);
            return null;
        }
    }).filter(point => point !== null);
    
    // Create and add the heat layer with improved visual settings
    heatLayer = L.heatLayer(heatData, {
        radius: 30,         // Slightly larger radius for better visibility
        blur: 20,          // More blur for smoother appearance
        maxZoom: 12,       // Allow more zoom levels
        minOpacity: 0.4,   // Minimum opacity to ensure visibility
        max: 3.0,          // Maximum intensity value (helps normalize the heat display)
        gradient: {
            0.1: '#3388ff',  // Light blue for low intensity
            0.3: '#6699ff',  // Medium blue
            0.5: '#9966ff',  // Purple
            0.7: '#ff66cc',  // Pink
            0.9: '#ff3333'   // Red for high intensity
        }
    }).addTo(map);
    
    // Add a legend for the heatmap
    if (document.getElementById('heatmap-legend')) {
        document.getElementById('heatmap-legend').remove();
    }
    
    const legend = L.control({position: 'bottomright'});
    legend.onAdd = function() {
        const div = L.DomUtil.create('div', 'info legend');
        div.id = 'heatmap-legend';
        div.innerHTML = '<h6>Heatmap Intensity</h6>' +
            '<div class="d-flex align-items-center">' +
            '<span style="background: linear-gradient(to right, #3388ff, #6699ff, #9966ff, #ff66cc, #ff3333); height: 10px; flex-grow: 1; display: block;"></span>' +
            '</div>' +
            '<div class="d-flex justify-content-between">' +
            '<small>Low</small>' +
            '<small>High</small>' +
            '</div>' +
            '<small class="text-muted">Based on collection size, age, and classifications</small>';
        div.style.backgroundColor = 'white';
        div.style.padding = '10px';
        div.style.borderRadius = '5px';
        div.style.boxShadow = '0 1px 5px rgba(0,0,0,0.2)';
        div.style.width = '200px';
        return div;
    };
    
    if (isHeatmapActive) {
        legend.addTo(map);
    }
    
    // Fit map to bounds if we have points
    if (heatData.length > 0) {
        const latLngs = heatData.map(point => [point[0], point[1]]);
        const bounds = L.latLngBounds(latLngs);
        
        if (bounds.isValid()) {
            // For single or few points, don't zoom in too close
            if (heatData.length <= 3) {
                map.fitBounds(bounds, {
                    maxZoom: 7,
                    padding: [50, 50]
                });
            } else {
                map.fitBounds(bounds);
            }
        }
    }
}

// Update map with filtered collections
function updateMapWithFiltered() {
    // Clear existing markers
    if (markers) markers.clearLayers();
    if (markerCluster) markerCluster.clearLayers();
    
    // Get filtered collections with coordinates
    const filteredWithCoords = filteredCollections.filter(c => c.coordinates);
    
    // Create new GeoJSON data
    const features = filteredWithCoords.map(collection => {
        try {
            // Parse coordinates (format: "latitude,longitude")
            const coords = collection.coordinates.split(',');
            const lat = parseFloat(coords[0]);
            const lon = parseFloat(coords[1]);
            
            // Create GeoJSON feature
            return {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [lon, lat] // GeoJSON uses [lon, lat] order
                },
                properties: {
                    sigla: collection.sigla || '',
                    title: collection.title || '',
                    place: collection.place_of_production || '',
                    genre: collection.genre || '',
                    classifications: collection.classifications || [],
                    file_name: collection.file_name || ''
                }
            };
        } catch (error) {
            console.error(`Error creating GeoJSON for ${collection.title}:`, error);
            return null;
        }
    }).filter(feature => feature !== null);
    
    // Create GeoJSON layer and add it to the marker cluster
    const geoJsonLayer = L.geoJSON({
        type: 'FeatureCollection',
        features: features
    }, {
        pointToLayer: function(feature, latlng) {
            // Create markers with different colors based on genre/category
            const genre = feature.properties.genre;
            let markerColor = '#3388ff'; // Default blue
            
            // Assign different colors based on genre
            if (genre) {
                if (genre.toLowerCase().includes('kanjur')) markerColor = '#e41a1c'; // Red
                else if (genre.toLowerCase().includes('tanjur')) markerColor = '#377eb8'; // Blue
                else if (genre.toLowerCase().includes('tantra')) markerColor = '#4daf4a'; // Green
                else if (genre.toLowerCase().includes('collection')) markerColor = '#984ea3'; // Purple
            }
            
            // Create custom marker with the determined color
            return L.circleMarker(latlng, {
                radius: 12,
                fillColor: markerColor,
                color: '#000',
                weight: 1.5,
                opacity: 1,
                fillOpacity: 0.9
            });
        },
        onEachFeature: function(feature, layer) {
            // Create popup content
            const properties = feature.properties;
            let popupContent = `
                <h5>${properties.sigla ? properties.sigla + ' \u2014 ' : ''}${properties.title || 'Untitled'}</h5>
                <p><strong>Place:</strong> ${properties.place || 'Unknown'}</p>
            `;
            
            if (properties.genre) {
                popupContent += `<p><strong>Category:</strong> ${properties.genre}</p>`;
            }
            
            // Add click handler to show details
            layer.on('click', function() {
                // Find the corresponding collection
                const collection = collections.find(c => c.file_name === properties.file_name);
                if (collection) {
                    showCollectionDetails(collection);
                }
            });
            
            layer.bindPopup(popupContent);
        }
    });
    
    // Add the GeoJSON layer to the marker cluster and add to map
    markerCluster.addLayer(geoJsonLayer);
    
    // If we have filtered points, fit the map to them
    if (features.length > 0) {
        const bounds = markerCluster.getBounds();
        if (bounds && bounds.isValid()) {
            // For single or few points, don't zoom in too close
            if (features.length <= 3) {
                map.fitBounds(bounds, {
                    maxZoom: 7, // Limit maximum zoom level for few points
                    padding: [50, 50] // Add padding around bounds
                });
            } else {
                map.fitBounds(bounds);
            }
        }
    }
    
    // If heatmap is active, update it
    if (isHeatmapActive) {
        updateHeatmap();
    } else {
        // Make sure marker cluster is visible
        if (!map.hasLayer(markerCluster)) {
            markerCluster.addTo(map);
        }
    }
    
    // Update charts with the filtered data
    updateCharts();
}

// Show collection details in modal
function showCollectionDetails(collection) {
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    
    // Set title
    modalTitle.textContent = `${collection.sigla ? collection.sigla + ' — ' : ''}${collection.title || 'Untitled Collection'}`;
    
    // Build modal content
    let content = '';
    
    // Alternative title (without label, directly below title)
    if (collection.alternative_title) {
        content += `<p class="fs-5 fw-semibold text-muted">${collection.alternative_title}</p>`;
    }
    
    // Abstract (renamed to Historical Description)
    if (collection.abstract) {
        content += `<h4>Historical Description</h4>
                   <p>${collection.abstract}</p>`;
    }
    
    // Metadata table
    content += `<h4>Metadata</h4>
               <table class="table table-striped">
                   <tbody>`;
    
    if (collection.genre) {
        content += `<tr><th>Category</th><td>${collection.genre}</td></tr>`;
    }
    
    if (collection.classifications && collection.classifications.length > 0) {
        content += `<tr><th>Group</th><td>${collection.classifications.join(', ')}</td></tr>`;
    }
    
    if (collection.date_created) {
        content += `<tr><th>Creation Date</th><td>${collection.date_created}</td></tr>`;
    }
    
    if (collection.place_of_production) {
        let placeContent = collection.place_of_production;
        
        // Add BDRC reference in brackets if available
        if (collection.bdrc_reference) {
            placeContent += ` (<a href="${collection.bdrc_reference.url}" target="_blank">${collection.bdrc_reference.id}</a>)`;
        }
        
        content += `<tr><th>Place of Production</th><td>${placeContent}</td></tr>`;
    } else if (collection.bdrc_reference) {
        // If no place but BDRC reference exists, show it separately
        content += `<tr><th>Place of Production</th><td>
                    (<a href="${collection.bdrc_reference.url}" target="_blank">${collection.bdrc_reference.id}</a>)
                    </td></tr>`;
    }
    
    if (collection.coordinates) {
        content += `<tr><th>Coordinates</th><td>${collection.coordinates}</td></tr>`;
    }
    
    content += `</tbody></table>`;
    
    // Notes
    if (collection.notes && Object.keys(collection.notes).length > 0) {
        // Filter out the fields we don't want to display
        const filteredNotes = Object.entries(collection.notes).filter(([key]) => 
            key !== 'integratedrkts' && key !== 'isreferenceset'
        );
        
        // Only show the Notes section if there are notes to display after filtering
        if (filteredNotes.length > 0) {
            content += `<h4>Notes</h4>
                       <table class="table table-striped">
                           <tbody>`;
            
            // Process notes and convert true/false to checkboxes
            for (const [key, value] of filteredNotes) {
                if (value !== undefined) {
                    // Format the key by replacing underscores with spaces and capitalizing first letters
                    let formattedKey = key.replace(/_/g, ' ')
                                          .replace(/\b\w/g, l => l.toUpperCase())
                                          // Remove duplicated words (e.g., "Handlist Handlist" -> "Handlist")
                                          .replace(/([A-Za-z]+)\s\1/g, '$1');
                    
                    // Check if the value is a boolean string and convert to checkbox
                    if (value === 'true' || value === 'false') {
                        const isChecked = value === 'true';
                        content += `<tr>
                                    <th>${formattedKey}</th>
                                    <td>
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" ${isChecked ? 'checked' : ''} disabled>
                                        </div>
                                    </td>
                                  </tr>`;
                    } else {
                        content += `<tr><th>${formattedKey}</th><td>${value}</td></tr>`;
                    }
                }
            }
            
            content += `</tbody></table>`;
        }
    }
    
    // Editions (formerly Constituents)
    if (collection.constituents && collection.constituents.length > 0) {
        content += `<h4>Editions (${collection.constituents.length})</h4>
                   <table class="table table-striped constituent-table">
                       <thead>
                           <tr>
                               <th>ID/Title</th>
                               <th>URL</th>
                               <th>Medium</th>
                               <th>Extent/Script</th>
                           </tr>
                       </thead>
                       <tbody>`;
        
        collection.constituents.forEach(item => {
            // Format extent to show "X volumes" if it's just a number
            let extentDisplay = '';
            if (item.extent) {
                if (/^\d+$/.test(item.extent.trim())) {
                    extentDisplay = `Extent: ${item.extent} volumes`;
                } else {
                    extentDisplay = `Extent: ${item.extent}`;
                }
            }
            
            content += `<tr>
                           <td>${item.id ? 'ID: ' + item.id + '<br>' : ''}${item.title ? 'Title: ' + item.title : ''}</td>
                           <td>${item.url ? `<a href="${item.url}" target="_blank">Link</a>` : ''}</td>
                           <td>${item.medium || ''}</td>
                           <td>${extentDisplay ? extentDisplay + '<br>' : ''}${item.script ? 'Script: ' + item.script : ''}</td>
                       </tr>`;
        });
        
        content += `</tbody></table>`;
    }
    
    // Set modal content
    modalBody.innerHTML = content;
    
    // Add event listener for XML download button
    const downloadBtn = document.getElementById('download-xml-btn');
    if (downloadBtn) {
        // Remove any existing event listeners
        const newDownloadBtn = downloadBtn.cloneNode(true);
        downloadBtn.parentNode.replaceChild(newDownloadBtn, downloadBtn);
        
        // Add new event listener
        newDownloadBtn.addEventListener('click', function() {
            downloadCollectionXML(collection.file_name);
        });
    }
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('collection-modal'));
    modal.show();
}

// Helper function to show/hide loading indicator
function showLoading(isLoading) {
    const container = document.getElementById('collections-container');
    
    if (isLoading) {
        container.innerHTML = `
            <div class="col-12 loading">
                <div class="loading-spinner"></div>
            </div>
        `;
    }
}

// Helper function to show error message
function showError(message) {
    const container = document.getElementById('collections-container');
    container.innerHTML = `
        <div class="col-12">
            <div class="alert alert-danger" role="alert">
                ${message}
            </div>
        </div>
    `;
}

// Debounce function to limit how often a function is called
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(context, args);
        }, wait);
    };
}

// Update charts with filtered data (if they exist on the page)
function updateCharts() {
    // Only update charts if they exist on the page
    if (document.getElementById('category-chart')) {
        updateCategoryChart(filteredCollections);
    }
    
    if (document.getElementById('place-chart')) {
        updatePlaceChart(filteredCollections);
    }
}



// Download XML file for a collection
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

// Update the category distribution chart
function updateCategoryChart(filteredCollections) {
    const ctx = document.getElementById('category-chart');
    
    // Count collections by genre/category
    const categoryCounts = {};
    filteredCollections.forEach(collection => {
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
    if (categoryChart) {
        categoryChart.data.labels = labels;
        categoryChart.data.datasets[0].data = data;
        categoryChart.update();
    } else {
        categoryChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Collections by Category',
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

// Update the place distribution chart
function updatePlaceChart() {
    const ctx = document.getElementById('place-chart');
    
    // Count collections by place
    const placeCounts = {};
    filteredCollections.forEach(collection => {
        const place = collection.place_of_production || 'Unknown';
        placeCounts[place] = (placeCounts[place] || 0) + 1;
    });
    
    // Sort places by count (descending)
    const sortedPlaces = Object.keys(placeCounts).sort((a, b) => {
        return placeCounts[b] - placeCounts[a];
    });
    
    // Limit to top 5 places if there are more
    const topPlaces = sortedPlaces.length > 5 ? 
        sortedPlaces.slice(0, 5) : 
        sortedPlaces;
    
    // Prepare data for chart
    const labels = topPlaces;
    const data = topPlaces.map(place => placeCounts[place]);
    
    // Generate colors
    const colors = [
        '#377eb8', // Blue
        '#4daf4a', // Green
        '#984ea3', // Purple
        '#ff7f00', // Orange
        '#ffff33'  // Yellow
    ];
    
    // Create or update chart
    if (placeChart) {
        placeChart.data.labels = labels;
        placeChart.data.datasets[0].data = data;
        placeChart.update();
    } else {
        placeChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Collections by Place',
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
                    legend: {
                        position: 'right',
                        labels: {
                            boxWidth: 15
                        }
                    }
                }
            }
        });
    }
}

// Export filtered collections as JSON
function exportJSON() {
    const dataStr = JSON.stringify(filteredCollections, null, 2);
    const blob = new Blob([dataStr], {type: 'application/json'});
    saveAs(blob, 'tibetan_collections.json');
}

// Export filtered collections as CSV
function exportCSV() {
    // Define CSV headers
    const headers = [
        'sigla',
        'title',
        'alternative_title',
        'abstract',
        'genre',
        'date_created',
        'place_of_production',
        'coordinates',
        'bdrc_reference'
    ];
    
    // Create CSV content
    let csvContent = headers.join(',') + '\n';
    
    // Add data rows
    filteredCollections.forEach(collection => {
        const row = headers.map(header => {
            let value = collection[header] || '';
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
    saveAs(blob, 'tibetan_collections.csv');
}

// Create shareable URL with current filters
function updateShareableUrl() {
    const searchParams = new URLSearchParams();
    
    // Add current filter values to URL parameters
    const searchTerm = document.getElementById('search').value;
    if (searchTerm) searchParams.set('search', searchTerm);
    
    const categoryFilter = document.getElementById('category-filter').value;
    if (categoryFilter) searchParams.set('category', categoryFilter);
    
    const groupFilter = document.getElementById('group-filter').value;
    if (groupFilter) searchParams.set('group', groupFilter);
    
    const placeFilter = document.getElementById('place-filter').value;
    if (placeFilter) searchParams.set('place', placeFilter);
    
    // Update browser history without reloading the page
    const newUrl = window.location.pathname + (searchParams.toString() ? '?' + searchParams.toString() : '');
    window.history.replaceState({}, '', newUrl);
}

// Share current view as a link
function shareLink() {
    // Get the current URL with filters
    const shareUrl = window.location.href;
    
    // Copy to clipboard
    navigator.clipboard.writeText(shareUrl).then(() => {
        alert('Link copied to clipboard!');
    }).catch(err => {
        console.error('Could not copy link: ', err);
        alert('Could not copy link. Please copy the URL from your browser address bar.');
    });
}
