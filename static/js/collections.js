/**
 * Tibetan Buddhist Collections Explorer
 * Collections page JavaScript
 */

// Global variables
let collections = [];
let filteredCollections = [];
let lunrIndex;
let categoryChart;
let placeChart;
const categoryOptions = new Set();
const groupOptions = new Set();
const placeOptions = new Set();

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
	loadData();

	// Set up export buttons
	const exportJsonBtn = document.getElementById("export-json");
	const exportCsvBtn = document.getElementById("export-csv");
	const shareLinkBtn = document.getElementById("share-link");

	if (exportJsonBtn)
		exportJsonBtn.addEventListener("click", exportCollectionsJSON);
	if (exportCsvBtn)
		exportCsvBtn.addEventListener("click", exportCollectionsCSV);
	if (shareLinkBtn)
		shareLinkBtn.addEventListener("click", () => {
			// Copy current URL to clipboard
			navigator.clipboard
				.writeText(window.location.href)
				.then(() => {
					alert("Link copied to clipboard!");
				})
				.catch((err) => {
					console.error("Could not copy link: ", err);
					alert(
						"Could not copy link. Please copy the URL from your browser address bar.",
					);
				});
		});

	// Set up search functionality
	const searchInput = document.getElementById("collection-search");
	const clearSearchBtn = document.getElementById("clear-search");

	if (searchInput) {
		searchInput.addEventListener("input", debounce(performSearch, 100)); // Search as you type

		// Close search preview when clicking outside
		document.addEventListener("click", (e) => {
			if (!e.target.closest(".search-container")) {
				document.getElementById("search-preview").style.display = "none";
			}
		});
	}

	if (clearSearchBtn) {
		clearSearchBtn.addEventListener("click", () => {
			if (searchInput) {
				searchInput.value = "";
				document.getElementById("search-preview").style.display = "none";
				// Show all collections when search is cleared
				filteredCollections = [...collections];
				organizeCollectionsByCategory();
			}
		});
	}
});

