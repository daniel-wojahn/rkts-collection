/**
 * Lunr.js Search Implementation for Tibetan Buddhist Collections Explorer
 */

// Create lunr.js search index for collections
function createSearchIndex() {
    console.log('Creating lunr.js search index...');
    
    // Create the lunr index
    searchIndex = lunr(function() {
        // Define the fields to index
        this.field('sigla', { boost: 10 });
        this.field('title', { boost: 5 });
        this.field('alternative_title', { boost: 5 });
        this.field('place_of_production', { boost: 3 });
        this.field('abstract', { boost: 1 });
        this.field('genre', { boost: 2 });
        
        // Add a reference field to identify documents
        this.ref('id');
        
        // Add each collection to the index
        collections.forEach((collection, index) => {
            // Create a document with the fields we want to search
            const doc = {
                id: index.toString(), // Use index as id for reference
                sigla: collection.sigla || '',
                title: collection.title || '',
                alternative_title: collection.alternative_title || '',
                place_of_production: collection.place_of_production || '',
                abstract: collection.abstract || '',
                genre: collection.genre || ''
            };
            
            // Add the document to the index
            this.add(doc);
            
            // Store the mapping between id and collection
            searchResultsMap[index.toString()] = collection;
        });
    });
    
    console.log('Search index created successfully');
}

// Perform search using lunr.js
function performSearch(query) {
    if (!query || query.trim() === '') {
        searchResults = [];
        return collections; // Return all collections if query is empty
    }
    
    try {
        // Perform the search
        const results = searchIndex.search(query);
        
        // Map results to collections
        searchResults = results.map(result => searchResultsMap[result.ref]);
        
        console.log(`Search for "${query}" returned ${searchResults.length} results`);
        return searchResults;
    } catch (error) {
        console.error('Search error:', error);
        
        // Fall back to simple string matching if lunr search fails
        return collections.filter(collection => 
            (collection.sigla && collection.sigla.toLowerCase().includes(query.toLowerCase())) ||
            (collection.title && collection.title.toLowerCase().includes(query.toLowerCase())) ||
            (collection.alternative_title && collection.alternative_title.toLowerCase().includes(query.toLowerCase())) ||
            (collection.place_of_production && collection.place_of_production.toLowerCase().includes(query.toLowerCase()))
        );
    }
}

// Update the search results display with highlighting
function updateSearchResultsUI(results, query) {
    // Implementation will depend on how you want to display results
    // This is a placeholder for any UI-specific updates
    console.log(`Displaying ${results.length} search results`);
}

// Helper function to highlight search terms in text
function highlightSearchTerms(text, query) {
    if (!query || !text) return text;
    
    const terms = query.trim().toLowerCase().split(/\s+/);
    let result = text;
    
    terms.forEach(term => {
        if (term.length < 2) return; // Skip very short terms
        
        const regex = new RegExp(`(${term})`, 'gi');
        result = result.replace(regex, '<mark>$1</mark>');
    });
    
    return result;
}
