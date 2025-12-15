// Debug script to check if Zotero page is loading correctly
console.log('Debug script loaded');

// Check if we're on the Zotero page
if (document.querySelector('#recent-publications')) {
    console.log('Zotero page detected');
    
    // Check if zotero.js is loaded
    if (window.fetchPublications) {
        console.log('Zotero functions are available');
    } else {
        console.error('Zotero functions are not available');
    }
    
    // Check if utils.js is loaded
    if (window.debounce) {
        console.log('Utils functions are available');
    } else {
        console.error('Utils functions are not available');
    }
} else {
    console.log('Not on Zotero page');
}
