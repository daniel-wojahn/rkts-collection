/**
 * Tibetan Buddhist Collections Explorer
 * Bibliography Integration using Zotero API
 */

// Configuration
const ZOTERO_API_BASE = 'https://api.zotero.org';
const ZOTERO_GROUP_ID = '2296997'; // rKTs Bibliography group ID
const ZOTERO_GROUP_URL = 'https://www.zotero.org/groups/2296997/rkts_bibliography/library';
const ITEMS_PER_PAGE = 50; // Increased to show more items per page

// Global variables
let currentStart = 0;
let hasMoreItems = true;
let isLoading = false;
let publicationsCount = 0;
let allPublications = [];
let filteredPublications = [];
let currentView = 'cards'; // cards, list, compact
let currentFilters = {
    search: '',
    type: '',
    sort: 'dateAdded',
    direction: 'desc'
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing Bibliography integration...');
    
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
            currentFilters.search = this.value.trim().toLowerCase();
            applyFilters();
        }, 300));
    }
    
    // Set up clear search button
    const clearSearchBtn = document.getElementById('clear-search-btn');
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', function() {
            if (searchInput) {
                searchInput.value = '';
                currentFilters.search = '';
                applyFilters();
            }
        });
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
    
    if (viewCards) {
        viewCards.addEventListener('click', function() {
            setActiveView('cards');
        });
    }
    
    if (viewList) {
        viewList.addEventListener('click', function() {
            setActiveView('list');
        });
    }
    
    if (viewCompact) {
        viewCompact.addEventListener('click', function() {
            setActiveView('compact');
        });
    }
    
    // Set up load more button
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', function() {
            if (!isLoading && hasMoreItems) {
                fetchPublications(currentStart);
            }
        });
    }
    
    // Initial fetch
    fetchPublications(0);
});

/**
 * Debounce function to limit how often a function is called
 */
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
 * Fetch publications from the Zotero group with pagination
 */
function fetchPublications(start) {
    if (isLoading) return;
    
    isLoading = true;
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
        loadMoreBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Loading...';
        loadMoreBtn.disabled = true;
    }
    
    const endpoint = `${ZOTERO_API_BASE}/groups/${ZOTERO_GROUP_ID}/items/top`;
    const params = new URLSearchParams({
        start: start,
        limit: ITEMS_PER_PAGE,
        sort: currentFilters.sort,
        direction: currentFilters.direction,
        format: 'json'
    });
    
    console.log(`Fetching publications from ${start} to ${start + ITEMS_PER_PAGE}...`);
    
    fetch(`${endpoint}?${params.toString()}`, {
        headers: {
            'Accept': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        // Check if there are more items to load
        const totalResults = response.headers.get('Total-Results');
        const linkHeader = response.headers.get('Link');
        
        if (totalResults) {
            console.log(`Total results: ${totalResults}`);
            hasMoreItems = (start + ITEMS_PER_PAGE) < parseInt(totalResults);
            updatePublicationsCount(parseInt(totalResults));
        } else if (linkHeader && linkHeader.includes('rel="next"')) {
            hasMoreItems = true;
        } else {
            hasMoreItems = false;
        }
        
        return response.json();
    })
    .then(data => {
        // Filter out notes and attachments
        const validPublications = data.filter(pub => 
            pub.data && pub.data.itemType !== 'note' && pub.data.itemType !== 'attachment'
        );
        
        // Add to all publications array
        if (start === 0) {
            allPublications = validPublications;
        } else {
            allPublications = [...allPublications, ...validPublications];
        }
        
        // Apply filters to the full dataset
        applyFilters();
        
        // Update load more button
        if (loadMoreBtn) {
            loadMoreBtn.innerHTML = '<i class="bi bi-plus-circle me-1"></i>Load More';
            loadMoreBtn.disabled = false;
            loadMoreBtn.style.display = hasMoreItems ? 'block' : 'none';
        }
        
        isLoading = false;
    })
    .catch(error => {
        console.error('Error fetching Zotero data:', error);
        const container = document.getElementById('recent-publications');
        if (container) {
            if (start === 0) {
                // Only show error if this is the initial load
                container.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        Failed to load publications from Zotero. Please try again later.
                        <br><small class="text-muted">${error.message}</small>
                    </div>
                `;
            }
        }
        
        if (loadMoreBtn) {
            loadMoreBtn.innerHTML = '<i class="bi bi-plus-circle me-1"></i>Try Again';
            loadMoreBtn.disabled = false;
        }
        
        isLoading = false;
    });
}

/**
 * Apply filters to the publications and update the UI
 */
function applyFilters() {
    // Apply search and type filters
    filteredPublications = allPublications.filter(pub => {
        // Skip if not a valid publication
        if (!pub.data) return false;
        
        // Type filter
        if (currentFilters.type && pub.data.itemType !== currentFilters.type) {
            return false;
        }
        
        // Search filter
        if (currentFilters.search) {
            const searchTerm = currentFilters.search.toLowerCase();
            const title = (pub.data.title || '').toLowerCase();
            const abstract = (pub.data.abstractNote || '').toLowerCase();
            
            // Get author names
            const authors = getAuthorsText(pub).toLowerCase();
            
            // Check if search term is in title, abstract, or authors
            if (!title.includes(searchTerm) && 
                !abstract.includes(searchTerm) && 
                !authors.includes(searchTerm)) {
                return false;
            }
        }
        
        return true;
    });
    
    // Sort if needed (client-side sorting for search results)
    if (currentFilters.search || currentFilters.type) {
        sortPublications();
    }
    
    // Update UI
    updateFilterBadge();
    renderPublications(filteredPublications);
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
    if (filterBadge) {
        const isFiltered = currentFilters.search || currentFilters.type;
        filterBadge.style.display = isFiltered ? 'inline-block' : 'none';
    }
}

/**
 * Update the publications count display
 */
function updatePublicationsCount(count) {
    const countElement = document.getElementById('publications-count');
    if (countElement) {
        countElement.textContent = filteredPublications.length || count || 0;
    }
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
            ${publication.data.abstractNote ? `<p class="card-text small">${truncateText(publication.data.abstractNote, 150)}</p>` : ''}
        </div>
        <div class="card-footer bg-transparent">
            <a href="${publication.links.alternate.href}" target="_blank" class="btn btn-sm btn-outline-primary">
                <i class="bi bi-box-arrow-up-right me-1"></i>View in Zotero
            </a>
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
 * Truncate text to a specified length and add ellipsis
 */
function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) {
        return text;
    }
    
    return text.substring(0, maxLength) + '...';
}
