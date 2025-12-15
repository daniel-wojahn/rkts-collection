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
let mediumOptions = new Set();
let minYear = 1000;
let maxYear = 2050;
let categoryChart; // Chart.js instance for category chart
let placeChart; // Chart.js instance for place chart
let skipFitBounds = false; // Flag to prevent fitBounds on filter changes

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initMap();
    loadData();
    
    // Set up event listeners
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
    
    const includeUndatedCheckbox = document.getElementById('include-undated');
    let undatedAuto = true;
    function toggleUndatedBasedOnRange() {
        const minVal = parseInt(dateSliderMin.value);
        const maxVal = parseInt(dateSliderMax.value);
        const isFullRange = (minVal === minYear) && (maxVal === maxYear);
        if (includeUndatedCheckbox) {
            includeUndatedCheckbox.checked = isFullRange;
        }
    }
    
    if (dateSliderMin) {
        dateSliderMin.addEventListener('input', function() {
            const value = parseInt(this.value);
            if (value > parseInt(dateSliderMax.value)) {
                this.value = dateSliderMax.value;
                selectedDateMin.textContent = this.value;
            } else {
                selectedDateMin.textContent = value;
            }
        });
        
        // Apply filters immediately when slider stops
        dateSliderMin.addEventListener('change', function() {
            if (undatedAuto && includeUndatedCheckbox) {
                toggleUndatedBasedOnRange();
            }
            applyFilters();
        });
    }
    
    // Listener for undated checkbox itself
    if (includeUndatedCheckbox) {
        includeUndatedCheckbox.addEventListener('change', () => {
            undatedAuto = false; // user overrode
            applyFilters();
        });
    }
    
    if (dateSliderMax) {
        dateSliderMax.addEventListener('input', function() {
            const value = parseInt(this.value);
            if (value < parseInt(dateSliderMin.value)) {
                this.value = dateSliderMin.value;
                selectedDateMax.textContent = this.value;
            } else {
                selectedDateMax.textContent = value;
            }
        });
        
        // Apply filters immediately when slider stops
        dateSliderMax.addEventListener('change', function() {
            if (undatedAuto && includeUndatedCheckbox) {
                toggleUndatedBasedOnRange();
            }
            applyFilters();
        });
    }
    
    // Set up export buttons if they exist on this page
    const exportJsonBtn = document.getElementById('export-json');
    const exportCsvBtn = document.getElementById('export-csv');
    const shareLinkBtn = document.getElementById('share-link');
    
    if (exportJsonBtn) exportJsonBtn.addEventListener('click', exportFilteredAsJSON);
    if (exportCsvBtn) exportCsvBtn.addEventListener('click', exportFilteredAsCSV);
    if (shareLinkBtn) shareLinkBtn.addEventListener('click', function() {
        // Copy current URL to clipboard
        navigator.clipboard.writeText(window.location.href).then(() => {
            alert('Link copied to clipboard!');
        }).catch(err => {
            console.error('Could not copy link: ', err);
            alert('Could not copy link. Please copy the URL from your browser address bar.');
        });
    });
});

