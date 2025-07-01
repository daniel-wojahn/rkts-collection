// rkts-chat-widget.js: Modern floating chat widget for Open WebUI
const RKTS_API_URL = 'https://rkts-research.duckdns.org/api/chat/completions';
const RKTS_MODEL = 'rkts-research-tool';

// Track if marked.js is loaded and initialized
let markedInitialized = false;

// Marked.js configuration

// Initialize marked with safe defaults
function initializeMarked() {
  if (markedInitialized) return true;
  
  if (typeof marked === 'undefined') {
    console.error('marked.js is not loaded');
    return false;
  }
  
  // Configure marked
  marked.setOptions({
    gfm: true,
    breaks: true,
    sanitize: true,
    smartypants: true
  });
  
  markedInitialized = true;
  return true;
}

// Load marked.js if not already loaded
function ensureMarkedLoaded(cb) {
  if (window.marked) {
    initializeMarked();
    return cb();
  }
  
  const script = document.createElement('script');
  script.src = '/static/js/lib/marked.min.js';
  script.onload = () => {
    if (initializeMarked()) {
      cb();
    } else {
      console.error('Failed to initialize marked.js');
      cb(); // Continue without markdown
    }
  };
  script.onerror = () => {
    console.error('Failed to load marked.js');
    cb(); // Continue without markdown
  };
  document.head.appendChild(script);
}

function createChatWidget() {
  // Add CSS
  if (!document.getElementById('rkts-chat-widget-css')) {
    // Add our CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/static/css/rkts-chat-widget.css';
    link.id = 'rkts-chat-widget-css';
    document.head.appendChild(link);
    
    // Add Inter font from Google Fonts
    const fontLink = document.createElement('link');
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap';
    fontLink.rel = 'stylesheet';
    document.head.appendChild(fontLink);
    
    // Add Bootstrap Icons
    const iconsLink = document.createElement('link');
    iconsLink.rel = 'stylesheet';
    iconsLink.href = 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css';
    document.head.appendChild(iconsLink);
  }
  
  // Add Chat Button
  if (!document.getElementById('rkts-chat-widget-button')) {
    const chatButton = document.createElement('button');
    chatButton.id = 'rkts-chat-widget-button';
    chatButton.innerHTML = '<i class="bi bi-chat-square-text"></i>';
    chatButton.title = 'Ask our Research Assistant';
    chatButton.setAttribute('aria-label', 'Open chat with Research Assistant');
    chatButton.onclick = (e) => {
      e.preventDefault();
      showWidget();
    };
    document.body.appendChild(chatButton);
  }
  
  // Add Widget HTML
  if (!document.getElementById('rkts-chat-widget')) {
    const widget = document.createElement('div');
    widget.id = 'rkts-chat-widget';
    widget.setAttribute('aria-label', 'Chat with Research Assistant');
    widget.setAttribute('role', 'dialog');
    widget.setAttribute('aria-modal', 'true');
    
    widget.innerHTML = `
      <div id="rkts-chat-header">
        <div class="header-content">
          <i class="bi bi-chat-square-text"></i>
          <span>Research Assistant</span>
        </div>
        <button id="rkts-chat-close" aria-label="Close chat" class="close-btn">
          <i class="bi bi-x"></i>
        </button>
      </div>
      <div id="rkts-chat-messages" role="log" aria-live="polite"></div>
      <form id="rkts-chat-input" autocomplete="off" role="form">
        <div id="rkts-chat-input-inner">
          <input 
            type="text" 
            placeholder="Type your question..." 
            aria-label="Type your message"
            required
          >
          <button type="submit" aria-label="Send message">
            <i class="bi bi-send-fill"></i>
          </button>
        </div>
      </form>
    `;
    
    document.body.appendChild(widget);
    
    // Set up event handlers
    const initializeEventHandlers = () => {
      const closeBtn = document.getElementById('rkts-chat-close');
      const chatForm = document.getElementById('rkts-chat-input');
      const inputField = chatForm.querySelector('input');
      const chatWidget = document.getElementById('rkts-chat-widget');
      
      // Close button
      closeBtn.onclick = (e) => {
        e.preventDefault();
        hideWidget();
      };
      
      // Form submission
      chatForm.onsubmit = (e) => {
        e.preventDefault();
        ensureMarkedLoaded(() => onSendMessage(e));
      };
      
      // Keyboard shortcuts
      inputField.addEventListener('keydown', (e) => {
        // Submit on Cmd+Enter or Ctrl+Enter
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          e.preventDefault();
          chatForm.dispatchEvent(new Event('submit'));
        }
        
        // Don't close on Escape when input has text
        if (e.key === 'Escape' && !inputField.value) {
          e.preventDefault();
          hideWidget();
        }
      });
      
      // Focus trap for accessibility
      chatWidget.addEventListener('keydown', (e) => {
        // Close on Escape when not in input or input is empty
        if (e.key === 'Escape' && 
            (document.activeElement !== inputField || !inputField.value)) {
          e.preventDefault();
          hideWidget();
          return;
        }
        
        // Trap focus inside the widget when open
        if (e.key === 'Tab') {
          const focusableElements = chatWidget.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          
          if (focusableElements.length === 0) return;
          
          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];
          
          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              e.preventDefault();
              lastElement.focus();
            }
          } else {
            if (document.activeElement === lastElement) {
              e.preventDefault();
              firstElement.focus();
            }
          }
        }
      });
      
      // Auto-focus input when widget is shown
      const observer = new MutationObserver((mutations) => {
        if (chatWidget.classList.contains('visible')) {
          inputField.focus();
        }
      });
      
      observer.observe(chatWidget, {
        attributes: true,
        attributeFilter: ['class']
      });
      
      // Click outside to close
      document.addEventListener('click', (e) => {
        if (chatWidget.classList.contains('visible') && 
            !chatWidget.contains(e.target) && 
            e.target.id !== 'rkts-chat-widget-button') {
          hideWidget();
        }
      });
    };
    
    // Initialize event handlers after a short delay to ensure DOM is ready
    setTimeout(initializeEventHandlers, 0);
    
    // Add welcome message
    ensureMarkedLoaded(() => {
      appendMessage('assistant', 
        'Hello! I\'m your research assistant. How can I help you today?\n\n' +
        'You can ask me about the rKTs canonical collections, search for specific items, ' +
        'or get help with your research. All answers are produced from our curated collection of state-of-the-art research. ' +
        'See our bibliographic references for more information.'
      );
    });
  }
}

