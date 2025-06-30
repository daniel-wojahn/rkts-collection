/**
 * Tibetan Buddhist Collections Explorer
 * Collections page JavaScript
 */

// Global variables
let collections = [];
let filteredCollections = [];
let lunrIndex; // Lunr search index
let categoryChart;
let placeChart;
let categoryOptions = new Set();
let groupOptions = new Set();
let placeOptions = new Set();

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    
    // Set up export buttons
    const exportJsonBtn = document.getElementById('export-json');
    const exportCsvBtn = document.getElementById('export-csv');
    const shareLinkBtn = document.getElementById('share-link');
    
    if (exportJsonBtn) exportJsonBtn.addEventListener('click', exportCollectionsJSON);
    if (exportCsvBtn) exportCsvBtn.addEventListener('click', exportCollectionsCSV);
    if (shareLinkBtn) shareLinkBtn.addEventListener('click', function() {
        // Copy current URL to clipboard
        navigator.clipboard.writeText(window.location.href).then(() => {
            alert('Link copied to clipboard!');
        }).catch(err => {
            console.error('Could not copy link: ', err);
            alert('Could not copy link. Please copy the URL from your browser address bar.');
        });
    });
    
    // Set up search functionality
    const searchInput = document.getElementById('collection-search');
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
    
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', function() {
            if (searchInput) {
                searchInput.value = '';
                document.getElementById('search-preview').style.display = 'none';
                // Show all collections when search is cleared
                filteredCollections = [...collections];
                organizeCollectionsByCategory();
            }
        });
    }
});

// Load data from JSON files
function loadData() {
    fetch('/static/data/collections.json')
        .then(response => response.json())
        .then(data => {
            collections = data;
            filteredCollections = [...collections]; // Initialize filtered collections
            
            // Create Lunr search index
            createSearchIndex();
            
            // Update statistics
            document.getElementById('total-collections').textContent = collections.length;
            const mappedCollections = collections.filter(c => c.coordinates).length;
            document.getElementById('mapped-collections').textContent = mappedCollections;
            
            // Populate category options
            collections.forEach(collection => {
                if (collection.genre) {
                    categoryOptions.add(collection.genre);
                }
                
                if (collection.classifications && Array.isArray(collection.classifications)) {
                    collection.classifications.forEach(group => {
                        groupOptions.add(group);
                    });
                }
                
                if (collection.place_of_production) {
                    placeOptions.add(collection.place_of_production);
                }
            });
            
            // Organize collections by category
            organizeCollectionsByCategory();
            
            // Generate charts
            updateCharts();
        })
        .catch(error => {
            console.error('Error loading data:', error);
        });
}

// Organize collections by category
function organizeCollectionsByCategory() {
    // Clear existing content
    document.querySelector('.kanjur-collections').innerHTML = '';
    document.querySelector('.tanjur-collections').innerHTML = '';
    document.querySelector('.tantra-collections').innerHTML = '';
    document.querySelector('.other-collections').innerHTML = '';
    
    // Sort collections by title
    const sortedCollections = [...filteredCollections].sort((a, b) => {
        const titleA = a.title || '';
        const titleB = b.title || '';
        return titleA.localeCompare(titleB);
    });
    
    // Group collections by category
    const kanjurCollections = sortedCollections.filter(c => c.genre && c.genre.toLowerCase().includes('kanjur'));
    const tanjurCollections = sortedCollections.filter(c => c.genre && c.genre.toLowerCase().includes('tanjur'));
    const tantraCollections = sortedCollections.filter(c => c.genre && c.genre.toLowerCase().includes('tantra'));
    const otherCollections = sortedCollections.filter(c => {
        return !c.genre || 
            (!c.genre.toLowerCase().includes('kanjur') && 
             !c.genre.toLowerCase().includes('tanjur') && 
             !c.genre.toLowerCase().includes('tantra'));
    });
    
    // Update category counts
    updateCategoryCounts(kanjurCollections.length, tanjurCollections.length, tantraCollections.length, otherCollections.length);
    
    // Populate Kanjur collections
    populateCollectionsList(kanjurCollections, '.kanjur-collections');
    
    // Populate Tanjur collections
    populateCollectionsList(tanjurCollections, '.tanjur-collections');
    
    // Populate Tantra collections
    populateCollectionsList(tantraCollections, '.tantra-collections');
    
    // Populate Other collections
    populateCollectionsList(otherCollections, '.other-collections');
    
    // Update search results count if element exists
    const searchResultsCount = document.getElementById('search-results-count');
    const searchInput = document.getElementById('collection-search');
    if (searchResultsCount && searchInput) {
        searchResultsCount.textContent = filteredCollections.length;
        // Always show search results count when there's a search term
        searchResultsCount.parentElement.style.display = searchInput.value.trim() ? 'inline-block' : 'none';
    }
}

