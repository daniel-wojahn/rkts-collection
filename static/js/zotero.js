/**
 * rKTs Tibetan Buddhist Collections Explorer
 * Bibliography Integration using Zotero API
 */

// Configuration
const ZOTERO_API_BASE = 'https://api.zotero.org';
const ZOTERO_GROUP_ID = '2296997'; // rKTs Bibliography group ID
const ZOTERO_GROUP_URL = 'https://www.zotero.org/groups/2296997/rkts_bibliography/library';
const ZOTERO_API_KEY = 'HPibzNjw5n2fiaLHdG8Dz8s0'; // Add your Zotero API key here if required
const ITEMS_PER_PAGE = 100; // Max items per API request
const CACHE_KEY = 'rkts_zotero_cache';
const CACHE_EXPIRY_MS = 30 * 60 * 1000; // Cache expires after 30 minutes

// Global variables
let allPublications = [];
let filteredPublications = [];
let allTags = new Set();
let currentView = 'cards'; // cards, list, compact
let isLoading = false;
let publicationsCount = 0;
let currentFilters = {
    search: '',
    sort: 'date',
    direction: 'desc',
    type: 'all',
    tag: ''
};

// Initialize the application
function initializeZotero() {
    // Check if we're on the Zotero page
    if (!document.querySelector('#recent-publications')) {
        return;
    }
    
    // Set up Zotero group link
    const zoteroGroupLink = document.getElementById('zotero-group-link');
    if (zoteroGroupLink) {
        zoteroGroupLink.href = ZOTERO_GROUP_URL;
    }
    
    // Set up copy group link button
    const copyGroupLinkBtn = document.getElementById('copy-group-link');
    if (copyGroupLinkBtn) {
        copyGroupLinkBtn.addEventListener('click', function() {
            navigator.clipboard.writeText(ZOTERO_GROUP_URL)
                .then(() => {
                    // Change button text temporarily
                    const originalText = this.innerHTML;
                    this.innerHTML = '<i class="bi bi-check-lg me-2"></i>Copied!';
                    setTimeout(() => {
                        this.innerHTML = originalText;
                    }, 2000);
                })
                .catch(err => {
                    console.error('Failed to copy: ', err);
                    alert('Failed to copy link to clipboard');
                });
        });
    }
    
    // Set up search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function() {
            const searchTerm = this.value.trim().toLowerCase();
            currentFilters.search = searchTerm;
            applyFilters();
        }, 300));
        
        // Set up clear search button
        const clearSearchBtn = document.getElementById('clear-search-btn');
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', function() {
                searchInput.value = '';
                currentFilters.search = '';
                applyFilters();
            });
        }
    }
    
    // Set up type filter
    const typeFilter = document.getElementById('type-filter');
    if (typeFilter) {
        typeFilter.addEventListener('change', function() {
            currentFilters.type = this.value;
            applyFilters();
        });
    }
    
    // Set up sort order
    const sortOrder = document.getElementById('sort-order');
    if (sortOrder) {
        sortOrder.addEventListener('change', function() {
            const [sort, direction] = this.value.split('-');
            currentFilters.sort = sort;
            currentFilters.direction = direction;
            applyFilters();
        });
    }
    
    // Set up view options
    const viewCards = document.getElementById('view-cards');
    const viewList = document.getElementById('view-list');
    const viewCompact = document.getElementById('view-compact');
    
    if (viewCards) viewCards.addEventListener('click', () => setActiveView('cards'));
    if (viewList) viewList.addEventListener('click', () => setActiveView('list'));
    if (viewCompact) viewCompact.addEventListener('click', () => setActiveView('compact'));
    
    // Add loading styles
    const style = document.createElement('style');
    style.textContent = `
        .loading {
            opacity: 0.5;
            pointer-events: none;
        }
    `;
    document.head.appendChild(style);
    
    // Initial fetch
    fetchPublications();
}

// Run initialization when DOM is fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeZotero);
} else {
    // DOMContentLoaded has already fired
    initializeZotero();
}

/**
 * Debounce function is now imported from utils.js
 */

/**
 * Set the active view and update the UI
 */
