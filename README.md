# Tibetan Buddhist Collections Explorer

A web application for exploring and visualizing rKTs collections with advanced search, filtering, and map visualization capabilities.

## Data Processing
- **Python** - Server-side data processing (`scripts/process_xml.py`, `run.py`, `deploy.py`)
- **XML/JSON** - Data storage and exchange formats
- **GeoJSON** - Geographic data representation

## Features
- **Interactive Map** - Visualize collections by geographic location, with marker clustering and heatmap view
- **Advanced Filtering** - Filter collections by category, group, place, medium, and date range
- **Full-Text Search** - Instant search with lunr.js across multiple fields
- **Collection Details** - View detailed information about each collection
- **XML Downloads** - Download original XML files for each collection
- **Bibliography** - Browse and search the rKTs Zotero bibliography
- **Data Visualization** - Charts showing distribution of collections by category and region
- **Responsive Design** - Works on desktop and mobile devices

## Project Structure

```
/
├── index.html                 # Main application page (map + filters)
├── run.py                     # Local development server
├── deploy.py                  # Deployment script
├── README.md                  # This file
├── xml_files/                 # Source XML files (one per collection)
├── scripts/
│   └── process_xml.py         # Processes XML files into JSON/GeoJSON
└── static/
    ├── css/
    │   ├── style.css              # Custom styles
    │   └── rkts-chat-widget.css   # Chat widget styles
    ├── data/
    │   ├── collections.json       # Collection metadata (generated)
    │   └── collections.geojson    # Geographic data (generated)
    ├── images/                    # Application images and favicons
    ├── js/
    │   ├── app.js                 # Main application logic (map page)
    │   ├── collections.js         # Collections overview page logic
    │   ├── zotero.js              # Bibliography page logic (Zotero API)
    │   ├── utils.js               # Shared utility functions
    │   └── rkts-chat-widget.js    # Chat widget
    ├── pages/
    │   ├── about.html             # About page
    │   ├── collections.html       # Collections overview page
    │   └── zotero.html            # Bibliography page
    └── xml_files -> ../xml_files  # Symlink for web serving of XML downloads
```

## Data Flow

1. Source XML files in `xml_files/` are processed by `scripts/process_xml.py`
2. Processing generates `static/data/collections.json` and `static/data/collections.geojson`
3. The web application loads these data files on startup
4. Users can interact with the data through the map, filters, and search
5. lunr.js provides instant search capabilities across multiple fields
6. Filtered results are displayed on both the map and in the collections list
7. XML files are served for download via the `static/xml_files` symlink

## Search Implementation

The search functionality is powered by lunr.js (via `utils.js`), which provides:

- Full-text search across multiple fields (title, sigla, place, etc.)
- Field-specific boosts for relevance ranking
- Instant results as users type
- Highlighted search terms in results
- Wildcard and fuzzy fallback search for robustness