// Populate collections list
function populateCollectionsList(collections, selector) {
    const container = document.querySelector(selector);
    
    if (collections.length === 0) {
        container.innerHTML = '<p class="text-muted">No collections found in this category.</p>';
        return;
    }
    
    collections.forEach(collection => {
        const item = document.createElement('a');
        item.href = '#';
        item.className = 'list-group-item list-group-item-action';
        item.setAttribute('data-file-name', collection.file_name);
        
        const title = collection.sigla ? 
            `${collection.sigla} — ${collection.title || 'Untitled'}` : 
            collection.title || 'Untitled';
        
        const place = collection.place_of_production ? 
            `<small class="text-muted d-block">Place: ${collection.place_of_production}</small>` : '';
        
        item.innerHTML = `
            <div class="d-flex w-100 justify-content-between">
                <h5 class="mb-1">${title}</h5>
                ${collection.date_created ? `<small>${collection.date_created}</small>` : ''}
            </div>
            ${place}
        `;
        
        // Add click event to show collection details
        item.addEventListener('click', function(e) {
            e.preventDefault();
            showCollectionDetails(collection);
        });
        
        container.appendChild(item);
    });
}

// Show collection details in modal
function showCollectionDetails(collection) {
    // The modal is now directly in the HTML, so we don't need to create it dynamically
    console.log('Showing collection details for:', collection.title);
    
    const modalTitle = document.getElementById('collection-modal-title');
    const modalBody = document.getElementById('collection-modal-body');
    
    // Set title (with null check)
    if (modalTitle) {
        modalTitle.textContent = `${collection.sigla ? collection.sigla + ' — ' : ''}${collection.title || 'Untitled Collection'}`;
    }
    
    // Build modal content
    let content = '';
    
    // Basic metadata
    content += '<div class="metadata-section mb-4">';
    content += '<h5>Basic Information</h5>';
    content += '<table class="table table-striped">';
    
    if (collection.alternative_title) {
        content += `<tr><th>Alternative Title</th><td>${collection.alternative_title}</td></tr>`;
    }
    
    if (collection.genre) {
        content += `<tr><th>Category</th><td>${collection.genre}</td></tr>`;
    }
    
    if (collection.date_created) {
        content += `<tr><th>Date Created</th><td>${collection.date_created}</td></tr>`;
    }
    
    if (collection.place_of_production) {
        let placeContent = collection.place_of_production;
        
        // Add BDRC reference if available
        if (collection.bdrc_reference) {
            placeContent += ` (<a href="${collection.bdrc_reference}" target="_blank">BDRC Reference</a>)`;
        }
        
        content += `<tr><th>Place of Production</th><td>${placeContent}</td></tr>`;
    }
    
    if (collection.extent) {
        // Format extent to show "X volumes" instead of just a number
        const formattedExtent = isNaN(collection.extent) ? 
            collection.extent : 
            `${collection.extent} volume${collection.extent > 1 ? 's' : ''}`;
        
        content += `<tr><th>Extent</th><td>${formattedExtent}</td></tr>`;
    }
    
    // Handle boolean fields as checkboxes
    const booleanFields = ['isreferenceedition', 'iscanonical'];
    booleanFields.forEach(field => {
        if (collection[field] !== undefined) {
            const fieldName = field.charAt(0).toUpperCase() + field.slice(1).replace('is', ' Is ');
            const checked = collection[field] === true || collection[field] === 'true';
            content += `
                <tr>
                    <th>${fieldName}</th>
                    <td>
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" ${checked ? 'checked' : ''} disabled>
                        </div>
                    </td>
                </tr>
            `;
        }
    });
    
    content += '</table>';
    content += '</div>';
    
    // Abstract/Description
    if (collection.abstract) {
        content += '<div class="abstract-section mb-4">';
        content += '<h5>Description</h5>';
        content += `<p>${collection.abstract}</p>`;
        content += '</div>';
    }
    
    // Classifications
    if (collection.classifications && collection.classifications.length > 0) {
        content += '<div class="classifications-section mb-4">';
        content += '<h5>Classifications</h5>';
        content += '<ul class="list-group">';
        collection.classifications.forEach(classification => {
            content += `<li class="list-group-item">${classification}</li>`;
        });
        content += '</ul>';
        content += '</div>';
    }
    
    // Notes
    if (collection.notes && collection.notes.length > 0) {
        content += '<div class="notes-section mb-4">';
        content += '<h5>Notes</h5>';
        content += '<ul class="list-group">';
        
        // Filter out unwanted fields from notes
        const filteredNotes = collection.notes.filter(note => {
            return !note.toLowerCase().includes('integratedrkts') && 
                   !note.toLowerCase().includes('isreferenceset');
        });
        
        filteredNotes.forEach(note => {
            content += `<li class="list-group-item">${note}</li>`;
        });
        content += '</ul>';
        content += '</div>';
    }
    
    // Related items (editions)
    if (collection.related_items && collection.related_items.length > 0) {
        content += '<div class="related-items-section">';
        content += '<h5>Editions</h5>';
        content += '<ul class="list-group">';
        collection.related_items.forEach(item => {
            content += `<li class="list-group-item">${item}</li>`;
        });
        content += '</ul>';
        content += '</div>';
    }
    
    // Set modal content (with null check)
    if (modalBody) {
        modalBody.innerHTML = content;
    }
    
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
    
    // Show modal (with null check)
    const modalElement = document.getElementById('collection-modal');
    if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    } else {
        console.error('Modal element not found');
    }
}

