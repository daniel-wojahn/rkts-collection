// rkts-chat-widget.js: Modern floating chat widget for Open WebUI
const RKTS_API_URL = 'https://rkts-research.duckdns.org/api/chat/completions';
const RKTS_API_KEY = 'sk-b5ed6e03acfb48799ea3241984a5a206';
// Set to the exact model name available in your Open WebUI instance (check /models endpoint or WebUI settings)
const RKTS_MODEL = 'qwen/qwen3-30b-a3b:free';

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
    document.getElementById('rkts-chat-input').onsubmit = onSendMessage;
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

function appendMessage(role, text) {
  const msg = document.createElement('div');
  msg.className = 'rkts-msg ' + role;
  msg.textContent = text;
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
  appendMessage('assistant', '...');
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
        stream: false
      })
    });
    let data;
    let errorText = '';
    try {
      data = await res.json();
    } catch (jsonErr) {
      errorText = await res.text();
    }
    // Remove the '...' placeholder
    const msgs = document.querySelectorAll('.rkts-msg.assistant');
    if (msgs.length) msgs[msgs.length - 1].remove();
    if (res.ok && data && data.choices && data.choices[0] && data.choices[0].message) {
      appendMessage('assistant', data.choices[0].message.content);
    } else {
      // Log error details to console
      console.error('Open WebUI API error', res.status, data || errorText);
      let displayErr = '[API error]';
      if (data && data.detail) displayErr += ' ' + data.detail;
      else if (errorText) displayErr += ' ' + errorText;
      else if (data && data.error) displayErr += ' ' + data.error;
      appendMessage('assistant', displayErr);
    }
  } catch (err) {
    const msgs = document.querySelectorAll('.rkts-msg.assistant');
    if (msgs.length) msgs[msgs.length - 1].remove();
    console.error('Network or JS error', err);
    appendMessage('assistant', '[Error connecting to assistant]');
  }
}

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createChatWidget);
} else {
  createChatWidget();
}