// Load data from JSON files
function loadData() {
	fetch("/static/data/collections.json")
		.then((response) => response.json())
		.then((data) => {
			collections = data;
			filteredCollections = [...collections]; // Initialize filtered collections

			// Create Lunr search index
			createSearchIndex();

			// Update statistics
			document.getElementById("total-collections").textContent =
				collections.length;
			const mappedCollections = collections.filter((c) => c.coordinates).length;
			document.getElementById("mapped-collections").textContent =
				mappedCollections;

			// Populate category options
			collections.forEach((collection) => {
				if (collection.genre) {
					categoryOptions.add(collection.genre);
				}

				if (
					collection.classifications &&
					Array.isArray(collection.classifications)
				) {
					collection.classifications.forEach((group) => {
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
		.catch((error) => {
			console.error("Error loading data:", error);
		});
}

// Organize collections by category
function organizeCollectionsByCategory() {
	// Clear existing content
	document.querySelector(".kanjur-collections").innerHTML = "";
	document.querySelector(".tanjur-collections").innerHTML = "";
	document.querySelector(".tantra-collections").innerHTML = "";
	document.querySelector(".other-collections").innerHTML = "";

	// Sort collections by title
	const sortedCollections = [...filteredCollections].sort((a, b) => {
		const titleA = a.title || "";
		const titleB = b.title || "";
		return titleA.localeCompare(titleB);
	});

	// Group collections by category
	const kanjurCollections = sortedCollections.filter((c) =>
		c.genre?.toLowerCase().includes("kanjur"),
	);
	const tanjurCollections = sortedCollections.filter((c) =>
		c.genre?.toLowerCase().includes("tanjur"),
	);
	const tantraCollections = sortedCollections.filter((c) =>
		c.genre?.toLowerCase().includes("tantra"),
	);
	const otherCollections = sortedCollections.filter((c) => {
		return (
			!c.genre ||
			(!c.genre.toLowerCase().includes("kanjur") &&
				!c.genre.toLowerCase().includes("tanjur") &&
				!c.genre.toLowerCase().includes("tantra"))
		);
	});

	// Update category counts
	updateCategoryCounts(
		kanjurCollections.length,
		tanjurCollections.length,
		tantraCollections.length,
		otherCollections.length,
	);

	// Populate Kanjur collections
	populateCollectionsList(kanjurCollections, ".kanjur-collections");

	// Populate Tanjur collections
	populateCollectionsList(tanjurCollections, ".tanjur-collections");

	// Populate Tantra collections
	populateCollectionsList(tantraCollections, ".tantra-collections");

	// Populate Other collections
	populateCollectionsList(otherCollections, ".other-collections");

	// Update search results count if element exists
	const searchResultsCount = document.getElementById("search-results-count");
	const searchInput = document.getElementById("collection-search");
	if (searchResultsCount && searchInput) {
		searchResultsCount.textContent = filteredCollections.length;
		// Always show search results count when there's a search term
		searchResultsCount.parentElement.style.display = searchInput.value.trim()
			? "inline-block"
			: "none";
	}
}

// Populate collections list
function populateCollectionsList(collections, selector) {
	const container = document.querySelector(selector);

	if (collections.length === 0) {
		container.innerHTML =
			'<p class="text-muted">No collections found in this category.</p>';
		return;
	}

	collections.forEach((collection) => {
		const item = document.createElement("a");
		item.href = "#";
		item.className = "list-group-item list-group-item-action";
		item.setAttribute("data-file-name", collection.file_name);

		const title = collection.sigla
			? `${collection.sigla} — ${collection.title || "Untitled"}`
			: collection.title || "Untitled";

		const place = collection.place_of_production
			? `<small class="text-muted d-block">Place: ${collection.place_of_production}</small>`
			: "";

		item.innerHTML = `
            <div class="d-flex w-100 justify-content-between">
                <h5 class="mb-1">${title}</h5>
                ${collection.date_created ? `<small>${collection.date_created}</small>` : ""}
            </div>
            ${place}
        `;

		// Add click event to show collection details
		item.addEventListener("click", (e) => {
			e.preventDefault();
			showCollectionDetails(collection);
		});

		container.appendChild(item);
	});
}

// Show collection details in modal
function showCollectionDetails(collection) {
	// The modal is now directly in the HTML, so we don't need to create it dynamically
	console.log("Showing collection details for:", collection.title);

	const modalTitle = document.getElementById("collection-modal-title");
	const modalBody = document.getElementById("collection-modal-body");

	// Set title (with null check)
	if (modalTitle) {
		modalTitle.textContent = `${collection.sigla ? `${collection.sigla} — ` : ""}${collection.title || "Untitled Collection"}`;
	}

	// Build modal content
	let content = "";

	// Basic metadata
	content += '<div class="metadata-section mb-4">';
	content += "<h5>Basic Information</h5>";
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
			placeContent += ` (<a href="${collection.bdrc_reference.url}" target="_blank">${collection.bdrc_reference.id}</a>)`;
		}

		content += `<tr><th>Place of Production</th><td>${placeContent}</td></tr>`;
	}

	if (collection.extent) {
		// Format extent to show "X volumes" instead of just a number
		const formattedExtent = Number.isNaN(collection.extent)
			? collection.extent
			: `${collection.extent} volume${collection.extent > 1 ? "s" : ""}`;

		content += `<tr><th>Extent</th><td>${formattedExtent}</td></tr>`;
	}

	// Handle boolean fields as checkboxes
	const booleanFields = ["isreferenceedition", "iscanonical"];
	booleanFields.forEach((field) => {
		if (collection[field] !== undefined) {
			const fieldName =
				field.charAt(0).toUpperCase() + field.slice(1).replace("is", " Is ");
			const checked =
				collection[field] === true || collection[field] === "true";
			content += `
                <tr>
                    <th>${fieldName}</th>
                    <td>
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" ${checked ? "checked" : ""} disabled>
                        </div>
                    </td>
                </tr>
            `;
		}
	});

	content += "</table>";
	content += "</div>";

	// Abstract/Description
	if (collection.abstract) {
		content += '<div class="abstract-section mb-4">';
		content += "<h5>Description</h5>";
		content += `<p>${collection.abstract}</p>`;
		content += "</div>";
	}

	// Classifications
	if (collection.classifications && collection.classifications.length > 0) {
		content += '<div class="classifications-section mb-4">';
		content += "<h5>Classifications</h5>";
		content += '<ul class="list-group">';
		collection.classifications.forEach((classification) => {
			content += `<li class="list-group-item">${classification}</li>`;
		});
		content += "</ul>";
		content += "</div>";
	}

	// Notes
	if (collection.notes && collection.notes.length > 0) {
		content += '<div class="notes-section mb-4">';
		content += "<h5>Notes</h5>";
		content += '<ul class="list-group">';

		// Filter out unwanted fields from notes
		const filteredNotes = collection.notes.filter((note) => {
			return (
				!note.toLowerCase().includes("integratedrkts") &&
				!note.toLowerCase().includes("isreferenceset")
			);
		});

		filteredNotes.forEach((note) => {
			content += `<li class="list-group-item">${note}</li>`;
		});
		content += "</ul>";
		content += "</div>";
	}

	// Related items (editions)
	if (collection.related_items && collection.related_items.length > 0) {
		content += '<div class="related-items-section">';
		content += "<h5>Editions</h5>";
		content += '<ul class="list-group">';
		collection.related_items.forEach((item) => {
			content += `<li class="list-group-item">${item}</li>`;
		});
		content += "</ul>";
		content += "</div>";
	}

	// Set modal content (with null check)
	if (modalBody) {
		modalBody.innerHTML = content;
	}

	// Add event listener for XML download button
	const downloadBtn = document.getElementById("download-xml-btn");
	if (downloadBtn) {
		// Remove any existing event listeners
		const newDownloadBtn = downloadBtn.cloneNode(true);
		downloadBtn.parentNode.replaceChild(newDownloadBtn, downloadBtn);

		// Add new event listener
		newDownloadBtn.addEventListener("click", () => {
			downloadCollectionXML(collection.file_name);
		});
	}

	// Show modal (with null check)
	const modalElement = document.getElementById("collection-modal");
	if (modalElement) {
		const modal = new bootstrap.Modal(modalElement);
		modal.show();
	} else {
		console.error("Modal element not found");
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
		"category-chart",
		categoryChart,
		"Collections by Category",
	);
}

// Update the place distribution chart with regional grouping
function updatePlaceChart() {
	placeChart = updateGenericRegionalChart(
		collections,
		"place-chart",
		placeChart,
		"Regional Distribution",
	);
}

// Create Lunr.js search index
function createSearchIndex() {
	console.log("Creating Lunr search index for collections page...");
	lunrIndex = lunr(function () {
		// Define fields to search
		this.field("sigla", { boost: 10 });
		this.field("title", { boost: 5 });
		this.field("title_tibetan");
		this.field("place_of_production");
		this.field("genre");
		this.field("description", { boost: 3 });

		// Add ref field for document lookup
		this.ref("id");

		// Add each collection to the index
		collections.forEach((collection, index) => {
			// Create a document with an ID for reference
			const doc = {
				id: index,
				sigla: collection.sigla || "",
				title: collection.title || "",
				title_tibetan: collection.title_tibetan || "",
				place_of_production: collection.place_of_production || "",
				genre: collection.genre || "",
				description: collection.abstract || collection.description || "",
			};
			this.add(doc);
		});
	});
	console.log("Lunr search index created for collections page");
}

// Perform search with mkdocs-style preview dropdown
function performSearch() {
	// Use the generic search function from utils.js
	performGenericSearch({
		searchInputId: "collection-search",
		searchPreviewId: "search-preview",
		searchResultsContainerId: "search-preview-results",
		searchResultsCountId: "search-results-count",
		collections: collections,
		lunrIndex: lunrIndex,
		showDetailsCallback: showCollectionDetails,
		// Update filteredCollections when search is performed
		updateFilteredCollections: true,
		// Reorganize collections by category after search
		onResultsUpdated: (_results) => {
			organizeCollectionsByCategory();
			updateCharts();
		},
	});
}

// calculateBasicSearchScore function is now imported from utils.js

// Update category counts in the UI
function updateCategoryCounts(
	kanjurCount,
	tanjurCount,
	tantraCount,
	otherCount,
) {
	// Update the count badges in the accordion headers
	const kanjurBadge = document.querySelector("#kanjur-heading .badge");
	const tanjurBadge = document.querySelector("#tanjur-heading .badge");
	const tantraBadge = document.querySelector("#tantra-heading .badge");
	const otherBadge = document.querySelector("#other-heading .badge");

	if (kanjurBadge) kanjurBadge.textContent = kanjurCount;
	if (tanjurBadge) tanjurBadge.textContent = tanjurCount;
	if (tantraBadge) tantraBadge.textContent = tantraCount;
	if (otherBadge) otherBadge.textContent = otherCount;
}

// Debounce function is now in utils.js

// Export filtered collections as JSON
function exportCollectionsJSON() {
	// Use the utility function from utils.js
	exportJSON(filteredCollections, "tibetan_collections.json");
}

// Export filtered collections as CSV
function exportCollectionsCSV() {
	// Define CSV headers
	const headers = [
		"sigla",
		"title",
		"alternative_title",
		"abstract",
		"genre",
		"date_created",
		"place_of_production",
		"coordinates",
		"bdrc_reference",
	];

	// Use the utility function from utils.js
	exportCSV(filteredCollections, headers, "tibetan_collections.csv");
}

// End of utility functions

// downloadCollectionXML function is now imported from utils.js