function setActiveView(view) {
    currentView = view;
    
    // Update active button state
    document.querySelectorAll('#view-cards, #view-list, #view-compact').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeBtn = document.getElementById(`view-${view}`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    // Re-render publications with new view
    renderPublications(filteredPublications);
}

/**
 * Try to load publications from localStorage cache
 * @returns {Array|null} Cached publications or null if cache is invalid/expired
 */
function loadFromCache() {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return null;
        
        const { data, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        
        if (age > CACHE_EXPIRY_MS) {
            localStorage.removeItem(CACHE_KEY);
            return null;
        }
        
        return data;
    } catch (e) {
        localStorage.removeItem(CACHE_KEY);
        return null;
    }
}

/**
 * Save publications to localStorage cache
 * @param {Array} data Publications to cache
 */
function saveToCache(data) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            data: data,
            timestamp: Date.now()
        }));
    } catch (e) {
        // localStorage might be full or disabled
    }
}

/**
 * Fetch all publications from the Zotero group
 */
function fetchPublications() {
    if (isLoading) return;
    
    // Try to load from cache first
    const cachedData = loadFromCache();
    if (cachedData && cachedData.length > 0) {
        processPublications(cachedData);
        return;
    }
    
    isLoading = true;
    const container = document.getElementById('recent-publications');
    if (container) {
        container.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div><p class="mt-2">Loading publications from Zotero...</p></div>';
    }
    
    const endpoint = `${ZOTERO_API_BASE}/groups/${ZOTERO_GROUP_ID}/items/top`;
    const params = new URLSearchParams({
        limit: ITEMS_PER_PAGE,
        sort: currentFilters.sort,
        direction: currentFilters.direction,
        format: 'json',
        itemType: '-attachment' // Exclude attachments
    });
    
    // Set up headers with API key if available
    const headers = new Headers({
        'Accept': 'application/json',
        'Zotero-API-Version': '3',
        'Content-Type': 'application/json'
    });
    
    if (ZOTERO_API_KEY) {
        headers.append('Authorization', `Bearer ${ZOTERO_API_KEY}`);
    }
    
    // First, get the total count
    const initialUrl = `${endpoint}?${params.toString()}&limit=1`;
    
    fetch(initialUrl, {
        method: 'GET',
        headers: headers,
        credentials: 'same-origin' // Handle cookies if needed
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status} ${response.statusText}`);
        }
        
        const totalResults = parseInt(response.headers.get('Total-Results') || '0');
        
        if (totalResults === 0) {
            return Promise.resolve([]);
        }
        
        // Calculate how many parallel requests we need to make
        const requests = [];
        for (let start = 0; start < totalResults; start += ITEMS_PER_PAGE) {
            const requestParams = new URLSearchParams(params);
            requestParams.set('start', start);
            requestParams.set('limit', ITEMS_PER_PAGE);
            
            requests.push(
                fetch(`${endpoint}?${requestParams.toString()}`, {
                    method: 'GET',
                    headers: headers,
                    credentials: 'same-origin' // Handle cookies if needed
                })
                .then(async res => {
                    if (!res.ok) {
                        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                    }
                    return res.json();
                })
                .then(data => data)
                .catch(() => [])
            );
        }
        
        return Promise.all(requests);
    })
    .then(pages => {
        // Flatten all pages into a single array and filter out any empty results from failed requests
        const allItems = pages.flat().filter(Boolean);
        
        if (allItems.length === 0) {
            showError('No publications found. The group might be empty or not publicly accessible.');
            return;
        }
        
        // Save to cache for faster subsequent loads
        saveToCache(allItems);
        
        // Process the publications
        processPublications(allItems);
    })
    .catch(error => {
        showError(`Failed to load publications from Zotero: ${error.message || error}`);
        isLoading = false;
    });
}

/**
 * Process publications data (from cache or API)
 * @param {Array} items Raw publication items
 */
function processPublications(items) {
    // Filter out notes and attachments
    allPublications = items.filter(pub => {
        return pub.data && pub.data.itemType && 
               pub.data.itemType !== 'note' && 
               pub.data.itemType !== 'attachment';
    });
    
    if (allPublications.length === 0) {
        showError('No valid publications found after filtering out notes and attachments.');
        return;
    }
    
    updatePublicationsCount(allPublications.length);
    
    // Collect all tags
    allTags.clear();
    allPublications.forEach(pub => {
        if (pub.data && pub.data.tags) {
            pub.data.tags.forEach(tag => {
                if (tag && typeof tag === 'object' && tag.tag) {
                    allTags.add(tag.tag);
                } else if (typeof tag === 'string') {
                    allTags.add(tag);
                }
            });
        }
    });
    
    // Update tag filter dropdown
    updateTagFilter();
    
    // Apply filters to the full dataset, which will also render the publications
    applyFilters();
    
    // Loading is complete
    isLoading = false;
}

/**
 * Display an error message in the publications container
 */
function showError(message) {
    console.error('Displaying error:', message);
    const container = document.getElementById('recent-publications') || document.body;
    
    // Create or update error message
    let errorDiv = container.querySelector('.alert.alert-danger');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger';
        container.innerHTML = '';
        container.appendChild(errorDiv);
    }
    
    errorDiv.innerHTML = `
        <i class="bi bi-exclamation-triangle me-2"></i>
        ${message}
        <div class="mt-2">
            <button class="btn btn-sm btn-outline-secondary" onclick="location.reload()">
                <i class="bi bi-arrow-clockwise"></i> Try Again
            </button>
        </div>
    `;
    
    // If we're not in the container, scroll to it
    if (container !== document.body) {
        container.scrollIntoView({ behavior: 'smooth' });
    }
}

/**
 * Apply filters to the publications and update the UI
 */
function applyFilters() {
    // Apply search and tag filters
    filteredPublications = allPublications.filter(pub => {
        if (!pub.data) {
            return false;
        }
        
        // Apply search filter if set
        if (currentFilters.search) {
            const searchTerm = currentFilters.search.toLowerCase();
            const title = (pub.data.title || '').toLowerCase();
            const abstract = (pub.data.abstractNote || '').toLowerCase();
            const authors = getAuthorsText(pub).toLowerCase();
            const pubTitle = (pub.data.publicationTitle || '').toLowerCase();
            const publisher = (pub.data.publisher || '').toLowerCase();
            
            const matchesSearch = 
                title.includes(searchTerm) || 
                abstract.includes(searchTerm) || 
                authors.includes(searchTerm) || 
                pubTitle.includes(searchTerm) ||
                publisher.includes(searchTerm);
                
            if (!matchesSearch) {
                return false;
            }
        }
        
        // Apply type filter if set
        if (currentFilters.type && currentFilters.type !== 'all') {
            if (pub.data.itemType !== currentFilters.type) {
                return false;
            }
        }
        
        // Apply tag filter if set
        if (currentFilters.tag) {
            if (!pub.data.tags || !pub.data.tags.some(t => t.tag === currentFilters.tag)) {
                return false;
            }
        }
        
        return true;
    });
    
    // Sort the filtered results
    sortPublications();
    
    // Update the UI
    renderPublications(filteredPublications);
    updateFilterBadge();
    
}

/**
 * Sort publications based on current sort settings
 */
function sortPublications() {
    filteredPublications.sort((a, b) => {
        let valA, valB;
        
        switch(currentFilters.sort) {
            case 'title':
                valA = a.data.title || '';
                valB = b.data.title || '';
                break;
            case 'date':
                valA = a.data.date || '';
                valB = b.data.date || '';
                break;
            case 'dateAdded':
            default:
                valA = a.data.dateAdded || '';
                valB = b.data.dateAdded || '';
        }
        
        // Determine direction
        const direction = currentFilters.direction === 'asc' ? 1 : -1;
        
        // Compare values
        if (valA < valB) return -1 * direction;
        if (valA > valB) return 1 * direction;
        return 0;
    });
}

/**
 * Update the filter badge visibility
 */
function updateFilterBadge() {
    const filterBadge = document.getElementById('filter-badge');
    if (!filterBadge) return;
    
    const hasActiveFilters = currentFilters.search || currentFilters.tag;
    filterBadge.style.display = hasActiveFilters ? 'inline-block' : 'none';
    
    if (hasActiveFilters) {
        const activeFilters = [];
        if (currentFilters.search) activeFilters.push(`Search: ${currentFilters.search}`);
        if (currentFilters.tag) activeFilters.push(`Tag: ${currentFilters.tag}`);
        
        filterBadge.title = activeFilters.join('\n');
        filterBadge.textContent = activeFilters.length.toString();
    }
    
    // Update results count
    const resultsCount = document.getElementById('results-count');
    if (resultsCount) {
        const totalCount = allPublications.length;
        const filteredCount = filteredPublications.length;
        
        if (filteredCount === totalCount) {
            resultsCount.textContent = `Showing all ${totalCount} publications`;
        } else {
            resultsCount.textContent = `Showing ${filteredCount} of ${totalCount} publications`;
        }
    }
}

/**
 * Update the tag filter dropdown with collected tags
 */
function updateTagFilter() {
    const tagFilter = document.getElementById('tag-filter');
    if (!tagFilter) return;
    
    // Save current selection
    const currentSelection = tagFilter.value;
    
    // Clear existing options except the first one
    while (tagFilter.options.length > 1) {
        tagFilter.remove(1);
    }
    
    // Sort tags alphabetically
    const sortedTags = Array.from(allTags).sort();
    
    // Add tag options
    sortedTags.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag;
        option.textContent = tag;
        tagFilter.appendChild(option);
    });
    
    // Restore selection if it still exists
    if (currentSelection && sortedTags.includes(currentSelection)) {
        tagFilter.value = currentSelection;
    }
}

/**
 * Store the publications count (without displaying it)
 */
function updatePublicationsCount(count) {
    // Just store the count without displaying it
    publicationsCount = count;
}

/**
 * Render publications in the UI based on current view
 */
function renderPublications(publications) {
    const container = document.getElementById('recent-publications');
    if (!container) {
        return;
    }
    
    // Clear container
    container.innerHTML = '';
    
    if (!publications || publications.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                No publications found matching your criteria.
            </div>
        `;
        updatePublicationsCount(0);
        return;
    }
    
    // Update count
    updatePublicationsCount(publications.length);
    
    // Create appropriate container based on view
    let wrapper;
    
    switch (currentView) {
        case 'list':
            wrapper = document.createElement('div');
            wrapper.className = 'list-group';
            break;
        case 'compact':
            wrapper = document.createElement('table');
            wrapper.className = 'table table-hover';
            // Add table header
            const thead = document.createElement('thead');
            thead.innerHTML = `
                <tr>
                    <th scope="col">Title</th>
                    <th scope="col">Authors</th>
                    <th scope="col">Year</th>
                    <th scope="col">Type</th>
                    <th scope="col"></th>
                </tr>
            `;
            wrapper.appendChild(thead);
            
            const tbody = document.createElement('tbody');
            tbody.id = 'publications-tbody';
            wrapper.appendChild(tbody);
            break;
        case 'cards':
        default:
            wrapper = document.createElement('div');
            wrapper.className = 'row';
    }
    
    container.appendChild(wrapper);
    
    // Add publications based on view type
    publications.forEach(pub => {
        if (pub.data) {
            let element;
            
            switch (currentView) {
                case 'list':
                    element = createPublicationListItem(pub);
                    break;
                case 'compact':
                    element = createPublicationTableRow(pub);
                    const tbody = document.getElementById('publications-tbody');
                    if (tbody) {
                        tbody.appendChild(element);
                        return; // Skip appending to wrapper
                    }
                    break;
                case 'cards':
                default:
                    element = createPublicationCard(pub);
            }
            
            wrapper.appendChild(element);
        }
    });
}