// Helper to ensure all interaction handlers are active and map container is focusable
function enableMapInteractions() {
    if (!map) return;
    // Enable primary interaction handlers (they may already be on, but enabling again is safe)
    map.dragging?.enable();
    map.scrollWheelZoom?.enable();
    map.touchZoom?.enable();
    map.doubleClickZoom?.enable();
    map.boxZoom?.enable();
    map.keyboard?.enable();

    // Make sure the container can receive focus so wheel events are captured immediately
    const container = map.getContainer();
    if (container && !container.hasAttribute('tabindex')) {
        container.setAttribute('tabindex', '0');
    }
}

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

    // Ensure all interaction gestures are active immediately
    enableMapInteractions();
    
    // Re-enable interactions when map container gains focus or is clicked
    const mapContainer = map.getContainer();
    mapContainer.addEventListener('mouseenter', enableMapInteractions);
    mapContainer.addEventListener('click', function(e) {
        // Only enable interactions, don't interfere with marker clicks
        enableMapInteractions();
    });
    
    // Prevent fitBounds from being called when user is actively interacting with map
    map.on('zoomstart', function() {
        skipFitBounds = true;
    });
    map.on('dragstart', function() {
        skipFitBounds = true;
    });
    // Reset flag after a delay to allow programmatic fitBounds on fresh filter
    map.on('zoomend', function() {
        setTimeout(function() { skipFitBounds = false; }, 2000);
    });
    map.on('dragend', function() {
        setTimeout(function() { skipFitBounds = false; }, 2000);
    });
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
            if (collection.medium) mediumOptions.add(collection.medium);
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
        
        // Update the map with all collections initially
        updateMapWithFiltered();
        
        // Populate filter dropdowns
        populateFilterDropdowns();
        
        // Initialize dynamic filter options
        updateDynamicFilterOptions();
        
        // Update charts with initial data
        updateCharts();
        
        // Display all collections initially
        updateCollectionsDisplay();
        
        showLoading(false);
    } catch (error) {
        console.error('Error loading data:', error);
        showLoading(false);
        showError('Failed to load collection data. Please try again later.');
    }
}

// Create Lunr.js search index
function createSearchIndex() {
    
    // Configure lunr with advanced indexing
    lunrIndex = lunr(function() {
        // Define fields to search with appropriate boosts
        this.field('sigla', { boost: 12 }); // Highest priority for sigla
        this.field('title', { boost: 8 }); // High priority for title
        this.field('title_tibetan', { boost: 6 }); // Good priority for Tibetan title
        this.field('place_of_production', { boost: 5 });
        this.field('genre', { boost: 4 });
        this.field('classifications', { boost: 4 });
        this.field('description', { boost: 3 });
        this.field('all'); // Combined field for better full-text search
        
        // Add ref field for document lookup
        this.ref('id');
        
        // Define and register a named pipeline function to handle Tibetan script and special characters
        const normalizeTibetan = function(token, tokenIndex, tokens) {
            if (!token) return null;
            // Normalize token by removing diacritics and special characters
            return token.toString().replace(/[\u0300-\u036f]/g, '').toLowerCase();
        };
        
        // Register the function with the pipeline
        lunr.Pipeline.registerFunction(normalizeTibetan, 'normalizeTibetan');
        
        // Add the registered function to the pipeline
        this.pipeline.add(normalizeTibetan);
        
        // Add each collection to the index
        collections.forEach((collection, index) => {
            // Create a document with an ID for reference
            const sigla = collection.sigla || '';
            const title = collection.title || '';
            const title_tibetan = collection.title_tibetan || '';
            const place = collection.place_of_production || '';
            const genre = collection.genre || '';
            const classifications = Array.isArray(collection.classifications) ? 
                collection.classifications.join(' ') : '';
            const description = collection.abstract || collection.description || '';
            
            // Create a combined field for better full-text search
            const all = `${sigla} ${title} ${title_tibetan} ${place} ${genre} ${classifications} ${description}`;
            
            const doc = {
                id: index,
                sigla: sigla,
                title: title,
                title_tibetan: title_tibetan,
                place_of_production: place,
                genre: genre,
                classifications: classifications,
                description: description,
                all: all
            };
            
            this.add(doc);
        });
    });
}