function showWidget() {
  const widget = document.getElementById('rkts-chat-widget');
  const button = document.getElementById('rkts-chat-widget-button');
  
  // Show the widget and add visible class after a small delay for the animation
  widget.style.display = 'flex';
  widget.scrollTop = widget.scrollHeight;
  
  // Trigger reflow to ensure the initial state is applied
  void widget.offsetHeight;
  
  // Add the visible class to trigger the animation
  setTimeout(() => {
    widget.classList.add('visible');
    button.classList.add('hidden');
  }, 10);
  
  // Focus the input field
  const input = widget.querySelector('input');
  if (input) {
    setTimeout(() => input.focus(), 100);
  }
}

function hideWidget() {
  const widget = document.getElementById('rkts-chat-widget');
  const button = document.getElementById('rkts-chat-widget-button');
  
  // Remove the visible class to trigger the fade out animation
  widget.classList.remove('visible');
  button.classList.remove('hidden');
  
  // Hide the widget after the animation completes
  setTimeout(() => {
    widget.style.display = 'none';
  }, 300); // Match this with the CSS transition duration
}

function appendMessage(role, text, isHtml = false) {
  const messages = document.getElementById('rkts-chat-messages');
  const msg = document.createElement('div');
  msg.className = `rkts-msg ${role}`;
  msg.setAttribute('role', role === 'user' ? 'status' : 'article');
  msg.setAttribute('aria-live', role === 'user' ? 'polite' : 'off');
  
  // Parse markdown for assistant messages if marked is available
  if (isHtml) {
    msg.innerHTML = text;
  } else if (role === 'assistant' && markedInitialized) {
    try {
      // Parse markdown and handle code blocks
      const parsedHtml = marked.parse(text);
      const temp = document.createElement('div');
      temp.innerHTML = parsedHtml;
      
      // Process code blocks to add copy functionality
      temp.querySelectorAll('pre code').forEach((codeBlock) => {
        const pre = codeBlock.parentElement;
        const wrapper = document.createElement('div');
        wrapper.className = 'code-block-wrapper';
        
        // Create copy button
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-code-btn';
        copyBtn.title = 'Copy to clipboard';
        copyBtn.setAttribute('aria-label', 'Copy code to clipboard');
        copyBtn.innerHTML = '<i class="bi bi-clipboard"></i>';
        
        // Handle copy functionality
        copyBtn.onclick = async () => {
          try {
            await navigator.clipboard.writeText(codeBlock.textContent);
            copyBtn.innerHTML = '<i class="bi bi-check"></i>';
            copyBtn.classList.add('copied');
            copyBtn.title = 'Copied!';
            
            setTimeout(() => {
              copyBtn.innerHTML = '<i class="bi bi-clipboard"></i>';
              copyBtn.classList.remove('copied');
              copyBtn.title = 'Copy to clipboard';
            }, 2000);
          } catch (err) {
            console.error('Failed to copy text: ', err);
            copyBtn.innerHTML = '<i class="bi bi-x"></i>';
            copyBtn.title = 'Failed to copy';
            
            setTimeout(() => {
              copyBtn.innerHTML = '<i class="bi bi-clipboard"></i>';
              copyBtn.title = 'Copy to clipboard';
            }, 2000);
          }
        };
        
        // Wrap the pre element with the wrapper and add copy button
        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(pre);
        wrapper.appendChild(copyBtn);
      });
      
      msg.innerHTML = temp.innerHTML;
      
    } catch (e) {
      console.error('Error parsing markdown:', e);
      msg.textContent = text;
    }
  } else {
    msg.textContent = text;
  }
  
  // Add message to the chat
  messages.appendChild(msg);
  
  // Scroll to the new message with smooth behavior
  requestAnimationFrame(() => {
    msg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
  
  // Add typing indicator for assistant messages
  if (role === 'assistant') {
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'typing-indicator';
    typingIndicator.setAttribute('aria-label', 'Assistant is typing');
    typingIndicator.innerHTML = `
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    `;
    
    messages.appendChild(typingIndicator);
    
    // Scroll to the typing indicator
    requestAnimationFrame(() => {
      typingIndicator.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    
    return typingIndicator;
  }
  
  return msg;
}

async function onSendMessage(e) {
  e.preventDefault();
  
  const input = document.querySelector('#rkts-chat-input input');
  const submitBtn = document.querySelector('#rkts-chat-input button[type="submit"]');
  const message = input.value.trim();
  
  if (!message) return;
  
  // Add user message to chat
  appendMessage('user', message);
  
  // Clear input and disable it while waiting for response
  input.value = '';
  input.disabled = true;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="bi bi-hourglass-split"></i>';
  }
  
  // Show typing indicator
  let typingIndicator = appendMessage('assistant', '');
  let responseText = '';
  let messageElement = null;
  
  try {
    const response = await fetch(RKTS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: RKTS_MODEL,
        messages: [{ role: 'user', content: message }],
        stream: true,
        temperature: 0.7,
        max_tokens: 1000
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || 
        `Request failed with status ${response.status}`
      );
    }
    
    if (!response.body) {
      throw new Error('No response body');
    }
    
    // Process the streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      // Decode the chunk and add to buffer
      buffer += decoder.decode(value, { stream: true });
      
      // Process complete lines
      let newlineIndex;
      while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        
        if (!line.startsWith('data: ')) continue;
        
        const data = line.slice(6); // Remove 'data: ' prefix
        if (data === '[DONE]') continue;
        
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content || '';
          
          if (content) {
            responseText += content;
            
            // Remove typing indicator after first content chunk
            if (typingIndicator && typingIndicator.parentNode) {
              typingIndicator.remove();
              typingIndicator = null;
              
              // Create a new message element for the response
              messageElement = document.createElement('div');
              messageElement.className = 'rkts-msg assistant';
              messageElement.setAttribute('role', 'article');
              document.getElementById('rkts-chat-messages').appendChild(messageElement);
            }
            
            // Update the message with the latest content
            if (messageElement) {
              messageElement.innerHTML = marked.parse(responseText);
              
              // Add copy functionality to code blocks
              messageElement.querySelectorAll('pre code').forEach((codeBlock) => {
                const pre = codeBlock.parentElement;
                const wrapper = document.createElement('div');
                wrapper.className = 'code-block-wrapper';
                
                const copyBtn = document.createElement('button');
                copyBtn.className = 'copy-code-btn';
                copyBtn.title = 'Copy to clipboard';
                copyBtn.setAttribute('aria-label', 'Copy code to clipboard');
                copyBtn.innerHTML = '<i class="bi bi-clipboard"></i>';
                
                copyBtn.onclick = async () => {
                  try {
                    await navigator.clipboard.writeText(codeBlock.textContent);
                    copyBtn.innerHTML = '<i class="bi bi-check"></i>';
                    copyBtn.classList.add('copied');
                    copyBtn.title = 'Copied!';
                    
                    setTimeout(() => {
                      copyBtn.innerHTML = '<i class="bi bi-clipboard"></i>';
                      copyBtn.classList.remove('copied');
                      copyBtn.title = 'Copy to clipboard';
                    }, 2000);
                  } catch (err) {
                    console.error('Failed to copy text: ', err);
                    copyBtn.innerHTML = '<i class="bi bi-x"></i>';
                    copyBtn.title = 'Failed to copy';
                    
                    setTimeout(() => {
                      copyBtn.innerHTML = '<i class="bi bi-clipboard"></i>';
                      copyBtn.title = 'Copy to clipboard';
                    }, 2000);
                  }
                };
                
                pre.parentNode.insertBefore(wrapper, pre);
                wrapper.appendChild(pre);
                wrapper.appendChild(copyBtn);
              });
              
              // Scroll to the message
              messageElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          }
        } catch (e) {
          console.error('Error parsing chunk:', e);
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
    
    // Remove typing indicator if there was an error
    if (typingIndicator && typingIndicator.parentNode) {
      typingIndicator.remove();
    }
    
    // Show error message
    appendMessage('assistant', 
      `I'm sorry, I encountered an error while processing your request. ` +
      `Please try again later. (${error.message || 'Unknown error'})`
    );
  } finally {
    // Re-enable input and reset button
    input.disabled = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="bi bi-send-fill"></i>';
    }
    
    // Focus the input field again
    input.focus();
  }
}

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createChatWidget);
} else {
  createChatWidget();
}