/**
 * Create a card element for a publication (for cards view)
 */
function createPublicationCard(publication) {
    const col = document.createElement('div');
    col.className = 'col-md-6 col-lg-4 mb-4';
    
    // Format date
    const date = publication.data.date ? new Date(publication.data.date).getFullYear() : 'n.d.';
    
    // Get authors
    const authors = getAuthorsText(publication);
    
    // Get item type
    const itemType = formatItemType(publication.data.itemType);
    
    // Get publication details
    const publicationDetails = [];
    if (publication.data.publicationTitle) {
        publicationDetails.push(`<em>${publication.data.publicationTitle}</em>`);
    }
    if (publication.data.publisher) {
        publicationDetails.push(publication.data.publisher);
    }
    if (publication.data.place) {
        publicationDetails.push(publication.data.place);
    }
    
    // Get DOI or URL
    let linkHtml = '';
    if (publication.data.DOI) {
        linkHtml = `<a href="https://doi.org/${publication.data.DOI}" target="_blank" class="text-decoration-none">DOI: ${publication.data.DOI}</a>`;
    } else if (publication.data.url) {
        linkHtml = `<a href="${publication.data.url}" target="_blank" class="text-decoration-none">View Online</a>`;
    }
    
    // Add View in Zotero link
    const zoteroItemKey = publication.key;
    const zoteroLink = `${ZOTERO_GROUP_URL}/item/${zoteroItemKey}`;
    const zoteroIconHtml = `<a href="${zoteroLink}" target="_blank" class="btn btn-sm btn-outline-secondary mt-1"><i class="bi bi-journal-text me-1"></i>View in Zotero</a>`;
    
    if (linkHtml) {
        linkHtml += `<br>${zoteroIconHtml}`;
    } else {
        linkHtml = zoteroIconHtml;
    }
    
    // Get tags
    const tags = publication.data.tags || [];
    let tagsHtml = '';
    if (tags.length > 0) {
        tagsHtml = '<div class="mt-2">';
        tags.forEach(tag => {
            if (tag.tag) {
                tagsHtml += `<span class="badge bg-light text-dark me-1 mb-1">${tag.tag}</span>`;
            }
        });
        tagsHtml += '</div>';
    }
    
    // Create card
    const card = document.createElement('div');
    card.className = 'card h-100';
    card.innerHTML = `
        <div class="card-body">
            <h5 class="card-title">${publication.data.title || 'Untitled'}</h5>
            <h6 class="card-subtitle mb-2 text-muted">${authors}</h6>
            <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="badge bg-secondary">${itemType}</span>
                <small class="text-muted">${date}</small>
            </div>
            ${publicationDetails.length > 0 ? `<p class="card-text small text-muted">${publicationDetails.join(', ')}</p>` : ''}
            ${publication.data.abstractNote ? `<p class="card-text small">${truncateText(publication.data.abstractNote, 150)}</p>` : ''}
            ${linkHtml ? `<p class="card-text small">${linkHtml}</p>` : ''}
            ${tagsHtml}
        </div>
    `;
    
    col.appendChild(card);
    return col;
}

