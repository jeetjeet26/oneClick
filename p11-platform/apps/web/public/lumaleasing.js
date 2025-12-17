/**
 * LumaLeasing Widget Loader
 * Embeddable AI leasing assistant for multifamily properties
 * 
 * Usage:
 * <script>
 *   (function(w,d,s,o,f,js,fjs){
 *     w['LumaLeasing']=o;w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
 *     js=d.createElement(s);fjs=d.getElementsByTagName(s)[0];
 *     js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
 *   }(window,document,'script','lumaleasing','https://your-domain.com/lumaleasing.js'));
 *   lumaleasing('init', 'YOUR_API_KEY');
 * </script>
 */

(function() {
  'use strict';

  // Configuration
  const WIDGET_VERSION = '1.0.0';
  
  // API_BASE is read dynamically to handle async script loading
  function getApiBase() {
    return window.LUMALEASING_API_BASE || '';
  }
  
  // State
  let config = null;
  let isOpen = false;
  let messages = [];
  let sessionId = null;
  let conversationId = null;
  let leadCaptured = false;
  let leadInfo = { firstName: '', lastName: '', email: '', phone: '' };
  let isTyping = false;
  let visitorId = getVisitorId();

  // Get or create visitor ID
  function getVisitorId() {
    const key = 'lumaleasing_visitor_id';
    let id = localStorage.getItem(key);
    if (!id) {
      id = 'v_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11);
      localStorage.setItem(key, id);
    }
    return id;
  }

  // Process queued commands
  function processQueue() {
    const queue = window.lumaleasing.q || [];
    queue.forEach(function(args) {
      handleCommand.apply(null, args);
    });
  }

  // Handle commands
  function handleCommand(command, arg1, arg2) {
    switch (command) {
      case 'init':
        initWidget(arg1, arg2);
        break;
      case 'open':
        openWidget();
        break;
      case 'close':
        closeWidget();
        break;
      case 'destroy':
        destroyWidget();
        break;
    }
  }

  // Initialize widget
  async function initWidget(apiKey, options) {
    if (!apiKey) {
      console.error('LumaLeasing: API key required');
      return;
    }

    options = options || {};

    try {
      const response = await fetch(getApiBase() + '/api/lumaleasing/config', {
        headers: { 'X-API-Key': apiKey }
      });

      if (!response.ok) {
        throw new Error('Failed to load widget configuration');
      }

      const data = await response.json();
      config = data.config;
      config.apiKey = apiKey;
      config.isOnline = data.isOnline;
      config.position = options.position || 'bottom-right';

      // Add welcome message
      messages = [{
        id: 'welcome',
        role: 'assistant',
        content: config.welcomeMessage,
        timestamp: new Date()
      }];

      // Inject styles
      injectStyles();

      // Render widget
      renderWidget();

      // Auto-popup
      if (config.autoPopupDelay > 0) {
        setTimeout(function() {
          openWidget();
        }, config.autoPopupDelay * 1000);
      }

    } catch (error) {
      console.error('LumaLeasing init error:', error);
    }
  }

  // Inject CSS styles
  function injectStyles() {
    if (document.getElementById('lumaleasing-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'lumaleasing-styles';
    styles.textContent = `
      .ll-widget * {
        box-sizing: border-box;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      }
      .ll-widget {
        position: fixed;
        z-index: 999999;
      }
      .ll-widget.bottom-right { right: 16px; bottom: 16px; }
      .ll-widget.bottom-left { left: 16px; bottom: 16px; }
      
      .ll-button {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transition: transform 0.2s, box-shadow 0.2s;
      }
      .ll-button:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 16px rgba(0,0,0,0.2);
      }
      .ll-button svg {
        width: 24px;
        height: 24px;
        fill: white;
      }
      .ll-button .ll-status {
        position: absolute;
        top: -2px;
        right: -2px;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        border: 2px solid white;
      }
      .ll-button .ll-status.online { background: #10b981; }
      .ll-button .ll-status.offline { background: #f59e0b; }
      
      .ll-window {
        width: 380px;
        height: 600px;
        max-height: calc(100vh - 100px);
        background: white;
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.15);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      
      .ll-header {
        padding: 16px;
        color: white;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .ll-header-info {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .ll-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(255,255,255,0.2);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .ll-avatar svg {
        width: 20px;
        height: 20px;
        fill: white;
      }
      .ll-name {
        font-weight: 600;
        font-size: 16px;
      }
      .ll-status-text {
        font-size: 12px;
        opacity: 0.8;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .ll-status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
      }
      .ll-status-dot.online { background: #10b981; }
      .ll-status-dot.offline { background: #f59e0b; }
      .ll-close {
        background: rgba(255,255,255,0.2);
        border: none;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }
      .ll-close:hover {
        background: rgba(255,255,255,0.3);
      }
      .ll-close svg {
        width: 20px;
        height: 20px;
        fill: white;
      }
      
      .ll-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        background: #f9fafb;
      }
      .ll-message {
        display: flex;
        margin-bottom: 12px;
      }
      .ll-message.user {
        justify-content: flex-end;
      }
      .ll-message-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        margin: 0 8px;
      }
      .ll-message.user .ll-message-avatar {
        background: #e5e7eb;
        order: 1;
      }
      .ll-message.assistant .ll-message-avatar {
        color: white;
      }
      .ll-message-avatar svg {
        width: 16px;
        height: 16px;
      }
      .ll-message-bubble {
        max-width: 80%;
        padding: 12px 16px;
        border-radius: 16px;
        font-size: 14px;
        line-height: 1.4;
      }
      .ll-message.user .ll-message-bubble {
        background: white;
        color: #1f2937;
        border-bottom-right-radius: 4px;
        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
      }
      .ll-message.assistant .ll-message-bubble {
        color: white;
        border-bottom-left-radius: 4px;
      }
      .ll-message-time {
        font-size: 10px;
        margin-top: 4px;
        text-align: right;
        opacity: 0.7;
      }
      
      .ll-typing {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 12px 16px;
        background: white;
        border-radius: 16px;
        border-bottom-left-radius: 4px;
        width: fit-content;
        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
      }
      .ll-typing-dot {
        width: 8px;
        height: 8px;
        background: #9ca3af;
        border-radius: 50%;
        animation: ll-bounce 1.4s infinite;
      }
      .ll-typing-dot:nth-child(2) { animation-delay: 0.15s; }
      .ll-typing-dot:nth-child(3) { animation-delay: 0.3s; }
      @keyframes ll-bounce {
        0%, 60%, 100% { transform: translateY(0); }
        30% { transform: translateY(-4px); }
      }
      
      .ll-input-area {
        padding: 16px;
        background: white;
        border-top: 1px solid #e5e7eb;
      }
      .ll-input-row {
        display: flex;
        gap: 8px;
      }
      .ll-input {
        flex: 1;
        padding: 12px 16px;
        border: 1px solid #e5e7eb;
        border-radius: 24px;
        font-size: 14px;
        outline: none;
        transition: border-color 0.2s;
      }
      .ll-input:focus {
        border-color: #9ca3af;
      }
      .ll-send {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: opacity 0.2s;
      }
      .ll-send:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .ll-send svg {
        width: 18px;
        height: 18px;
        fill: white;
      }
      .ll-powered {
        text-align: center;
        font-size: 10px;
        color: #9ca3af;
        margin-top: 8px;
      }
      
      .ll-system {
        display: flex;
        justify-content: center;
        margin-bottom: 12px;
      }
      .ll-system-bubble {
        background: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 12px;
        color: #6b7280;
        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
      }
    `;
    document.head.appendChild(styles);
  }

  // Render widget
  function renderWidget() {
    if (!config) return;

    // Remove existing widget
    const existing = document.getElementById('lumaleasing-widget');
    if (existing) existing.remove();

    // Create container
    const container = document.createElement('div');
    container.id = 'lumaleasing-widget';
    container.className = 'll-widget ' + config.position;

    if (isOpen) {
      container.innerHTML = renderWindow();
    } else {
      container.innerHTML = renderButton();
    }

    document.body.appendChild(container);

    // Attach event listeners
    attachEventListeners();
  }

  // Render button
  function renderButton() {
    return `
      <button class="ll-button" style="background: ${config.primaryColor}" onclick="lumaleasing('open')">
        <svg viewBox="0 0 24 24"><path d="M12 3c5.5 0 10 3.58 10 8s-4.5 8-10 8c-1.24 0-2.43-.18-3.53-.5C5.55 21 2 21 2 21c2.33-2.33 2.7-3.9 2.75-4.5C3.05 15.07 2 13.13 2 11c0-4.42 4.5-8 10-8z"/></svg>
        <span class="ll-status ${config.isOnline ? 'online' : 'offline'}"></span>
      </button>
    `;
  }

  // Render chat window
  function renderWindow() {
    const gradient = `linear-gradient(135deg, ${config.primaryColor}, ${config.secondaryColor})`;
    
    let messagesHtml = messages.map(function(msg) {
      if (msg.role === 'system') {
        return `
          <div class="ll-system">
            <div class="ll-system-bubble">${escapeHtml(msg.content)}</div>
          </div>
        `;
      }
      
      const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const avatarBg = msg.role === 'assistant' ? `background: ${config.primaryColor}` : '';
      const bubbleBg = msg.role === 'assistant' ? `background: ${gradient}` : '';
      const icon = msg.role === 'assistant' 
        ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2M7.5 13A2.5 2.5 0 005 15.5 2.5 2.5 0 007.5 18a2.5 2.5 0 002.5-2.5A2.5 2.5 0 007.5 13m9 0a2.5 2.5 0 00-2.5 2.5 2.5 2.5 0 002.5 2.5 2.5 2.5 0 002.5-2.5 2.5 2.5 0 00-2.5-2.5z"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4a4 4 0 014 4 4 4 0 01-4 4 4 4 0 01-4-4 4 4 0 014-4m0 10c4.42 0 8 1.79 8 4v2H4v-2c0-2.21 3.58-4 8-4z"/></svg>';
      
      return `
        <div class="ll-message ${msg.role}">
          <div class="ll-message-avatar" style="${avatarBg}">${icon}</div>
          <div class="ll-message-bubble" style="${bubbleBg}">
            ${escapeHtml(msg.content)}
            <div class="ll-message-time">${time}</div>
          </div>
        </div>
      `;
    }).join('');

    if (isTyping) {
      messagesHtml += `
        <div class="ll-message assistant">
          <div class="ll-message-avatar" style="background: ${config.primaryColor}">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2M7.5 13A2.5 2.5 0 005 15.5 2.5 2.5 0 007.5 18a2.5 2.5 0 002.5-2.5A2.5 2.5 0 007.5 13m9 0a2.5 2.5 0 00-2.5 2.5 2.5 2.5 0 002.5 2.5 2.5 2.5 0 002.5-2.5 2.5 2.5 0 00-2.5-2.5z"/></svg>
          </div>
          <div class="ll-typing">
            <div class="ll-typing-dot"></div>
            <div class="ll-typing-dot"></div>
            <div class="ll-typing-dot"></div>
          </div>
        </div>
      `;
    }

    return `
      <div class="ll-window">
        <div class="ll-header" style="background: ${gradient}">
          <div class="ll-header-info">
            <div class="ll-avatar">
              ${config.logoUrl 
                ? `<img src="${config.logoUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">` 
                : '<svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>'}
            </div>
            <div>
              <div class="ll-name">${escapeHtml(config.widgetName)}</div>
              <div class="ll-status-text">
                <span class="ll-status-dot ${config.isOnline ? 'online' : 'offline'}"></span>
                ${config.isOnline ? 'Online' : 'Away'}
              </div>
            </div>
          </div>
          <button class="ll-close" onclick="lumaleasing('close')">
            <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
        </div>
        <div class="ll-messages" id="ll-messages">${messagesHtml}</div>
        <div class="ll-input-area">
          <div class="ll-input-row">
            <input type="text" class="ll-input" id="ll-input" placeholder="Type a message..." ${isTyping ? 'disabled' : ''}>
            <button class="ll-send" id="ll-send" style="background: ${config.primaryColor}" ${isTyping ? 'disabled' : ''}>
              <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            </button>
          </div>
          <div class="ll-powered">Powered by LumaLeasing</div>
        </div>
      </div>
    `;
  }

  // Escape HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Attach event listeners
  function attachEventListeners() {
    const input = document.getElementById('ll-input');
    const send = document.getElementById('ll-send');
    const messagesContainer = document.getElementById('ll-messages');

    if (input) {
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      });
    }

    if (send) {
      send.addEventListener('click', sendMessage);
    }

    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  // Extract contact info from text
  function extractContactInfo(text) {
    const info = {};
    
    // Email pattern
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) info.email = emailMatch[0];
    
    // Phone pattern (various formats)
    const phoneMatch = text.match(/(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/);
    if (phoneMatch) info.phone = phoneMatch[0].replace(/[^\d+]/g, '');
    
    // Name pattern - look for "I'm [Name]" or "my name is [Name]" or just capitalized words before email
    const namePatterns = [
      /(?:i'm|im|i am|my name is|this is|call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
      /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+[a-zA-Z0-9._%+-]+@/,
      /^([A-Z][a-z]+\s+[A-Z][a-z]+)/
    ];
    
    for (const pattern of namePatterns) {
      const nameMatch = text.match(pattern);
      if (nameMatch) {
        const nameParts = nameMatch[1].trim().split(/\s+/);
        info.first_name = nameParts[0];
        if (nameParts.length > 1) info.last_name = nameParts.slice(1).join(' ');
        break;
      }
    }
    
    return Object.keys(info).length > 0 ? info : null;
  }

  // Save lead to backend
  async function saveLead(info) {
    if (!info || !info.email) return null;
    
    try {
      const response = await fetch(getApiBase() + '/api/lumaleasing/lead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': config.apiKey,
          'X-Visitor-ID': visitorId
        },
        body: JSON.stringify({
          leadInfo: info,
          sessionId: sessionId,
          conversationId: conversationId
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        leadCaptured = true;
        leadInfo = { ...leadInfo, ...info };
        console.log('LumaLeasing: Lead captured', data.leadId);
        return data.leadId;
      }
    } catch (error) {
      console.error('LumaLeasing: Failed to save lead', error);
    }
    return null;
  }

  // Send message
  async function sendMessage() {
    const input = document.getElementById('ll-input');
    if (!input || !input.value.trim() || isTyping) return;

    const text = input.value.trim();
    input.value = '';

    // Try to extract contact info from the message
    const extractedInfo = extractContactInfo(text);
    if (extractedInfo && !leadCaptured) {
      // Merge with any existing info
      Object.assign(leadInfo, extractedInfo);
      if (extractedInfo.email) {
        // Save lead immediately when we get an email
        saveLead(leadInfo);
      }
    }

    // Add user message
    messages.push({
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date()
    });

    isTyping = true;
    renderWidget();

    try {
      const response = await fetch(getApiBase() + '/api/lumaleasing/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': config.apiKey,
          'X-Visitor-ID': visitorId
        },
        body: JSON.stringify({
          messages: messages.filter(m => m.id !== 'welcome').map(m => ({
            role: m.role,
            content: m.content
          })),
          sessionId: sessionId,
          leadInfo: leadCaptured ? leadInfo : (extractedInfo || undefined)
        })
      });

      const data = await response.json();

      if (data.sessionId) sessionId = data.sessionId;
      if (data.conversationId) conversationId = data.conversationId;

      if (data.content) {
        messages.push({
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.content,
          timestamp: new Date()
        });
      }

      if (data.isHumanMode && data.waitingForHuman) {
        messages.push({
          id: (Date.now() + 2).toString(),
          role: 'system',
          content: 'A team member will respond shortly. Thanks for your patience!',
          timestamp: new Date()
        });
      }

    } catch (error) {
      console.error('LumaLeasing send error:', error);
      messages.push({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm having trouble connecting. Please try again!",
        timestamp: new Date()
      });
    } finally {
      isTyping = false;
      renderWidget();
    }
  }

  // Open widget
  function openWidget() {
    if (!config) {
      console.warn('LumaLeasing: Widget not initialized. Check API key and network.');
      return;
    }
    isOpen = true;
    renderWidget();
  }

  // Close widget
  function closeWidget() {
    isOpen = false;
    renderWidget();
  }

  // Destroy widget
  function destroyWidget() {
    const widget = document.getElementById('lumaleasing-widget');
    if (widget) widget.remove();
    const styles = document.getElementById('lumaleasing-styles');
    if (styles) styles.remove();
    config = null;
    messages = [];
  }

  // Replace queue with handler
  window.lumaleasing = function() {
    handleCommand.apply(null, arguments);
  };

  // Process any queued commands
  processQueue();

})();