// Populate filter checkboxes
function populateFilterDropdowns() {
    const categoryContainer = document.getElementById('category-filter');
    const groupContainer = document.getElementById('group-filter');
    const placeContainer = document.getElementById('place-filter');
    const mediumContainer = document.getElementById('medium-filter');
    
    // Clear existing content
    categoryContainer.innerHTML = '';
    groupContainer.innerHTML = '';
    placeContainer.innerHTML = '';
    if (mediumContainer) mediumContainer.innerHTML = '';
    
    // Sort options alphabetically
    const sortedCategories = Array.from(categoryOptions).sort();
    const sortedGroups = Array.from(groupOptions).sort();
    const sortedPlaces = Array.from(placeOptions).sort();
    const sortedMedia = Array.from(mediumOptions).sort();
    
    // Count occurrences of each category
    const categoryCounts = {};
    const groupCounts = {};
    const placeCounts = {};
    const mediumCounts = {};
    
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
        if (collection.medium) {
            mediumCounts[collection.medium] = (mediumCounts[collection.medium] || 0) + 1;
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

    if (mediumContainer) {
        sortedMedia.forEach(medium => {
            const count = mediumCounts[medium] || 0;
            const item = createCheckboxItem(medium, 'medium', count);
            mediumContainer.appendChild(item);
        });
    }
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
    checkbox.dataset.type = type;
    checkbox.dataset.value = value;
    
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

// Update filter options based on current selections
function updateDynamicFilterOptions() {
    // Use currently visible (filtered) collections if available, otherwise all
    const currentCollections = (typeof filteredCollections !== 'undefined' && Array.isArray(filteredCollections) && filteredCollections.length > 0)
        ? filteredCollections
        : collections;

    // Prepare count maps for each filter type
    const counts = {
        category: {},
        group: {},
        place: {},
        medium: {}
    };

    currentCollections.forEach(coll => {
        if (coll.genre) {
            counts.category[coll.genre] = (counts.category[coll.genre] || 0) + 1;
        }
        
        if (coll.place_of_production) {
            counts.place[coll.place_of_production] = (counts.place[coll.place_of_production] || 0) + 1;
        }
        
        if (coll.classifications) {
            // Deduplicate groups within a single collection to avoid inflated counts
            const uniqueGroups = new Set(coll.classifications);
            uniqueGroups.forEach(group => {
                counts.group[group] = (counts.group[group] || 0) + 1;
            });
        }
        if (coll.medium) {
            counts.medium[coll.medium] = (counts.medium[coll.medium] || 0) + 1;
        }
    });

    // Update each checkbox UI based on new counts
    document.querySelectorAll('.filter-checkbox').forEach(checkbox => {
        const type = checkbox.dataset.type;
        const value = checkbox.dataset.value;
        const count = counts[type][value] || 0;
        const countSpan = checkbox.parentElement.querySelector('.filter-checkbox-count');
        if (countSpan) countSpan.textContent = `(${count})`;

        if (checkbox.checked) {
            // Never disable an option that is currently selected
            checkbox.disabled = false;
            checkbox.parentElement.classList.remove('disabled-filter-option');
        } else {
            const shouldDisable = count === 0;
            checkbox.disabled = shouldDisable;
            checkbox.parentElement.classList.toggle('disabled-filter-option', shouldDisable);
        }
    });
}

// Parse date string to extract year range
function parseDateString(dateStr) {
    if (!dateStr) return { minYear: null, maxYear: null };
    
    // Convert to string if it's not already
    dateStr = String(dateStr);
    
    // Handle century ranges like "11th-12th cent." or "11.-12. Jh."
    const centuryMatch = dateStr.match(/(\d+)(?:st|nd|rd|th|\.)?\s*-\s*(\d+)(?:st|nd|rd|th|\.)?\s*(?:cent|Jh|Jahrhundert|century)/i);
    if (centuryMatch) {
        const startCentury = parseInt(centuryMatch[1]);
        const endCentury = parseInt(centuryMatch[2]);
        const result = {
            minYear: (startCentury - 1) * 100 + 1,  // e.g., 11th century starts at 1001
            maxYear: endCentury * 100               // e.g., 12th century ends at 1200
        };
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
        return result;
    }
    
    // Handle year ranges like "1640-1650" or "ca. 1640-1650"
    const yearRangeMatch = dateStr.match(/(?:ca\.?|circa|around|about)?\s*(\d{3,4})\s*-\s*(\d{3,4})/i);
    if (yearRangeMatch) {
        const result = {
            minYear: parseInt(yearRangeMatch[1]),
            maxYear: parseInt(yearRangeMatch[2])
        };
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
        return result;
    }
    
    return { minYear: null, maxYear: null };
}

// Perform search with lunr.js
function performSearch() {
    // Use the generic search function from utils.js
    performGenericSearch({
        searchInputId: 'search',
        searchPreviewId: 'search-preview',
        searchResultsContainerId: 'search-preview-results',
        searchResultsCountId: 'search-results-count',
        collections: collections,
        lunrIndex: lunrIndex,
        showDetailsCallback: showCollectionDetails,
        // Update filteredCollections when search is performed
        updateFilteredCollections: true,
        // Apply other filters and update UI after search
        onResultsUpdated: function(results) {
            // Update the filtered collections count
            document.getElementById('filtered-collections').textContent = filteredCollections.length;
            
            // Update the mapped collections count
            const mappedCollections = filteredCollections.filter(c => c.coordinates).length;
            document.getElementById('mapped-collections').textContent = mappedCollections;
            
            // Update the collections list
            updateCollectionsDisplay();
            
            // Update the map
            updateMapWithFiltered();
            
            // Update charts
            updateCharts();
        }
    });
}

// Apply filters to collections
function applyFilters() {
    const searchInput = document.getElementById('search');
    const searchTerm = searchInput ? searchInput.value.trim() : '';

    // Get selected category checkboxes
    const categoryCheckboxes = document.querySelectorAll('.category-checkbox:checked');
    const selectedCategories = Array.from(categoryCheckboxes).map(cb => cb.value);

    // Get selected group checkboxes
    const groupCheckboxes = document.querySelectorAll('.group-checkbox:checked');
    const selectedGroups = Array.from(groupCheckboxes).map(cb => cb.value);
    
    // Get selected place checkboxes
    const placeCheckboxes = document.querySelectorAll('.place-checkbox:checked');
    const selectedPlaces = Array.from(placeCheckboxes).map(cb => cb.value);
    
    // Get date range filter values
    const dateSliderMin = document.getElementById('date-slider-min');
    const dateSliderMax = document.getElementById('date-slider-max');
    const dateMinFilter = dateSliderMin ? parseInt(dateSliderMin.value) : minYear;
    const dateMaxFilter = dateSliderMax ? parseInt(dateSliderMax.value) : maxYear;
    // Include-undated checkbox
    const includeUndatedCheckbox = document.getElementById('include-undated');
    const includeUndated = includeUndatedCheckbox ? includeUndatedCheckbox.checked : true;

    const mediumCheckboxes = document.querySelectorAll('.medium-checkbox:checked');
    const selectedMedia = Array.from(mediumCheckboxes).map(cb => cb.value);
    
    filteredCollections = filterCollections(
        collections,
        {
            searchTerm: searchTerm,
            minYear: dateMinFilter,
            maxYear: dateMaxFilter
        },
        // Custom filter function for app-specific filtering needs
        collection => {
            // Category filter - if any categories are selected
            const matchesCategory = selectedCategories.length === 0 || 
                                  (collection.genre && selectedCategories.includes(collection.genre));
            
            // Group filter - specific to this page
            const matchesGroup = selectedGroups.length === 0 || 
                               (collection.classifications && 
                                collection.classifications.some(cls => selectedGroups.includes(cls)));
            
            // Place filter - if any places are selected
            const matchesPlace = selectedPlaces.length === 0 || 
                               (collection.place_of_production && 
                                selectedPlaces.includes(collection.place_of_production));
            // Medium filter - if any media are selected
            const matchesMedium = selectedMedia.length === 0 || 
                                  (collection.medium && selectedMedia.includes(collection.medium));
            
            // Undated handling
            const hasDate = parseDateRange(collection.date_created) !== null;
            const matchesUndated = includeUndated || hasDate;
            
            return matchesCategory && matchesGroup && matchesPlace && matchesMedium && matchesUndated;
        }
    );
    
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
    updateShareableUrlFromFilters();
    
    // Update charts
    updateCharts();
    
    // Update filter options based on current selections
    updateDynamicFilterOptions();
}

// Reset all filters
function resetFilters() {
    // Reset search input
    document.getElementById('search').value = '';
    
    // Reset all checkboxes
    document.querySelectorAll('.filter-checkbox').forEach(checkbox => {
        checkbox.checked = false;
        checkbox.disabled = false;
        checkbox.parentElement.classList.remove('disabled-filter-option');
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
    
    // Reset filter counts to original values
    populateFilterDropdowns();
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

// Alias for backward compatibility
const updateMapMarkers = updateMapWithFiltered;
const updateMap = updateMapWithFiltered; // Keep this alias for backward compatibility

function switchToMarkerView() {
    enableMapInteractions();
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
}

// Switch to heatmap view
function switchToHeatmapView() {
    enableMapInteractions();
    // Hide markers by removing the marker layer
    if (markerCluster) {
        map.removeLayer(markerCluster);
    }
    
    // Update heatmap
    updateHeatmap();
    
    isHeatmapActive = true;
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
            
            // Add click handler to show details - use a "View Details" link in popup instead
            // to avoid conflict between popup display and modal opening
            popupContent += `<p class="mt-2 mb-0"><a href="#" class="view-details-link" data-filename="${properties.file_name}">View Details →</a></p>`;
            
            layer.bindPopup(popupContent);
            
            // Handle click on the "View Details" link inside popup
            layer.on('popupopen', function() {
                const popup = layer.getPopup();
                const popupEl = popup.getElement();
                if (popupEl) {
                    const link = popupEl.querySelector('.view-details-link');
                    if (link) {
                        link.addEventListener('click', function(e) {
                            e.preventDefault();
                            e.stopPropagation();
                            const fileName = this.getAttribute('data-filename');
                            const collection = collections.find(c => c.file_name === fileName);
                            if (collection) {
                                map.closePopup();
                                showCollectionDetails(collection);
                            }
                        });
                    }
                }
            });
        }
    });
    
    // Add the GeoJSON layer to the marker cluster and add to map
    markerCluster.addLayer(geoJsonLayer);
    
    // If we have filtered points, fit the map to them (unless user recently interacted)
    if (features.length > 0 && !skipFitBounds) {
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

// showError function is now imported from utils.js

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



// downloadCollectionXML function is now imported from utils.js

// Update the category distribution chart using the generic function from utils.js
function updateCategoryChart(filteredCollections) {
    // Use the generic chart function from utils.js
    categoryChart = updateGenericCategoryChart(
        filteredCollections, 
        'category-chart', 
        categoryChart, 
        'Collections by Category'
    );
}

// Update the place distribution chart with regional grouping
function updatePlaceChart() {
    // Use the generic regional chart function from utils.js
    placeChart = updateGenericRegionalChart(
        filteredCollections,
        'place-chart',
        placeChart,
        'Regional Distribution'
    );
}

// Export filtered collections as JSON
function exportFilteredAsJSON() {
    // Use the utility function from utils.js
    exportJSON(filteredCollections, 'tibetan_collections.json');
}

// Export filtered collections as CSV
function exportFilteredAsCSV() {
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
    
    // Use the utility function from utils.js
    exportCSV(filteredCollections, headers, 'tibetan_collections.csv');
}

// Create shareable URL with current filters
function updateShareableUrlFromFilters() {
    // Use the generic updateShareableUrl utility function from utils.js
    return window.updateShareableUrl({
        // Map filter parameter names to element IDs
        elementIds: {
            'search': 'search',
            'category': 'category-filter',
            'group': 'group-filter',
            'place': 'place-filter',
            'medium': 'medium-filter'
        }
    });
}

// End of utility functions