/**
 * Create a publication list item (for list view)
 */
function createPublicationListItem(publication) {
    const item = document.createElement('a');
    item.className = 'list-group-item list-group-item-action';
    item.href = publication.links.alternate.href;
    item.target = '_blank';
    
    // Format date
    const date = publication.data.date ? new Date(publication.data.date).getFullYear() : 'n.d.';
    
    // Get authors
    const authors = getAuthorsText(publication);
    
    // Get item type
    const itemType = formatItemType(publication.data.itemType);
    
    item.innerHTML = `
        <div class="d-flex w-100 justify-content-between">
            <h5 class="mb-1">${publication.data.title || 'Untitled'}</h5>
            <small>${date}</small>
        </div>
        <p class="mb-1">${authors}</p>
        ${publication.data.abstractNote ? `<small class="text-muted">${truncateText(publication.data.abstractNote, 200)}</small>` : ''}
        <div class="mt-2">
            <span class="badge bg-secondary">${itemType}</span>
        </div>
    `;
    
    return item;
}

/**
 * Create a publication table row (for compact view)
 */
function createPublicationTableRow(publication) {
    const row = document.createElement('tr');
    
    // Format date
    const date = publication.data.date ? new Date(publication.data.date).getFullYear() : 'n.d.';
    
    // Get authors
    const authors = getAuthorsText(publication);
    
    // Get item type
    const itemType = formatItemType(publication.data.itemType);
    
    row.innerHTML = `
        <td><strong>${truncateText(publication.data.title || 'Untitled', 80)}</strong></td>
        <td>${authors}</td>
        <td>${date}</td>
        <td><span class="badge bg-secondary">${itemType}</span></td>
        <td>
            <a href="${publication.links.alternate.href}" target="_blank" class="btn btn-sm btn-outline-primary">
                <i class="bi bi-box-arrow-up-right"></i>
            </a>
        </td>
    `;
    
    return row;
}

/**
 * Get formatted authors text
 */
function getAuthorsText(publication) {
    if (!publication.data || !publication.data.creators) {
        return 'Unknown Author';
    }
    
    const authors = publication.data.creators
        .filter(creator => creator.creatorType === 'author')
        .map(author => {
            if (author.name) {
                return author.name;
            } else {
                return `${author.lastName || ''}, ${author.firstName || ''}`;
            }
        });
    
    if (authors.length === 0) {
        return 'Unknown Author';
    } else if (authors.length === 1) {
        return authors[0];
    } else if (authors.length === 2) {
        return `${authors[0]} and ${authors[1]}`;
    } else {
        return `${authors[0]} et al.`;
    }
}

/**
 * Format item type for display
 */
function formatItemType(itemType) {
    if (!itemType) return 'Unknown';
    
    // Convert camelCase to Title Case with spaces
    return itemType
        .replace(/([A-Z])/g, ' $1') // Add space before capital letters
        .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
        .trim();
}

/**
 * Truncate text function is now imported from utils.js
 */
