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
    
    if (exportJsonBtn) exportJsonBtn.addEventListener('click', exportJSON);
    if (exportCsvBtn) exportCsvBtn.addEventListener('click', exportCSV);
    if (shareLinkBtn) shareLinkBtn.addEventListener('click', shareLink);
    
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

// Update the category distribution chart
function updateCategoryChart() {
    const ctx = document.getElementById('category-chart');
    
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
    const searchInput = document.getElementById('collection-search');
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
                // Show collection details
                showCollectionDetails(collection);
                // Hide the search preview
                searchPreview.style.display = 'none';
                // Clear the search input
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

// Debounce function to limit how often a function is called
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
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

// Share current view as a link
function shareLink() {
    // Get the current URL
    const shareUrl = window.location.href;
    
    // Copy to clipboard
    navigator.clipboard.writeText(shareUrl).then(() => {
        alert('Link copied to clipboard!');
    }).catch(err => {
        console.error('Could not copy link: ', err);
        alert('Could not copy link. Please copy the URL from your browser address bar.');
    });
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
