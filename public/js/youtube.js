/**
 * YouTube Content Generator — AI-Powered with OmniCore Master Brain
 * Integrated with /api/ai/generate endpoint (Ollama Cloud API)
 */

document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we're on the YouTube tool page
    if (!document.getElementById('customIdeaInput')) return;

    const videoCategories = {
        mystery: { name: "Mystery & Crime", themes: ["unsolved murders", "missing persons", "cold cases", "conspiracies", "criminal investigations"] },
        paranormal: { name: "Paranormal", themes: ["ghost sightings", "haunted locations", "supernatural events", "poltergeists", "demonic encounters"] },
        conspiracy: { name: "Conspiracy", themes: ["government cover-ups", "secret societies", "alien encounters", "historical secrets", "hidden agendas"] },
        truecrime: { name: "True Crime", themes: ["serial killers", "famous cases", "criminal psychology", "forensic investigations", "justice system"] },
        unsolved: { name: "Unsolved Cases", themes: ["mysterious disappearances", "unexplained phenomena", "cryptic clues", "baffling evidence", "perplexing mysteries"] }
    };

    let currentCategory = "mystery";
    let currentHistory = "";
    let currentTitle = "";
    let currentDescription = "";
    let currentKeywords = "";

    const DOM = {
        historyContent: document.getElementById('historyContent'),
        titleContent: document.getElementById('titleContent'),
        descContent: document.getElementById('descContent'),
        keywordsContent: document.getElementById('keywordsContent'),
        thumbnailText: document.getElementById('thumbnailText'),
        progressBar: document.getElementById('progressBar'),
        seoScore: document.getElementById('seoScore'),
        viralScore: document.getElementById('viralScore'),
        titleLength: document.getElementById('titleLength'),
        descLength: document.getElementById('descLength'),
        keywordsCount: document.getElementById('keywordsCount'),
        titleScore: document.getElementById('titleScore'),
        descScore: document.getElementById('descScore'),
        keywordsScore: document.getElementById('keywordsScore'),
    };

    // ============================================================
    // AI INTEGRATION: Replace Gemini with OmniCore Master Brain
    // ============================================================

    /**
     * Call OmniCore AI via /api/ai/generate endpoint
     * @param {string} systemPrompt - System prompt/instruction
     * @param {string} userMessage - User message/request
     * @returns {Promise<string>} AI-generated response
     */
    async function callOmniCoreAI(systemPrompt, userMessage) {
        try {
            const response = await fetch('/api/ai/generate', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userMessage }
                    ]
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || `API Error: ${response.status}`);
            }

            const data = await response.json();
            if (data.success && data.data?.content) {
                return data.data.content.trim();
            } else {
                throw new Error(data.error || 'Unexpected API response');
            }
        } catch (err) {
            console.error('OmniCore AI Error:', err);
            throw new Error(`OmniCore Master Brain failed: ${err.message}`);
        }
    }

    // ============================================================
    // UI Initialization & Event Listeners
    // ============================================================

    function init() {
        generateNewHistory();
        updateAllContent();

        // Category button listeners
        document.querySelectorAll('.cat-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.cat-btn').forEach(b => {
                    b.classList.remove('active', 'border-red-500', 'bg-red-500/20', 'text-red-400');
                    b.classList.add('border-white/10', 'bg-white/5', 'text-gray-400');
                });
                const target = e.currentTarget;
                target.classList.remove('border-white/10', 'bg-white/5', 'text-gray-400');
                target.classList.add('active', 'border-red-500', 'bg-red-500/20', 'text-red-400');
                currentCategory = target.dataset.video;
                generateNewHistory();
                updateAllContent();
            });
        });

        // Main generation buttons
        document.getElementById('generateHistoryBtn')?.addEventListener('click', () => { 
            generateNewHistory(); 
            updateAllContent(); 
        });

        document.getElementById('generateVideoBtn')?.addEventListener('click', generateCompleteVideo);
        document.getElementById('generateTitleBtn')?.addEventListener('click', generateTitle);
        document.getElementById('generateDescBtn')?.addEventListener('click', generateDescription);
        document.getElementById('generateKeywordsBtn')?.addEventListener('click', generateKeywords);
    }

    /**
     * Generate a complete video with all components
     */
    async function generateCompleteVideo() {
        DOM.progressBar.style.width = '0%';
        const btn = document.getElementById('generateVideoBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';

        try {
            await generateNewHistory();
            DOM.progressBar.style.width = '25%';
            await new Promise(r => setTimeout(r, 300));

            await generateTitle();
            DOM.progressBar.style.width = '50%';
            await new Promise(r => setTimeout(r, 300));

            await generateDescription();
            DOM.progressBar.style.width = '75%';
            await new Promise(r => setTimeout(r, 300));

            await generateKeywords();
            DOM.progressBar.style.width = '100%';

            await new Promise(r => setTimeout(r, 500));
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-play-circle"></i> Generate Complete Video Content';
            DOM.progressBar.style.width = '0%';

            if (typeof showToast !== 'undefined') {
                showToast('Complete video content generated by OmniCore Master Brain!', 'success');
            }
        } catch (err) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-play-circle"></i> Generate Complete Video Content';
            DOM.progressBar.style.width = '0%';
            if (typeof showToast !== 'undefined') {
                showToast(`Generation failed: ${err.message}`, 'error');
            } else {
                console.error(err);
            }
        }
    }

    /**
     * Generate video concept/storyline
     */
    async function generateNewHistory() {
        const cat = videoCategories[currentCategory];
        const customIdea = document.getElementById('customIdeaInput').value.trim();

        DOM.historyContent.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> OmniCore brainstorming...';

        const systemPrompt = `Act as a professional YouTube ScriptWriter for a channel focused on Mystery, Paranormal, and True Crime with viral-worthy content. Your scripts are engaging, mysterious, dark, and highly clickable.`;

        const userPrompt = `Generate a compelling, mysterious, and engaging video concept/storyline (2-3 sentences) for a video in the category "${cat.name}" 
${customIdea ? `with the specific idea: "${customIdea}"` : `incorporating themes like ${cat.themes.join(', ')}`}. 
Make it professional, hooky, dark, and perfect for a mystery/paranormal YouTube video. Return ONLY the concept text.`;

        try {
            const result = await callOmniCoreAI(systemPrompt, userPrompt);
            currentHistory = result.trim();
            DOM.historyContent.textContent = currentHistory;
        } catch (err) {
            DOM.historyContent.innerHTML = `<span class="text-orange-400"><i class="fas fa-exclamation-triangle mr-2"></i>${err.message}</span>`;
            console.error(err);
        }
    }

    /**
     * Generate viral YouTube title
     */
    async function generateTitle() {
        const cat = videoCategories[currentCategory];

        DOM.titleContent.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Writing...';

        const systemPrompt = `You are a YouTube SEO and viral marketing expert. You create highly clickable, viral, and SEO-optimized YouTube titles that maximize CTR and engagement.`;

        const userPrompt = `Based on this video concept: "${currentHistory}", generate ONE highly clickable, viral, and SEO-optimized YouTube title (under 70 characters) for a ${cat.name} video. 
Use power words, create intrigue, and make it high-CTR material. Return ONLY the title text without quotes or explanation.`;

        try {
            const result = await callOmniCoreAI(systemPrompt, userPrompt);
            currentTitle = result.replace(/['"]/g, '').trim();
            DOM.titleContent.textContent = currentTitle;
            updateSEOScores();
            updateThumbnailText();
        } catch (err) {
            DOM.titleContent.innerHTML = `<span class="text-orange-400">${err.message}</span>`;
        }
    }

    /**
     * Generate video description
     */
    async function generateDescription() {
        if (!currentTitle) await generateTitle();
        const cat = videoCategories[currentCategory];

        DOM.descContent.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Drafting...';

        const systemPrompt = `You are a YouTube content strategist and video description expert. You write compelling, SEO-optimized descriptions that maximize engagement and watch time.`;

        const userPrompt = `Write a comprehensive, SEO-friendly YouTube video description for a video titled "${currentTitle}". 
Include:
1. A hooky opening paragraph (2-3 sentences)
2. 3-4 intriguing questions or bullet points
3. A Call to Action (like, subscribe, etc)
4. Relevant hashtags (5-7)

Keep the tone professional, mysterious, and engaging. Concept: ${currentHistory}

Return the description ready to paste into YouTube, with proper formatting and line breaks.`;

        try {
            const result = await callOmniCoreAI(systemPrompt, userPrompt);
            currentDescription = result.trim();
            DOM.descContent.textContent = currentDescription;
            updateSEOScores();
        } catch (err) {
            DOM.descContent.innerHTML = `<span class="text-orange-400">${err.message}</span>`;
        }
    }

    /**
     * Generate SEO keywords/tags
     */
    async function generateKeywords() {
        if (!currentTitle) await generateTitle();
        const cat = videoCategories[currentCategory];

        DOM.keywordsContent.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Analyzing...';

        const systemPrompt = `You are a YouTube SEO expert specializing in keyword research and tag optimization. You know exactly which tags will maximize discoverability and algorithmic reach.`;

        const userPrompt = `Generate a list of 15-20 highly relevant, high-search-volume YouTube tags/keywords for a video titled "${currentTitle}" 
in the "${cat.name}" niche. 
Return them as a SINGLE comma-separated line with NO other text, ending with a period. Example: tag1, tag2, tag3, tag4.`;

        try {
            const result = await callOmniCoreAI(systemPrompt, userPrompt);
            currentKeywords = result.replace(/\.$/, '').trim();
            DOM.keywordsContent.textContent = currentKeywords;
            updateSEOScores();
        } catch (err) {
            DOM.keywordsContent.innerHTML = `<span class="text-orange-400">${err.message}</span>`;
        }
    }

    /**
     * Update all content on screen
     */
    function updateAllContent() {
        DOM.titleContent.textContent = currentTitle || "Click 'Generate Complete Video Content' to create with AI...";
        DOM.descContent.textContent = currentDescription || "Click 'Generate' button...";
        DOM.keywordsContent.textContent = currentKeywords || "Click 'Generate' button...";
        updateSEOScores();
        updateThumbnailText();
    }

    /**
     * Copy content to clipboard
     */
    function copyContent(type) {
        let text = '';
        if (type === 'history') text = currentHistory;
        if (type === 'title') text = currentTitle;
        if (type === 'description') text = currentDescription;
        if (type === 'keywords') text = currentKeywords;

        if (!text) {
            if (typeof showToast !== 'undefined') showToast('Generate content first!', 'warning');
            return;
        }

        navigator.clipboard.writeText(text).then(() => {
            if (typeof showToast !== 'undefined') showToast('Copied to clipboard!', 'success');
        }).catch(() => {
            if (typeof showToast !== 'undefined') showToast('Failed to copy', 'error');
        });
    }

    /**
     * Update SEO scores
     */
    function updateSEOScores() {
        // Title
        const tl = currentTitle ? currentTitle.length : 0;
        DOM.titleLength.textContent = tl;
        let tScore = 0;
        if (tl > 0) tScore = tl <= 70 ? 100 : tl <= 80 ? 80 : 60;
        DOM.titleScore.textContent = `SEO: ${tScore >= 90 ? 'Excellent' : tScore >= 70 ? 'Good' : tScore >= 50 ? 'Fair' : 'Poor'}`;
        DOM.titleScore.className = `font-bold ${tScore >= 80 ? 'text-green-400' : tScore >= 60 ? 'text-orange-400' : 'text-red-400'}`;

        // Description
        const dl = currentDescription ? currentDescription.length : 0;
        DOM.descLength.textContent = dl;
        let dScore = 0;
        if (dl > 0) dScore = (dl >= 150 && dl <= 5000) ? 100 : 70;
        DOM.descScore.textContent = `SEO: ${dScore >= 90 ? 'Excellent' : 'Good'}`;
        DOM.descScore.className = `font-bold ${dScore >= 80 ? 'text-green-400' : 'text-orange-400'}`;

        // Keywords
        const kl = currentKeywords ? currentKeywords.split(',').length : 0;
        DOM.keywordsCount.textContent = kl;
        let kScore = 0;
        if (kl > 0) kScore = (kl >= 5 && kl <= 20) ? 100 : 70;
        DOM.keywordsScore.textContent = `SEO: ${kScore >= 90 ? 'Excellent' : 'Good'}`;
        DOM.keywordsScore.className = `font-bold ${kScore >= 80 ? 'text-green-400' : 'text-orange-400'}`;

        // Overall
        const overall = Math.round((tScore + dScore + kScore) / 3) || 0;
        DOM.seoScore.textContent = overall;
        DOM.viralScore.textContent = overall > 0 ? Math.min(100, overall + 20) : 0;
    }

    /**
     * Update thumbnail text suggestion
     */
    function updateThumbnailText() {
        if (!currentTitle) return;
        const kws = extractKeywords(currentTitle);
        DOM.thumbnailText.textContent = `Idea: Dark, mysterious background with bold text "${kws[0] || 'Mystery'}" and an intriguing image related to ${videoCategories[currentCategory].name.toLowerCase()}.`;
    }

    /**
     * Extract keywords from text
     */
    function extractKeywords(str) {
        const words = str.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
        return [...new Set(words.filter(w => w.length > 4))].slice(0, 5);
    }

    // Make copyContent globally available
    window.copyContent = copyContent;

    // Initialize when DOM is ready
    init();
});
