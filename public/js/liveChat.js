/**
 * Live Chat Widget - AI Chatbot powered by Ollama
 * Provides real-time support using the configured Master AI Key
 */

(function () {
    'use strict';

    // Initialize widget on page load
    document.addEventListener('DOMContentLoaded', initLiveChat);

    function initLiveChat() {
        // Don't show on admin pages
        if (window.location.pathname.includes('/admin')) return;

        // Create and inject widget HTML
        createChatWidget();
        attachEventListeners();
    }

    function createChatWidget() {
        const widgetHTML = `
            <div class="live-chat-widget">
                <button class="live-chat-toggle" id="chatToggleBtn" title="Chat with AI Assistant">
                    <i class="fas fa-comments"></i>
                </button>
                
                <div class="live-chat-container" id="chatContainer">
                    <div class="chat-header">
                        <div class="chat-header-title">
                            <span class="online-indicator"></span>
                            <span>Live AI Assistant</span>
                        </div>
                        <button class="chat-close-btn" id="chatCloseBtn">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="chat-messages" id="chatMessages">
                        <div class="message system">
                            <div class="message-bubble">
                                👋 Hi! I'm your AI assistant. How can I help you today?
                            </div>
                        </div>
                    </div>
                    
                    <div class="chat-input-container">
                        <input 
                            type="text" 
                            class="chat-input" 
                            id="chatInput" 
                            placeholder="Type your question..."
                            maxlength="500"
                        >
                        <button class="chat-send-btn" id="chatSendBtn">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Inject widget into DOM
        const widget = document.createElement('div');
        widget.innerHTML = widgetHTML;
        document.body.appendChild(widget.firstElementChild);

        // Inject CSS
        if (!document.getElementById('livechat-css')) {
            const link = document.createElement('link');
            link.id = 'livechat-css';
            link.rel = 'stylesheet';
            link.href = '/css/livechat.css';
            document.head.appendChild(link);
        }
    }

    function attachEventListeners() {
        const toggleBtn = document.getElementById('chatToggleBtn');
        const closeBtn = document.getElementById('chatCloseBtn');
        const sendBtn = document.getElementById('chatSendBtn');
        const input = document.getElementById('chatInput');
        const container = document.getElementById('chatContainer');

        // Toggle chat visibility
        toggleBtn.addEventListener('click', () => {
            container.classList.toggle('active');
            if (container.classList.contains('active')) {
                input.focus();
            }
        });

        // Close chat
        closeBtn.addEventListener('click', () => {
            container.classList.remove('active');
        });

        // Send message on button click
        sendBtn.addEventListener('click', handleSendMessage);

        // Send message on Enter key
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        });

        // Close chat on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && container.classList.contains('active')) {
                container.classList.remove('active');
            }
        });
    }

    async function handleSendMessage() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();

        if (!message) return;

        // Add user message to UI
        addMessageToChat(message, 'user');
        input.value = '';

        // Show typing indicator
        showTypingIndicator();

        try {
            // Call AI API with credentials for authentication
            const response = await fetch('/api/ai/generate', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a helpful AI assistant for a digital marketing and trading platform called BlackHat Traffic. Provide friendly, concise, and professional support. Keep responses brief (1-2 sentences) unless the user asks for more detail.'
                        },
                        { role: 'user', content: message }
                    ]
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('[Live Chat] API Error:', response.status, errorData);
                removeTypingIndicator();
                
                if (response.status === 401) {
                    addMessageToChat('Please log in to use the AI assistant.', 'assistant');
                } else if (response.status === 503) {
                    addMessageToChat('AI service is not configured. Please contact administrator.', 'assistant');
                } else {
                    addMessageToChat('Error: ' + (errorData.error || 'Unable to generate response'), 'assistant');
                }
                return;
            }

            const data = await response.json();

            // Remove typing indicator
            removeTypingIndicator();

            if (data.success && data.data && data.data.content) {
                // Add AI response to chat
                addMessageToChat(data.data.content, 'assistant');
            } else {
                console.error('[Live Chat] Invalid response format:', data);
                addMessageToChat('Sorry, I encountered an error. Please try again.', 'assistant');
            }
        } catch (error) {
            console.error('[Live Chat] Network/Parse error:', error.message || error);
            removeTypingIndicator();
            addMessageToChat('Unable to connect to AI service. Please try again later.', 'assistant');
        }
    }

    function addMessageToChat(text, role) {
        const messagesContainer = document.getElementById('chatMessages');

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;

        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        bubble.textContent = text;

        messageDiv.appendChild(bubble);
        messagesContainer.appendChild(messageDiv);

        // Auto-scroll to newest message
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function showTypingIndicator() {
        const messagesContainer = document.getElementById('chatMessages');

        const messageDiv = document.createElement('div');
        messageDiv.className = 'message assistant';
        messageDiv.id = 'typing-indicator';

        const bubble = document.createElement('div');
        bubble.className = 'message-bubble message-loading';
        bubble.innerHTML = '<span></span><span></span><span></span>';

        messageDiv.appendChild(bubble);
        messagesContainer.appendChild(messageDiv);

        // Auto-scroll
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function removeTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }
})();
