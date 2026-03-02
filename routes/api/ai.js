const express = require('express');
const router = express.Router();
const axios = require('axios');
const { requireAuth } = require('../../middleware/auth');
const Settings = require('../../models/Settings');

/**
 * @route   POST /api/ai/generate
 * @desc    OmniCore AI Master Brain - Proxies requests to Ollama Cloud API
 * @access  Private (Authenticated Users)
 */
router.post('/generate', requireAuth, async (req, res) => {
    try {
        const { messages } = req.body;

        // Validate input
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            console.error('[AI API] Invalid request: messages array is required');
            return res.status(400).json({
                success: false,
                error: 'Invalid request: messages array is required'
            });
        }

        console.log('[AI API] Request from user:', req.user._id);

        // Master AI Key provided by user for stability
        const ollamaKey = 'f5a80934188c41bc979a1fe810015e89._9ffcVpaev6VcsaDlrLKaXwo';

        if (!ollamaKey) {
            console.error('[AI API] Ollama API key is missing');
            return res.status(503).json({
                success: false,
                error: 'Service Unavailable: OmniCore Master Brain not configured.'
            });
        }

        console.log('[AI API] Using Ollama API key (length:', ollamaKey.length, ')');

        // Make request to Ollama Cloud API
        console.log('[AI API] Sending request to Ollama API...');
        const ollamaResponse = await axios.post(
            'https://ollama.com/api/chat',
            {
                model: 'gpt-oss:120b',
                messages: messages,
                stream: false
            },
            {
                headers: {
                    'Authorization': `Bearer ${ollamaKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000 // 30 second timeout
            }
        );

        console.log('[AI API] Ollama response received successfully');

        // Extract and return the AI response safely
        if (ollamaResponse.data && ollamaResponse.data.message) {
            return res.json({
                success: true,
                data: {
                    content: ollamaResponse.data.message.content,
                    model: ollamaResponse.data.model,
                    timestamp: new Date()
                }
            });
        } else {
            console.error('[AI API] Unexpected Ollama response format:', ollamaResponse.data);
            return res.status(500).json({
                success: false,
                error: 'Unexpected response format from OmniCore Master Brain'
            });
        }
    } catch (err) {
        console.error('[AI API] Fatal Error:', err.message);

        if (err.response) {
            console.error('[AI API] Response Error Data:', JSON.stringify(err.response.data, null, 2));
            console.error('[AI API] Response Status:', err.response.status);
        } else if (err.request) {
            console.error('[AI API] No Response Received.');
        }

        // Handle specific error types
        if (err.response?.status === 401) {
            return res.status(401).json({
                success: false,
                error: 'Invalid Ollama API key. Please check admin settings.'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to generate AI response: ' + (err.message || 'Unknown error')
        });
    }
});

module.exports = router;
