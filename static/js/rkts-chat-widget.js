// rkts-chat-widget.js: Modern floating chat widget for Open WebUI
const RKTS_API_URL = 'https://rkts-research.duckdns.org/api/chat/completions';
const RKTS_API_KEY = 'sk-b5ed6e03acfb48799ea3241984a5a206';
const RKTS_MODEL = 'rkts-research-tool';

// Dynamically load marked.js if not present
function ensureMarkedLoaded(cb) {
  if (window.marked) return cb();
  const script = document.createElement('script');
  script.src = 'static/js/marked.min.js';
  script.onload = cb;
  document.head.appendChild(script);
}

function createChatWidget() {
  // Add CSS
  if (!document.getElementById('rkts-chat-widget-css')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'static/css/rkts-chat-widget.css';
    link.id = 'rkts-chat-widget-css';
    document.head.appendChild(link);
  }
  // Add Chat Button
  if (!document.getElementById('rkts-chat-widget-button')) {
    const btn = document.createElement('button');
    btn.id = 'rkts-chat-widget-button';
    btn.innerHTML = '<i class="bi bi-chat-dots"></i>';
    btn.title = 'Ask Research Assistant';
    btn.onclick = () => showWidget();
    document.body.appendChild(btn);
  }
  // Add Widget HTML
  if (!document.getElementById('rkts-chat-widget')) {
    const widget = document.createElement('div');
    widget.id = 'rkts-chat-widget';
    widget.style.display = 'none';
    widget.innerHTML = `
      <div id="rkts-chat-header">
        Research Assistant
        <button id="rkts-chat-close" title="Close">&times;</button>
      </div>
      <div id="rkts-chat-messages"></div>
      <form id="rkts-chat-input" autocomplete="off">
        <textarea placeholder="Type your question..." required></textarea>
        <button type="submit">Send</button>
      </form>
    `;
    document.body.appendChild(widget);
    document.getElementById('rkts-chat-close').onclick = hideWidget;
    document.getElementById('rkts-chat-input').onsubmit = function(e) {
      e.preventDefault();
      ensureMarkedLoaded(() => onSendMessage(e));
    };
  }
}

function showWidget() {
  document.getElementById('rkts-chat-widget').style.display = 'flex';
  document.getElementById('rkts-chat-widget-button').style.display = 'none';
}
function hideWidget() {
  document.getElementById('rkts-chat-widget').style.display = 'none';
  document.getElementById('rkts-chat-widget-button').style.display = 'flex';
}

function appendMessage(role, text, isHtml = false) {
  const msg = document.createElement('div');
  msg.className = 'rkts-msg ' + role;
  if (isHtml) {
    msg.innerHTML = text;
  } else {
    msg.textContent = text;
  }
  document.getElementById('rkts-chat-messages').appendChild(msg);
  document.getElementById('rkts-chat-messages').scrollTop = 99999;
}

async function onSendMessage(e) {
  e.preventDefault();
  const textarea = e.target.querySelector('textarea');
  const text = textarea.value.trim();
  if (!text) return;
  appendMessage('user', text);
  textarea.value = '';
  // Add assistant placeholder
  const msgContainer = document.getElementById('rkts-chat-messages');
  const msgDiv = document.createElement('div');
  msgDiv.className = 'rkts-msg assistant';
  msgDiv.innerHTML = '<span class="rkts-streaming-cursor">...</span>';
  msgContainer.appendChild(msgDiv);
  msgContainer.scrollTop = 99999;
  try {
    const res = await fetch(RKTS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + RKTS_API_KEY,
      },
      body: JSON.stringify({
        model: RKTS_MODEL,
        messages: [
          { role: 'user', content: text }
        ],
        stream: true
      })
    });
    if (!res.ok || !res.body) {
      msgDiv.innerHTML = '[API error: ' + res.status + ']';
      return;
    }
    // Streaming response (SSE or chunked text)
    let reader = res.body.getReader();
    let decoder = new TextDecoder();
    let buffer = '';
    let markdown = '';
    let done = false;
    while (!done) {
      const { value, done: doneReading } = await reader.read();
      if (value) {
        buffer += decoder.decode(value, { stream: true });
        // Parse SSE or JSONL
        let lines = buffer.split(/\r?\n/);
        buffer = lines.pop();
        for (let line of lines) {
          if (line.trim().startsWith('data:')) {
            let dataStr = line.replace(/^data:/, '').trim();
            if (dataStr === '[DONE]') {
              done = true;
              break;
            }
            try {
              let data = JSON.parse(dataStr);
              let delta = data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content;
              if (delta) {
                markdown += delta;
                msgDiv.innerHTML = window.marked ? window.marked.parse(markdown) : markdown;
                msgContainer.scrollTop = 99999;
              }
            } catch (err) {
              // Ignore parse errors
            }
          }
        }
      }
      done = done || doneReading;
    }
    // Remove cursor if present
    msgDiv.innerHTML = window.marked ? window.marked.parse(markdown) : markdown;
    msgContainer.scrollTop = 99999;
  } catch (err) {
    msgDiv.innerHTML = '[Error connecting to assistant]';
    console.error('Network or JS error', err);
  }
}

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createChatWidget);
} else {
  createChatWidget();
}
