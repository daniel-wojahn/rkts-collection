/**
 * Open WebUI Embeddable Chat Widget
 * 
 * A simple, embeddable chat widget for Open WebUI instances.
 * Based on the official implementation: https://github.com/taylorwilsdon/open-webui-embeddable-widget
 */

// Main widget class
class OpenWebUIChatWidget {
  constructor(options = {}) {
    // Default configuration
    this.config = {
      apiKey: this.getUrlParam('api_key') || '', // Will be fetched from serverless function if not provided
      endpoint: this.getUrlParam('endpoint') || 'https://rkts-research.duckdns.org/api/chat/completions', // Using HTTPS for secure connections
      model: this.getUrlParam('model') || '',
      systemPrompt: this.getUrlParam('system_prompt') || '',
      position: this.getUrlParam('position') || 'bottom-right',
      primaryColor: this.getUrlParam('primary_color') || '#007bff',
      secondaryColor: this.getUrlParam('secondary_color') || '#6c757d',
      title: this.getUrlParam('title') || 'rKTs Collections Assistant',  
      greeting: this.getUrlParam('greeting') || 'Hello! How can I help you with your research today?',
      buttonSize: parseInt(this.getUrlParam('button_size') || '70'),
      dialogWidth: parseInt(this.getUrlParam('dialog_width') || '500'),
      dialogHeight: parseInt(this.getUrlParam('dialog_height') || '800')
    };
    
    // Override defaults with provided options
    this.config = { ...this.config, ...options };
    
    // Initialize widget elements
    this.chatButton = null;
    this.chatDialog = null;
    this.iframe = null;
    this.isOpen = false;
    
    // Fetch API key if not provided via URL param
    if (!this.config.apiKey) {
      this.fetchApiKey();
    } else {
      // Create and initialize the widget
      this.init();
    }
  }
  
  /**
   * Fetch API key from serverless function
   */
  fetchApiKey() {
    // Determine if we're in development or production
    const isLocalhost = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1';
    
    // Use relative path for production, full URL for development
    const apiKeyEndpoint = isLocalhost 
      ? 'http://localhost:8888/.netlify/functions/get-api-key' 
      : '/.netlify/functions/get-api-key';
    
    fetch(apiKeyEndpoint)
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch API key');
        }
        return response.json();
      })
      .then(data => {
        if (data && data.apiKey) {
          this.config.apiKey = data.apiKey;
          this.init();
        } else {
          console.error('No API key returned from server');
        }
      })
      .catch(error => {
        console.error('Error fetching API key:', error);
      });
  }
  
  /**
   * Get URL parameter value
   */
  getUrlParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  }
  
  /**
   * Initialize the chat widget
   */
  init() {
    this.createStyles();
    this.createChatButton();
    this.setupEventListeners();
  }
  
  /**
   * Create and inject CSS styles
   */
  createStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .owui-chat-button {
        position: fixed;
        width: ${this.config.buttonSize}px;
        height: ${this.config.buttonSize}px;
        border-radius: 50%;
        background-color: ${this.config.secondaryColor};
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        z-index: 9998;
        transition: all 0.3s ease;
      }
      
      .owui-chat-button:hover {
        transform: scale(1.05);
      }
      
      .owui-chat-button svg {
        width: 60%;
        height: 60%;
      }
      
      .owui-chat-dialog {
        position: fixed;
        width: ${this.config.dialogWidth}px;
        height: ${this.config.dialogHeight}px;
        background-color: white;
        border-radius: 10px;
        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
        z-index: 9999;
        overflow: hidden;
        display: none;
        flex-direction: column;
      }
      
      .owui-chat-dialog iframe {
        width: 100%;
        height: 100%;
        border: none;
      }
      
      /* Position variants */
      .owui-position-bottom-right .owui-chat-button {
        bottom: 20px;
        right: 20px;
      }
      
      .owui-position-bottom-right .owui-chat-dialog {
        bottom: 90px;
        right: 20px;
      }
      
      .owui-position-bottom-left .owui-chat-button {
        bottom: 20px;
        left: 20px;
      }
      
      .owui-position-bottom-left .owui-chat-dialog {
        bottom: 90px;
        left: 20px;
      }
      
      .owui-position-top-right .owui-chat-button {
        top: 20px;
        right: 20px;
      }
      
      .owui-position-top-right .owui-chat-dialog {
        top: 90px;
        right: 20px;
      }
      
      .owui-position-top-left .owui-chat-button {
        top: 20px;
        left: 20px;
      }
      
      .owui-position-top-left .owui-chat-dialog {
        top: 90px;
        left: 20px;
      }
    `;
    document.head.appendChild(style);
  }
  
  /**
   * Create the chat button and dialog
   */
  createChatButton() {
    // Create container div with position class
    const container = document.createElement('div');
    container.className = `owui-position-${this.config.position}`;
    document.body.appendChild(container);
    
    // Create chat button
    this.chatButton = document.createElement('div');
    this.chatButton.className = 'owui-chat-button';
    this.chatButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    `;
    container.appendChild(this.chatButton);
    
    // Create chat dialog
    this.chatDialog = document.createElement('div');
    this.chatDialog.className = 'owui-chat-dialog';
    container.appendChild(this.chatDialog);
  }
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Toggle chat dialog when button is clicked
    this.chatButton.addEventListener('click', () => {
      this.toggleChat();
    });
    
    // Close chat when clicking outside
    document.addEventListener('click', (event) => {
      if (this.isOpen && 
          !this.chatDialog.contains(event.target) && 
          !this.chatButton.contains(event.target)) {
        this.closeChat();
      }
    });
    
    // Handle escape key to close chat
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.isOpen) {
        this.closeChat();
      }
    });
    
    // Listen for close message from iframe
    window.addEventListener('message', (event) => {
      if (event.data === 'close') {
        this.closeChat();
      }
    });
  }
  
  /**
   * Toggle chat dialog
   */
  toggleChat() {
    if (this.isOpen) {
      this.closeChat();
    } else {
      this.openChat();
    }
  }
  
  /**
   * Open chat dialog
   */
  openChat() {
    // Create iframe if it doesn't exist
    if (!this.iframe) {
      this.iframe = document.createElement('iframe');
      
      // Build URL with parameters
      const params = new URLSearchParams({
        api_key: this.config.apiKey,
        endpoint: this.config.endpoint,
        model: this.config.model,
        system_prompt: this.config.systemPrompt,
        title: this.config.title,
        greeting: this.config.greeting,
        primary_color: this.config.primaryColor
      });
      
      // Determine the correct path based on current location
      // Always use absolute path from the root to avoid path issues
      const path = '/static/owui-chat.html';
      this.iframe.src = `${path}?${params.toString()}`;
      this.chatDialog.appendChild(this.iframe);
    }
    
    this.chatDialog.style.display = 'flex';
    this.isOpen = true;
  }
  
  /**
   * Close chat dialog
   */
  closeChat() {
    this.chatDialog.style.display = 'none';
    this.isOpen = false;
  }
}

/**
 * Mount the chat widget to a target element
 */
function mountChatWidget(options = {}) {
  return new OpenWebUIChatWidget(options);
}

// Auto-initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  mountChatWidget();
});
