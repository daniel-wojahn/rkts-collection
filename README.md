# Tibetan Buddhist Collections Explorer

A web application for exploring and visualizing Tibetan Buddhist text collections with advanced search, filtering, and map visualization capabilities.

## Tech Stack

This application is built using a modern web technology stack:

### Frontend
- **HTML5/CSS3** - Core structure and styling
- **Bootstrap 5** - Responsive UI framework with built-in components
- **JavaScript (ES6+)** - Client-side functionality
- **Leaflet.js** - Interactive map visualization
- **Chart.js** - Data visualization for collection statistics
- **lunr.js** - Client-side full-text search engine with instant results
- **FileSaver.js** - Client-side file download functionality

### Data Processing
- **Python** - Server-side data processing
- **XML/JSON** - Data storage and exchange formats
- **GeoJSON** - Geographic data representation

## Features
- **Interactive Map** - Visualize collections by geographic location
- **Advanced Filtering** - Filter collections by category, group, place, and date range
- **Full-Text Search** - Instant search with lunr.js across multiple fields
- **Collection Details** - View detailed information about each collection
- **XML Downloads** - Download original XML files for each collection
- **Data Visualization** - Charts showing distribution of collections by category and place
- **Responsive Design** - Works on desktop and mobile devices

## Project Structure

```
/
├── index.html                 # Main application page
├── deploy.py                  # Deployment script
├── README.md                  # This file
├── static/
│   ├── css/
│   │   └── style.css          # Custom styles
│   ├── data/
│   │   ├── collections.json   # Collection metadata
│   │   └── collections.geojson # Geographic data
│   ├── images/                # Application images
│   ├── js/
│   │   ├── app.js             # Main application logic
│   │   ├── collections.js     # Collections page logic
│   │   └── lunr-search.js     # Search functionality
│   ├── pages/
│   │   ├── about.html         # About page
│   │   └── collections.html   # Collections overview page
│   └── xml_files/             # Original XML files
```

## Data Flow

1. XML files containing collection metadata are processed into JSON and GeoJSON formats
2. The web application loads these data files on startup
3. Users can interact with the data through the map, filters, and search
4. lunr.js provides instant search capabilities across multiple fields
5. Filtered results are displayed on both the map and in the collections list

## Search Implementation

The search functionality is powered by lunr.js, which provides:

- Full-text search across multiple fields (title, sigla, place, etc.)
- Field-specific boosts for relevance ranking
- Instant results as users type
- Highlighted search terms in results
- Fallback search for robustness