// Update charts with data
function updateCharts() {
    updateCategoryChart();
    updatePlaceChart();
}

// Update the category distribution chart using the generic function from utils.js
function updateCategoryChart() {
    // Use the generic chart function from utils.js
    categoryChart = updateGenericCategoryChart(
        collections, 
        'category-chart', 
        categoryChart, 
        'Collections by Category'
    );
}

// Update the place distribution chart with regional grouping
function updatePlaceChart() {
    const ctx = document.getElementById('place-chart');
    if (!ctx) {
        console.error('Place chart canvas element not found');
        return;
    }
    
    // Define regions with their geographical boundaries
    const regionMapping = {
        'Central Tibet': {
            bounds: {
                north: 32.0,
                south: 28.0,
                east: 92.0,
                west: 85.0
            },
            center: [29.6500, 91.1000] // Approximate center of Central Tibet (near Lhasa)
        },
        'Eastern Tibet': {
            bounds: {
                north: 36.0,
                south: 28.0,
                east: 103.0,
                west: 91.0
            },
            center: [32.0, 97.0] // Approximate center of Eastern Tibet
        },
        'Ladakh': {
            bounds: {
                north: 35.0,
                south: 32.0,
                east: 80.0,
                west: 75.5
            },
            center: [34.1526, 77.5771] // Approximate center of Ladakh
        },
        'Bhutan': {
            bounds: {
                north: 28.5,
                south: 26.5,
                east: 92.5,
                west: 88.5
            },
            center: [27.5142, 90.4336] // Approximate center of Bhutan
        },
        'Tibetan-Nepalese Borderlands': {
            bounds: {
                north: 29.5,
                south: 27.0,
                east: 88.5,
                west: 82.0
            },
            center: [28.25, 85.25] // Approximate center of the region
        },
        'Beijing and Mongolia': {
            bounds: {
                north: 50.0,
                south: 35.0,
                east: 125.0,
                west: 95.0
            },
            center: [42.5, 110.0] // Approximate center between Beijing and Mongolia
        },
        'Other': {
            bounds: null,
            center: null
        }
    };
    
    // Initialize region counts
    const regionCounts = {};
    Object.keys(regionMapping).forEach(region => {
        regionCounts[region] = 0;
    });
    
    // Count collections by region
    collections.forEach(collection => {
        const place = collection.place_of_production || 'Unknown';
        let lat = null;
        let lng = null;
        
        // Try to extract coordinates if available
        if (collection.coordinates) {
            const coords = collection.coordinates.split(',');
            if (coords.length === 2) {
                lat = parseFloat(coords[0]);
                lng = parseFloat(coords[1]);
            }
        }
        
        // Find the region for this place
        let matchedRegion = 'Other';

        // First try to match by coordinates if available
        if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
            for (const [region, data] of Object.entries(regionMapping)) {
                if (data.bounds) {
                    const { north, south, east, west } = data.bounds;
                    if (lat <= north && lat >= south && lng <= east && lng >= west) {
                        matchedRegion = region;
                        break;
                    }
                }
            }
        }
        
        // If no region matched by coordinates, try text matching
        if (matchedRegion === 'Other') {
            const placeLower = place.toLowerCase();
            
            // Central Tibet
            if (placeLower.includes('lhasa') || 
                placeLower.includes('sakya') || 
                placeLower.includes('narthang') || 
                placeLower.includes('zhalu') || 
                placeLower.includes('samye') || 
                placeLower.includes('ganden') || 
                placeLower.includes('drepung') || 
                placeLower.includes('sera') || 
                placeLower.includes('central tibet') || 
                placeLower.includes('ü-tsang') || 
                placeLower.includes('u-tsang') || 
                placeLower.includes('tsang') || 
                placeLower.includes('shigatse') || 
                placeLower.includes('gyantse')) {
                matchedRegion = 'Central Tibet';
            } 
            // Eastern Tibet
            else if (placeLower.includes('derge') || 
                     placeLower.includes('chamdo') || 
                     placeLower.includes('kham') || 
                     placeLower.includes('amdo') || 
                     placeLower.includes('eastern tibet') || 
                     placeLower.includes('batang') || 
                     placeLower.includes('lithang') || 
                     placeLower.includes('jyekundo') || 
                     placeLower.includes('qinghai') || 
                     placeLower.includes('sichuan') || 
                     placeLower.includes('yunnan') || 
                     placeLower.includes('gansu')) {
                matchedRegion = 'Eastern Tibet';
            } 
            // Ladakh
            else if (placeLower.includes('leh') || 
                     placeLower.includes('ladakh') || 
                     placeLower.includes('basgo') || 
                     placeLower.includes('hemis') || 
                     placeLower.includes('alchi') || 
                     placeLower.includes('thiksey') || 
                     placeLower.includes('shey') || 
                     placeLower.includes('jammu') || 
                     placeLower.includes('kashmir')) {
                matchedRegion = 'Ladakh';
            } 
            // Bhutan
            else if (placeLower.includes('thimphu') || 
                     placeLower.includes('bhutan') || 
                     placeLower.includes('paro') || 
                     placeLower.includes('punakha') || 
                     placeLower.includes('trongsa') || 
                     placeLower.includes('bumthang') || 
                     placeLower.includes('druk')) {
                matchedRegion = 'Bhutan';
            } 
            // Beijing and Mongolia
            else if (placeLower.includes('beijing') || 
                     placeLower.includes('mongol') || 
                     placeLower.includes('ulaanbaatar') || 
                     placeLower.includes('hohhot') || 
                     placeLower.includes('erdene zuu') || 
                     placeLower.includes('urga') || 
                     placeLower.includes('china') || 
                     placeLower.includes('peking')) {
                matchedRegion = 'Beijing and Mongolia';
            } 
            // Tibetan-Nepalese Borderlands
            else if (placeLower.includes('kathmandu') || 
                     placeLower.includes('nepal') || 
                     placeLower.includes('mustang') || 
                     placeLower.includes('dolpo') || 
                     placeLower.includes('jumla') || 
                     placeLower.includes('tshethang') || 
                     placeLower.includes('himalaya') || 
                     placeLower.includes('border')) {
                matchedRegion = 'Tibetan-Nepalese Borderlands';
            }
            // General Tibet (assign to Central Tibet if just "Tibet" is mentioned)
            else if (placeLower.includes('tibet') && !placeLower.includes('eastern tibet')) {
                matchedRegion = 'Central Tibet';
            }
        }

        // Increment the count for the matched region
        regionCounts[matchedRegion] = (regionCounts[matchedRegion] || 0) + 1;
    });
    
    // Sort regions by count (descending)
    const sortedRegions = Object.keys(regionCounts).sort((a, b) => {
        return regionCounts[b] - regionCounts[a];
    });
    
    // Prepare data for chart
    const labels = sortedRegions;
    const data = sortedRegions.map(region => regionCounts[region]);
    
    // Generate colors - using a more distinct color palette
    const colors = [
        '#e41a1c', // Red
        '#377eb8', // Blue
        '#4daf4a', // Green
        '#984ea3', // Purple
        '#ff7f00', // Orange
        '#a65628', // Brown
        '#f781bf', // Pink
        '#999999'  // Gray
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

// Create Lunr.js search index
function createSearchIndex() {
    console.log('Creating Lunr search index for collections page...');
    lunrIndex = lunr(function() {
        // Define fields to search
        this.field('sigla', { boost: 10 });
        this.field('title', { boost: 5 });
        this.field('title_tibetan');
        this.field('place_of_production');
        this.field('genre');
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
                description: collection.abstract || collection.description || ''
            };
            this.add(doc);
        });
    });
    console.log('Lunr search index created for collections page');
}

