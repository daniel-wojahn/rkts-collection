/**
 * rKTs Tibetan Buddhist Collections Explorer
 * Bibliography Integration using Zotero API
 */

// Configuration
const ZOTERO_API_BASE = 'https://api.zotero.org';
const ZOTERO_GROUP_ID = '2296997'; // rKTs Bibliography group ID
const ZOTERO_GROUP_URL = 'https://www.zotero.org/groups/2296997/rkts_bibliography/library';
const ITEMS_PER_PAGE = 100; // Max items per API request

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
    console.log('Initializing Bibliography integration...');
    
    // Check if we're on the Zotero page
    if (!document.querySelector('#recent-publications')) {
        console.log('Not on Zotero page, skipping initialization');
        return;
    }
    
    console.log('Zotero page detected, initializing...');
    
    // Set up Zotero group link
    const zoteroGroupLink = document.getElementById('zotero-group-link');
    if (zoteroGroupLink) {
        zoteroGroupLink.href = ZOTERO_GROUP_URL;
        console.log('Zotero group link set to:', ZOTERO_GROUP_URL);
    } else {
        console.warn('Zotero group link element not found');
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
        console.log('Setting up search input handler');
        searchInput.addEventListener('input', debounce(function() {
            const searchTerm = this.value.trim().toLowerCase();
            console.log('Search input changed:', searchTerm);
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
    } else {
        console.warn('Search input element not found');
    }
    
    // Set up type filter
    const typeFilter = document.getElementById('type-filter');
    if (typeFilter) {
        typeFilter.addEventListener('change', function() {
            currentFilters.type = this.value;
            console.log('Type filter changed to:', this.value);
            applyFilters();
        });
    } else {
        console.warn('Type filter element not found');
    }
    
    // Set up sort order
    const sortOrder = document.getElementById('sort-order');
    if (sortOrder) {
        sortOrder.addEventListener('change', function() {
            const [sort, direction] = this.value.split('-');
            currentFilters.sort = sort;
            currentFilters.direction = direction;
            console.log('Sort order changed to:', sort, direction);
            applyFilters();
        });
    } else {
        console.warn('Sort order element not found');
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
 * Fetch all publications from the Zotero group
 */
function fetchPublications() {
    if (isLoading) return;
    
    isLoading = true;
    const container = document.getElementById('recent-publications');
    if (container) {
        container.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div><p class="mt-2">Loading publications...</p></div>';
    }
    
    const endpoint = `${ZOTERO_API_BASE}/groups/${ZOTERO_GROUP_ID}/items/top`;
    const params = new URLSearchParams({
        limit: ITEMS_PER_PAGE,
        sort: currentFilters.sort,
        direction: currentFilters.direction,
        format: 'json'
    });
    
    console.log('Fetching all publications...');
    
    // First, get the total count
    console.log('Fetching total count of publications...');
    fetch(`${endpoint}?${params.toString()}&limit=1`, {
        headers: { 
            'Accept': 'application/json',
            'Zotero-API-Version': '3'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const totalResults = parseInt(response.headers.get('Total-Results') || '0');
        console.log(`Total results to fetch: ${totalResults}`);
        
        if (totalResults === 0) {
            return Promise.resolve([]);
        }
        
        console.log(`Preparing to fetch ${Math.ceil(totalResults / ITEMS_PER_PAGE)} pages of data...`);
        // Calculate how many parallel requests we need to make
        const requests = [];
        for (let start = 0; start < totalResults; start += ITEMS_PER_PAGE) {
            const requestParams = new URLSearchParams(params);
            requestParams.set('start', start);
            requestParams.set('limit', ITEMS_PER_PAGE);
            
            console.log(`Queueing request for items ${start} to ${start + ITEMS_PER_PAGE - 1}`);
            
            requests.push(
                fetch(`${endpoint}?${requestParams.toString()}`, {
                    headers: { 
                        'Accept': 'application/json',
                        'Zotero-API-Version': '3'
                    }
                })
                .then(res => {
                    if (!res.ok) {
                        console.error(`Error fetching page (start=${start}):`, res.status, res.statusText);
                        return Promise.reject(`HTTP ${res.status}: ${res.statusText}`);
                    }
                    return res.json();
                })
                .catch(error => {
                    console.error(`Error in fetch for start=${start}:`, error);
                    return Promise.reject(error);
                })
            );
        }
        
        return Promise.all(requests);
    })
    .then(pages => {
        console.log(`Received ${pages.length} pages of data`);
        
        // Flatten all pages into a single array
        const allItems = pages.flat();
        console.log(`Total items before filtering: ${allItems.length}`);
        
        // Filter out notes and attachments
        allPublications = allItems.filter(pub => {
            const isValid = pub.data && pub.data.itemType !== 'note' && pub.data.itemType !== 'attachment';
            if (!isValid) {
                console.log('Filtered out item:', pub);
            }
            return isValid;
        });
        
        console.log(`Loaded ${allPublications.length} valid publications`);
        updatePublicationsCount(allPublications.length);
        
        // Collect all tags
        allPublications.forEach(pub => {
            if (pub.data && pub.data.tags) {
                pub.data.tags.forEach(tag => {
                    if (tag.tag) {
                        allTags.add(tag.tag);
                    }
                });
            }
        });
        
        // Update tag filter dropdown
        updateTagFilter();
        
        // Apply filters to the full dataset
        applyFilters();
        
        // Remove loading state
        if (container) {
            container.innerHTML = '';
        }
        
        isLoading = false;
    })
    .catch(error => {
        console.error('Error fetching Zotero data:', error);
        const container = document.getElementById('recent-publications');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    Failed to load publications from Zotero. Please try again later.
                    <br><small class="text-muted">${error.message || error}</small>
                </div>
            `;
        }
        
        isLoading = false;
    });
}

/**
 * Apply filters to the publications and update the UI
 */
function applyFilters() {
    console.log('Applying filters:', currentFilters);
    
    // Apply search and tag filters
    filteredPublications = allPublications.filter(pub => {
        if (!pub.data) {
            console.log('Skipping publication with no data:', pub);
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
            
            console.log('Publication matches search:', {
                title: pub.data.title,
                searchTerm,
                titleMatch: title.includes(searchTerm),
                abstractMatch: abstract.includes(searchTerm),
                authorsMatch: authors.includes(searchTerm),
                pubTitleMatch: pubTitle.includes(searchTerm),
                publisherMatch: publisher.includes(searchTerm)
            });
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
    
    console.log(`Filtered from ${allPublications.length} to ${filteredPublications.length} publications`);
    
    // Sort the filtered results
    sortPublications();
    
    // Update the UI
    renderPublications(filteredPublications);
    updateFilterBadge();
    
    // Log the first few results for debugging
    if (filteredPublications.length > 0) {
        console.log('First few filtered results:', 
            filteredPublications.slice(0, 3).map(p => ({
                title: p.data.title,
                type: p.data.itemType,
                authors: getAuthorsText(p)
            }))
        );
    }
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
        console.error('Publications container not found');
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
