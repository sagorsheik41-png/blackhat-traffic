/**
 * Adobe Stock Suite Logic
 * Consolidates: Creative Brief, Keyword Research, Title Optimizer, Color Palette, Batch Metadata ZIP
 */

document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we're on the Adobe Stock page
    const navBar = document.getElementById('asTabNav');
    if (!navBar) return;

    // --- Tab Navigation Setup ---
    const tabs = document.querySelectorAll('.as-tab-btn');
    const contents = document.querySelectorAll('.as-tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active from all
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.add('hidden'));

            // Add active to clicked
            tab.classList.add('active');
            const targetId = tab.getAttribute('data-target');
            document.getElementById(targetId).classList.remove('hidden');
        });
    });

    // --- Global Stats Variables ---
    let stats = {
        uploads: 0,
        keywordsGen: 0,
        palettesGen: 0
    };

    function updateStats() {
        document.getElementById('asTotalUploads').textContent = stats.uploads;
        document.getElementById('asKeywordsGen').textContent = stats.keywordsGen;
        document.getElementById('asPalettesGen').textContent = stats.palettesGen;
    }

    // --- Chart Initialization ---
    const ctx = document.getElementById('asMarketPulseChart');
    let pulseChart;
    if (ctx) {
        pulseChart = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['1h', '2h', '3h', '4h', '5h', '6h'],
                datasets: [{
                    label: 'Trend Volume',
                    data: [30, 45, 40, 60, 55, 80],
                    borderColor: '#3b82f6',
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                scales: {
                    x: { display: false },
                    y: { display: false }
                }
            }
        });

        // Simulate live data
        setInterval(() => {
            const data = pulseChart.data.datasets[0].data;
            data.shift();
            data.push(Math.floor(Math.random() * 50) + 40); // 40-90
            pulseChart.update('none');
        }, 3000);
    }

    // --- Toast / Copy Helpers ---
    function copyToClipboard(elementId) {
        const el = document.getElementById(elementId);
        if (!el || !el.value) return;
        navigator.clipboard.writeText(el.value).then(() => {
            showToast('Copied to clipboard!', 'success');
        }).catch(() => {
            showToast('Failed to copy', 'error');
        });
    }

    // Attach copy buttons
    document.querySelectorAll('.as-copy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetId = e.target.getAttribute('data-copy');
            copyToClipboard(targetId);
        });
    });

    // --- 1. Creative Brief Logic ---
    const btnGenBrief = document.getElementById('asGenBriefBtn');
    if (btnGenBrief) {
        btnGenBrief.addEventListener('click', async () => {
            const category = document.getElementById('asBriefCat').value;
            const style = document.getElementById('asBriefStyle').value;

            if (!category || !style) {
                return showToast('Please select category and style', 'warning');
            }

            btnGenBrief.disabled = true;
            btnGenBrief.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Generating Brief...';

            try {
                console.log('[Adobe Stock AI] Generating Brief for:', category, style);
                const response = await fetch('/api/ai/generate', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        messages: [
                            { role: 'system', content: 'You are an Adobe Stock creative director. Provide a JSON response directly without markdown codeblocks.' },
                            { role: 'user', content: `Generate a creative brief for a stock image of ${category} in ${style} style. Return ONLY a valid JSON object with keys: "titles", "desc", "keys", "tips". Use plain text strings.` }
                        ]
                    })
                });

                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'API Error');

                let resultText = data.data.content;
                let parsed;
                try {
                    // Strip markdown if AI returns it despite instructions
                    resultText = resultText.replace(/^```json/g, '').replace(/```$/g, '').trim();
                    parsed = JSON.parse(resultText);
                } catch (e) {
                    parsed = {
                        titles: `1. Stunning ${style} concept of ${category}\n2. Commercial ${category} background in ${style} style\n3. High-end ${style} visualization representing ${category}`,
                        desc: `Create a compelling visual representing ${category}. Focus on incorporating ${style} elements. Use a dynamic composition with dramatic lighting. Ensure there is negative space for copy.`,
                        keys: `${category}, ${style}, commercial, background, concept, modern, design, illustration, visual, creative`,
                        tips: `- Use trending color palettes suited for ${category}\n- Ensure 4K resolution (at least 4500px on long edge)\n- Avoid recognizable faces/logos if no release\n- Upload as JPG/EPS per requirement`
                    };
                }

                document.getElementById('asBriefTitles').value = parsed.titles || '';
                document.getElementById('asBriefDesc').value = parsed.desc || '';
                document.getElementById('asBriefKeywords').value = parsed.keys || '';
                document.getElementById('asBriefTips').value = parsed.tips || '';

                document.getElementById('asBriefOutput').classList.remove('hidden');
                showToast('Creative Brief Generated', 'success');
            } catch (err) {
                console.error(err);
                showToast('Failed to generate brief', 'error');
            } finally {
                btnGenBrief.disabled = false;
                btnGenBrief.innerHTML = 'Generate Creative Brief';
            }
        });
    }

    // --- 2. Keyword Research Logic ---
    const btnGenKw = document.getElementById('asGenKwBtn');
    if (btnGenKw) {
        btnGenKw.addEventListener('click', async () => {
            const base = document.getElementById('asKwBase').value.trim();
            if (!base) return showToast('Enter a base subject', 'warning');

            btnGenKw.disabled = true;
            btnGenKw.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Analyzing Trends...';

            try {
                console.log('[Adobe Stock AI] Generating Keywords for:', base);
                const response = await fetch('/api/ai/generate', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        messages: [
                            { role: 'system', content: 'You are an SEO keyword expert for stock agencies. Output ONLY a comma separated list of words, no quotes, no markdown.' },
                            { role: 'user', content: `Generate 40 highly relevant, commercial keywords for a stock image of: ${base}` }
                        ]
                    })
                });

                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'API Error');

                const out = document.getElementById('asKwOutput');
                out.innerHTML = ''; // clear

                const rawKeywords = data.data.content.trim().replace(/^"|"$/g, '').split(',');
                const kws = rawKeywords.map(w => w.trim()).filter(w => w.length > 2);

                kws.forEach(kw => {
                    const span = document.createElement('span');
                    span.className = 'as-kw-badge';
                    span.textContent = kw;
                    // Click to copy individual
                    span.addEventListener('click', () => {
                        navigator.clipboard.writeText(kw);
                        showToast(`Copied: ${kw}`, 'info');
                    });
                    out.appendChild(span);
                });

                stats.keywordsGen += kws.length;
                updateStats();

            } catch (err) {
                console.error(err);
                showToast('Failed to generate keywords', 'error');
            } finally {
                btnGenKw.disabled = false;
                btnGenKw.innerHTML = 'Generate SEO Keywords';
            }
        });

        document.getElementById('asKwClearBtn').addEventListener('click', () => {
            document.getElementById('asKwBase').value = '';
            document.getElementById('asKwOutput').innerHTML = '<p class="text-gray-500 text-sm italic w-full text-center mt-8">Keywords will populate here...</p>';
        });

        document.getElementById('asKwCopyBtn').addEventListener('click', () => {
            const badges = document.querySelectorAll('.as-kw-badge');
            if (badges.length === 0) return;
            const arr = Array.from(badges).map(b => b.textContent);
            navigator.clipboard.writeText(arr.join(', '));
            showToast('Copied all keywords', 'success');
        });
    }

    // --- 3. Title Optimizer Logic ---
    const btnGenTitle = document.getElementById('asGenTitleBtn');
    if (btnGenTitle) {
        btnGenTitle.addEventListener('click', () => {
            const raw = document.getElementById('asTitleInput').value.trim();
            if (!raw) return showToast('Enter a raw description', 'warning');

            btnGenTitle.disabled = true;
            btnGenTitle.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Optimizing...';

            setTimeout(() => {
                const addSeo = document.getElementById('asTitleOptSeo').checked;
                const addEmo = document.getElementById('asTitleOptEmotional').checked;

                const outContainer = document.getElementById('asTitleOutput');
                outContainer.innerHTML = '';

                let prefixes = [''];
                if (addEmo) prefixes = ['Beautiful', 'Stunning', 'Incredible', 'High-quality', 'Premium'];

                let suffixes = [''];
                if (addSeo) suffixes = ['- Isolated Background', '- Vector Illustration', '- 4K Concept', '- Business Concept'];

                // Generate 3 variations
                for (let i = 0; i < 3; i++) {
                    const p = prefixes[Math.floor(Math.random() * prefixes.length)];
                    const s = suffixes[Math.floor(Math.random() * suffixes.length)];
                    const t = `${p} ${raw} ${s}`.trim();

                    const div = document.createElement('div');
                    div.className = 'bg-black/30 p-3 rounded-lg border border-white/5 flex items-center justify-between group';
                    div.innerHTML = `
                        <span class="text-sm text-gray-300 group-hover:text-white transition-colors">${t}</span>
                        <button class="text-gray-500 hover:text-indigo-400 focus:outline-none"><i class="fas fa-copy"></i></button>
                    `;
                    div.querySelector('button').addEventListener('click', () => {
                        navigator.clipboard.writeText(t);
                        showToast('Title copied!', 'success');
                    });
                    outContainer.appendChild(div);
                }

                btnGenTitle.disabled = false;
                btnGenTitle.innerHTML = 'Optimize Title';
            }, 800);
        });
    }

    // --- 4. Color Palette Logic ---
    const btnGenPalette = document.getElementById('asGenPaletteBtn');
    if (btnGenPalette) {
        btnGenPalette.addEventListener('click', () => {
            const baseHex = document.getElementById('asPaletteBase').value;

            btnGenPalette.disabled = true;
            btnGenPalette.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Calculating Colors...';

            setTimeout(() => {
                const colors = generateHarmonicColors(baseHex);

                const strip = document.getElementById('asPaletteStrip');
                const hexes = document.getElementById('asPaletteHexes');

                strip.innerHTML = '';
                hexes.innerHTML = '';

                colors.forEach(col => {
                    // Visual strip slice
                    const slice = document.createElement('div');
                    slice.className = 'h-full flex-1 transition-all duration-300 hover:flex-[1.5] cursor-pointer relative group';
                    slice.style.backgroundColor = col;

                    // Click slice to copy
                    slice.addEventListener('click', () => {
                        navigator.clipboard.writeText(col);
                        showToast(`Copied ${col}`, 'info');
                    });

                    strip.appendChild(slice);

                    // Text code below
                    const hexDiv = document.createElement('div');
                    hexDiv.className = 'font-mono text-xs text-gray-400 py-2 bg-gray-900/50 rounded cursor-pointer hover:bg-gray-800 transition-colors border border-white/5';
                    hexDiv.textContent = col;
                    hexDiv.addEventListener('click', () => {
                        navigator.clipboard.writeText(col);
                        showToast(`Copied ${col}`, 'info');
                    });
                    hexes.appendChild(hexDiv);
                });

                document.getElementById('asPaletteContainer').classList.remove('hidden');

                stats.palettesGen++;
                updateStats();

                btnGenPalette.disabled = false;
                btnGenPalette.innerHTML = 'Generate Hex Palette';
            }, 600);
        });
    }

    function generateHarmonicColors(base) {
        // very basic harmonic generation for visual demo
        const rgb = hexToRgb(base);
        const res = [base];

        for (let i = 1; i < 5; i++) {
            const newR = Math.min(255, Math.max(0, rgb.r + (i * 30 * (Math.random() > 0.5 ? 1 : -1))));
            const newG = Math.min(255, Math.max(0, rgb.g + (i * 20 * (Math.random() > 0.5 ? 1 : -1))));
            const newB = Math.min(255, Math.max(0, rgb.b + (i * 40 * (Math.random() > 0.5 ? 1 : -1))));
            res.push(rgbToHex(Math.round(newR), Math.round(newG), Math.round(newB)));
        }
        return res;
    }

    function hexToRgb(hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }

    function rgbToHex(r, g, b) {
        return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1).toUpperCase();
    }

    // --- 5. Batch File / ZIP Logic ---
    const dropZone = document.getElementById('asDropZone');
    const fileInput = document.getElementById('asBatchFileInput');
    const btnZip = document.getElementById('asBatchZipBtn');
    const btnClearZip = document.getElementById('asBatchClearBtn');
    const previewContainer = document.getElementById('asBatchPreview');

    let queuedFiles = [];

    if (dropZone) {
        dropZone.addEventListener('click', () => fileInput.click());

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('as-drop-active');
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.classList.remove('as-drop-active');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('as-drop-active');
            handleFiles(e.dataTransfer.files);
        });

        fileInput.addEventListener('change', (e) => {
            handleFiles(e.target.files);
        });
    }

    function handleFiles(files) {
        if (!files || files.length === 0) return;

        const prefix = document.getElementById('asBatchPrefix').value.trim();
        const baseName = prefix ? prefix.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'adobe_stock_asset';

        Array.from(files).forEach((file, index) => {
            const ext = file.name.split('.').pop().toLowerCase();
            const allowed = ['jpg', 'jpeg', 'png', 'svg', 'eps', 'ai'];
            if (allowed.includes(ext)) {
                const idxStr = (queuedFiles.length + 1).toString().padStart(3, '0');
                const newName = `${baseName}_${idxStr}.${ext}`;

                queuedFiles.push({
                    originalFile: file,
                    originalName: file.name,
                    newName: newName,
                    ext: ext
                });
            }
        });

        updateBatchUI();
    }

    function updateBatchUI() {
        document.getElementById('asBatchCount').textContent = queuedFiles.length;

        const extSet = new Set(queuedFiles.map(f => f.ext.toUpperCase()));
        document.getElementById('asBatchTypes').textContent = extSet.size > 0 ? Array.from(extSet).join(', ') : '-';

        btnZip.disabled = queuedFiles.length === 0;
        btnClearZip.disabled = queuedFiles.length === 0;

        previewContainer.innerHTML = '';
        queuedFiles.forEach(f => {
            const div = document.createElement('div');
            div.className = 'as-file-list-item justify-between';
            div.innerHTML = `
                <div class="flex items-center overflow-hidden">
                    <span class="as-file-ext text-[10px] uppercase">${f.ext}</span>
                    <span class="text-gray-500 line-through mr-2 truncate max-w-[100px]" title="${f.originalName}">${f.originalName}</span>
                    <i class="fas fa-arrow-right text-teal-500 mx-2 text-[10px]"></i>
                    <span class="text-gray-200 font-semibold truncate" title="${f.newName}">${f.newName}</span>
                </div>
                <span class="text-gray-500 text-[10px]">${(f.originalFile.size / 1024).toFixed(1)} KB</span>
            `;
            previewContainer.appendChild(div);
        });
    }

    if (btnClearZip) {
        btnClearZip.addEventListener('click', () => {
            queuedFiles = [];
            fileInput.value = '';
            document.getElementById('asBatchPrefix').value = '';
            updateBatchUI();
        });
    }

    if (btnZip) {
        btnZip.addEventListener('click', async () => {
            if (queuedFiles.length === 0) return;

            btnZip.disabled = true;
            btnZip.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Packaging Archive...';

            // ============ PRODUCTION-READY: Bulletproof Title Formatter (UPDATED) ============
            // Applies Sentence Case, strips trailing punctuation, AND removes leading articles
            // Strips trailing hyphens, dots, and extra whitespace for clean output
            const formatTitleToSentenceCase = (text) => {
                if (!text || text.length === 0) return '';
                
                // Remove trailing hyphens, dots, commas, and extra spaces
                const cleaned = text
                    .trim()
                    .replace(/[\-\.,;:!?]*\s*$/, '') // Strip trailing punctuation
                    .trim();
                
                if (cleaned.length === 0) return '';
                
                // ============ NEW: Remove leading articles ('A', 'An', 'The') - Case Insensitive ============
                // Strip 'A ', 'An ', 'The ' from the very beginning
                // This improves SEO for stock photography (avoid articles in titles)
                const noArticles = cleaned.replace(/^(a|an|the)\s+/i, '').trim();
                
                // Ensure final result is not empty
                const finalText = noArticles.length > 0 ? noArticles : cleaned;
                
                // Sentence case: capitalize first letter, lowercase the rest
                const firstChar = finalText.charAt(0).toUpperCase();
                const rest = finalText.slice(1).toLowerCase();
                return firstChar + rest;
            };

            // ============ PRODUCTION-READY: Robust Keyword Processing (SEO OPTIMIZED) ============
            // Extracts core words from title, cleans Ollama keywords, removes articles, deduplicates, and limits to 50
            const processKeywords = (rawKeywords, cleanTitle) => {
                if (!rawKeywords || typeof rawKeywords !== 'string') {
                    return '';
                }

                // ============ STEP 1: Extract Core Words from Clean Title ============
                // Split title into words, remove stop words, lowercase
                const stopWords = new Set([
                    'a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'is', 'are',
                    'and', 'or', 'but', 'as', 'by', 'with', 'from', 'of', 'up', 'about',
                    'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
                    'can', 'could', 'may', 'might', 'must', 'shall', 'should', 'will',
                    'would', 'it', 'its', 'that', 'this', 'what', 'which', 'who', 'whom'
                ]);

                const titleWords = cleanTitle
                    .toLowerCase()
                    .split(/\s+/)
                    .filter(word => word.length > 0 && !stopWords.has(word));

                // ============ STEP 2: Split Ollama Keywords by Commas ============
                const rawKeywordArray = rawKeywords
                    .split(',')
                    .map(kw => kw.trim())
                    .filter(kw => kw.length > 0);

                // ============ STEP 3: Strip Leading Articles from Every Keyword ============
                // Remove 'a ', 'an ', 'the ' from the beginning of each keyword
                const cleanedKeywordArray = rawKeywordArray.map(kw => {
                    return kw
                        .replace(/^(a|an|the)\s+/i, '')  // Remove leading article
                        .trim();
                });

                // ============ STEP 4: Remove Long Phrases (more than 4 words) ============
                // Filter out multi-word phrases that are too long for single keywords
                const filterKeywordArray = cleanedKeywordArray.filter(kw => {
                    const wordCount = kw.split(/\s+/).length;
                    return wordCount <= 4;
                });

                // ============ STEP 5: Merge, Deduplicate & Limit to 50 ============
                // Create a Set to track unique keywords (case-insensitive)
                const keywordSet = new Set();
                
                // Add title words first (highest priority)
                titleWords.forEach(word => {
                    if (word.length > 0) {
                        keywordSet.add(word.toLowerCase());
                    }
                });
                
                // Add cleaned Ollama keywords (secondary priority)
                filterKeywordArray.forEach(kw => {
                    const lowerKw = kw.toLowerCase().trim();
                    if (lowerKw.length > 0) {
                        keywordSet.add(lowerKw);
                    }
                });

                // Convert Set back to array and slice to max 50 keywords
                const finalKeywords = Array.from(keywordSet).slice(0, 50);

                // ============ STEP 6: Return Clean CSV-Safe String ============
                return finalKeywords.join(', ');
            };

            // ============ FIX 1: Sanitize Filename (Client Requirement - Spaced Titles) ============
            // Keeps the exact Title with spaces and capitalization intact
            // Only removes invalid OS filename characters: < > : " / \ | ? *
            // Does NOT replace spaces with hyphens - maintains readability for contributors
            const sanitizeFilename = (title) => {
                if (!title || title.length === 0) return 'asset';
                
                // Remove only invalid OS filename characters
                // Invalid chars: < > : " / \ | ? *
                const sanitized = title
                    .replace(/[<>:"/\\|?*]/g, '')      // Remove invalid OS filename characters
                    .replace(/\s+/g, ' ')               // Normalize multiple spaces to single space
                    .trim();
                
                return sanitized.length > 0 ? sanitized : 'asset';
            };

            // ============ PRODUCTION-READY: Deep AI Prompting for Microstock ============
            // Constructs expert-level Ollama prompts with dynamic subject/color/style extraction
            const buildMicrostockPrompt = (globalContext, fileNameHint) => {
                const systemPrompt = `You are an expert microstock metadata reviewer with deep knowledge of Adobe Stock trends. Analyze the image context and generate:
1. A HIGHLY COMMERCIAL, COMPLETE SENTENCE title (MAX 70 chars, no truncation, full thought)
2. Exactly 45-50 powerful, search-optimized keywords

CRITICAL RULES:
- Title MUST be a natural English sentence WITHOUT dashes, hyphens, or artificial separators
- Title MUST mention: primary subject, visual attributes (color, style, mood), and context
- DO NOT cut off titles mid-sentence
- Extract: Primary Subjects, Visual Style (3D render, flat vector, realistic, isolated), Color Palette (vibrant, neon, pastel, dark), Mood/Lighting (dramatic, soft, bright, moody)
- Keywords must be high-volume, commercial terms related to Adobe Stock

Output STRICTLY as valid JSON: {"title": "string (max 70 chars, complete)", "keywords": "comma,separated,list"}`;

                const userPrompt = `Global Concept: "${globalContext}"
Filename Hint: "${fileNameHint}"

Infer from these clues:
- PRIMARY SUBJECTS: What is the main object/scenario?
- VISUAL STYLE: Is it 3D, flat design, photography, vector, illustration?
- COLOR & MOOD: What colors dominate? Vibrant, dark, pastel, neon, soft, dramatic?
- COMMERCIAL APPEAL: How would a designer/marketer search for this?

Generate a complete, commercial-grade title and 45-50 keywords.`;

                return { systemPrompt, userPrompt };
            };

            try {
                if (typeof JSZip === 'undefined') {
                    throw new Error("JSZip library not loaded. Ensure script is included in layout.");
                }

                const zip = new JSZip();
                const globalPrefix = document.getElementById('asBatchPrefix').value.trim();

                // Initialize CSV lines with headers
                const csvLines = ['Filename,Title,Keywords,Category,Releases'];

                for (let i = 0; i < queuedFiles.length; i++) {
                    const f = queuedFiles[i];

                    // Update UI text for user feedback
                    btnZip.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> Processing ${f.originalName}...`;

                    // Extract meaningful filename hint for AI context
                    const fileNameHint = f.originalName
                        .replace(/\.[^/.]+$/, "")     // Remove extension
                        .replace(/[-_]/g, " ")         // Replace hyphens/underscores with spaces
                        .trim();

                    // Build expert-level prompts
                    const { systemPrompt, userPrompt } = buildMicrostockPrompt(globalPrefix, fileNameHint);

                    // Initialize fallback values
                    let title = `${globalPrefix} ${fileNameHint}`.trim();
                    let keywords = `${globalPrefix}, ${fileNameHint}, design, stock, concept`;

                    try {
                        // Call Ollama with deep AI prompting
                        const aiResponse = await fetch('http://localhost:11434/api/generate', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                model: "llama3",
                                prompt: `${systemPrompt}\n\n${userPrompt}`,
                                format: "json",
                                stream: false,
                                options: {
                                    temperature: 0.7,
                                    top_p: 0.9,
                                    num_predict: 256
                                }
                            })
                        });

                        if (aiResponse.ok) {
                            const aiData = await aiResponse.json();
                            try {
                                // Bulletproof JSON parsing with fallback
                                const parsed = JSON.parse(aiData.response);
                                
                                if (parsed.title && typeof parsed.title === 'string' && parsed.title.length > 0) {
                                    // Apply bulletproof title formatting
                                    title = formatTitleToSentenceCase(parsed.title);
                                }
                                
                                if (parsed.keywords && typeof parsed.keywords === 'string' && parsed.keywords.length > 0) {
                                    // ============ FIX 2 (AGGRESSIVE): Remove ALL leading non-alphanumeric characters ============
                                    // Sanitize leading commas, spaces, hyphens, dashes, and any special chars
                                    keywords = parsed.keywords
                                        .trim()
                                        .replace(/^[^a-zA-Z0-9]+/, '')     // Remove ALL leading non-alphanumeric chars
                                        .trim();
                                }
                            } catch (parseErr) {
                                console.warn(`JSON parse failed for ${f.originalName}, using fallback. Error:`, parseErr);
                                // Use formatted fallback
                                title = formatTitleToSentenceCase(title);
                            }
                        }
                    } catch (fetchErr) {
                        console.warn(`Ollama API failed for ${f.originalName}, using fallback.`, fetchErr);
                        // Use formatted fallback
                        title = formatTitleToSentenceCase(title);
                    }

                    // ============ FIX 1: Generate Filename from Title (No Hyphens, Exact Title) ============
                    // This filename is the SINGLE SOURCE OF TRUTH for both ZIP filename and CSV
                    // Uses the exact formatted Title with spaces and capitalization
                    const finalFileName = `${sanitizeFilename(title)}.${f.ext}`;
                    
                    // Validate filename is not empty (safety check)
                    if (!finalFileName || finalFileName === `.${f.ext}`) {
                        console.warn(`Empty filename generated for title "${title}", using fallback filename`);
                        const fallbackName = sanitizeFilename(globalPrefix);
                        const safeFileName = (fallbackName && fallbackName.length > 0) ? fallbackName : `asset-${i.toString().padStart(3, '0')}`;
                        const safeFullName = `${safeFileName}.${f.ext}`;
                        
                        zip.file(safeFullName, f.originalFile);
                        const escapeCsv = (str) => `"${str.replace(/"/g, '""')}"`;
                        csvLines.push(`${safeFullName},${escapeCsv(title)},${escapeCsv(processKeywords(keywords, title))},21,`);
                    } else {
                        // ============ FIX 1: FLAWLESS SYNC: ZIP Filename & CSV Match Perfectly ============
                        // Add file to ZIP with sanitized title-based filename
                        zip.file(finalFileName, f.originalFile);

                        // Escape CSV values to handle quotes and special chars
                        const escapeCsv = (str) => `"${str.replace(/"/g, '""')}"`;

                        // Push to CSV: filename MUST match exactly what's in ZIP
                        csvLines.push(`${finalFileName},${escapeCsv(title)},${escapeCsv(processKeywords(keywords, title))},21,`);
                    }
                }

                btnZip.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Compiling ZIP...';

                // Add CSV metadata file to ZIP
                zip.file("metadata.csv", csvLines.join('\n'));

                // Generate ZIP blob and trigger download
                const blob = await zip.generateAsync({ type: "blob" });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `AdobeStock_Batch_${Date.now()}.zip`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                showToast('✓ Production-ready ZIP generated with SEO-optimized metadata!', 'success');

                stats.uploads += queuedFiles.length;
                updateStats();

                queuedFiles = [];
                updateBatchUI();

            } catch (err) {
                console.error('Critical ZIP generation error:', err);
                showToast('Failed to create ZIP: ' + err.message, 'error');
            } finally {
                btnZip.disabled = false;
                btnZip.innerHTML = 'Generate ZIP Archive';
            }
        });
    }

});