// Perform search with mkdocs-style preview dropdown
function performSearch() {
    // Use the generic search function from utils.js
    performGenericSearch({
        searchInputId: 'collection-search',
        searchPreviewId: 'search-preview',
        searchResultsContainerId: 'search-preview-results',
        searchResultsCountId: 'search-results-count',
        collections: collections,
        lunrIndex: lunrIndex,
        showDetailsCallback: showCollectionDetails,
        // Update filteredCollections when search is performed
        updateFilteredCollections: true,
        // Reorganize collections by category after search
        onResultsUpdated: function(results) {
            organizeCollectionsByCategory();
            updateCharts();
        }
    });
}

// calculateBasicSearchScore function is now imported from utils.js

// Update category counts in the UI
function updateCategoryCounts(kanjurCount, tanjurCount, tantraCount, otherCount) {
    // Update the count badges in the accordion headers
    const kanjurBadge = document.querySelector('#kanjur-heading .badge');
    const tanjurBadge = document.querySelector('#tanjur-heading .badge');
    const tantraBadge = document.querySelector('#tantra-heading .badge');
    const otherBadge = document.querySelector('#other-heading .badge');
    
    if (kanjurBadge) kanjurBadge.textContent = kanjurCount;
    if (tanjurBadge) tanjurBadge.textContent = tanjurCount;
    if (tantraBadge) tantraBadge.textContent = tantraCount;
    if (otherBadge) otherBadge.textContent = otherCount;
}

// Debounce function is now in utils.js

// Export filtered collections as JSON
function exportCollectionsJSON() {
    // Use the utility function from utils.js
    exportJSON(filteredCollections, 'tibetan_collections.json');
}

// Export filtered collections as CSV
function exportCollectionsCSV() {
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

// End of utility functions

// downloadCollectionXML function is now imported from utils.js
