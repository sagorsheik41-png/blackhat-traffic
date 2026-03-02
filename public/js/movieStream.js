/**
 * Movie Streaming Module - Sanitized & Enhanced
 * Features:
 * - Infinite scroll for movies/TV shows
 * - Clean modal viewer with fullscreen support
 * - Removed ALL external ads, popups, and redirects
 * - TMDB API integration only for safe content
 * 
 * CRITICAL: This script ONLY loads content from TMDB and approved streaming sources.
 * NO third-party ads, tracking scripts, or popups are allowed.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Configuration
    const TMDB_API_KEY = '10159c00fc96e4b27d44ad92a5d8c69a';
    const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
    const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
    
    // Streaming sources (ONLY verified, ad-free sources)
    const STREAMING_SOURCES = {
        vidsrc: { name: 'VidSrc', url: (id, type, season = 1, episode = 1) => 
            type === 'movie' 
                ? `https://vidsrc.me/embed/movie?tmdb=${id}`
                : `https://vidsrc.me/embed/tv?tmdb=${id}&season=${season}&episode=${episode}`
        }
    };

    // State
    const state = {
        currentPage: 1,
        currentType: 'movie', // 'movie' or 'tv'
        searchQuery: '',
        isLoading: false,
        hasMore: true,
        currentMediaCtx: null
    };

    // Elements
    const elements = {
        mediaGrid: document.getElementById('mediaGrid'),
        loadingState: document.getElementById('loadingState'),
        errorState: document.getElementById('errorState'),
        playerModal: document.getElementById('playerModal'),
        closePlayerBtn: document.getElementById('closePlayerBtn'),
        closeModalBg: document.getElementById('closeModalBg'),
        typeMovieBtn: document.getElementById('typeMovieBtn'),
        typeTvBtn: document.getElementById('typeTvBtn'),
        searchInput: document.getElementById('searchInput'),
        sourceSelector: document.getElementById('sourceSelector')
    };

    // Initialize
    init();

    function init() {
        setupEventListeners();
        loadMedia();
    }

    function setupEventListeners() {
        // Type selector
        elements.typeMovieBtn?.addEventListener('click', () => switchType('movie'));
        elements.typeTvBtn?.addEventListener('click', () => switchType('tv'));

        // Search
        elements.searchInput?.addEventListener('input', debounce((e) => {
            state.searchQuery = e.target.value;
            state.currentPage = 1;
            clearGrid();
            loadMedia();
        }, 500));

        // Modal controls
        elements.closePlayerBtn?.addEventListener('click', closeModal);
        elements.closeModalBg?.addEventListener('click', closeModal);

        // Source selector buttons
        document.querySelectorAll('.source-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.source-btn').forEach(b => b.classList.remove('bg-primary'));
                e.target.classList.add('bg-primary');
                updatePlayerSource();
            });
        });

        // Infinite scroll
        window.addEventListener('scroll', debounce(() => {
            if (shouldLoadMore()) {
                state.currentPage++;
                loadMedia();
            }
        }, 300));

        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !elements.playerModal.classList.contains('hidden')) {
                closeModal();
            }
            if (e.key === 'f' && !elements.playerModal.classList.contains('hidden')) {
                toggleFullscreen();
            }
        });
    }

    function switchType(type) {
        state.currentType = type;
        state.currentPage = 1;
        state.searchQuery = '';
        elements.searchInput.value = '';

        // Update button styles
        if (type === 'movie') {
            elements.typeMovieBtn.classList.add('bg-primary/20', 'border-primary/50');
            elements.typeTvBtn.classList.remove('bg-primary/20', 'border-primary/50');
        } else {
            elements.typeTvBtn.classList.add('bg-primary/20', 'border-primary/50');
            elements.typeMovieBtn.classList.remove('bg-primary/20', 'border-primary/50');
        }

        clearGrid();
        loadMedia();
    }

    async function loadMedia() {
        if (state.isLoading || !state.hasMore) return;

        state.isLoading = true;
        showLoadingState(true);

        try {
            let url;

            if (state.searchQuery) {
                // Search endpoint
                url = `${TMDB_BASE_URL}/search/${state.currentType}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(state.searchQuery)}&page=${state.currentPage}`;
            } else {
                // Discover endpoint
                const endpoint = state.currentType === 'movie' ? 'discover/movie' : 'discover/tv';
                url = `${TMDB_BASE_URL}/${endpoint}?api_key=${TMDB_API_KEY}&sort_by=popularity.desc&page=${state.currentPage}`;
            }

            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch media');

            const data = await response.json();
            const results = data.results || [];

            if (results.length === 0) {
                state.hasMore = false;
                if (state.currentPage === 1) {
                    showErrorState('No results found');
                }
                return;
            }

            renderMedia(results);
            showLoadingState(false);

        } catch (error) {
            console.error('[MovieStream] Error loading media:', error);
            showErrorState(error.message);
        } finally {
            state.isLoading = false;
        }
    }

    function renderMedia(results) {
        results.forEach(item => {
            const card = createMediaCard(item);
            elements.mediaGrid.appendChild(card);
        });
    }

    function createMediaCard(item) {
        const card = document.createElement('div');
        card.className = 'group cursor-pointer transform transition-all hover:scale-105';
        
        const posterPath = item.poster_path || item.backdrop_path;
        const title = item.title || item.name || 'Unknown Title';
        const year = (item.release_date || item.first_air_date || '').split('-')[0];
        const rating = (item.vote_average || 0).toFixed(1);

        card.innerHTML = `
            <div class="relative overflow-hidden rounded-xl shadow-lg shadow-black/50 bg-gray-800 aspect-video">
                <img src="${IMAGE_BASE_URL}${posterPath}" alt="${title}" 
                    class="w-full h-full object-cover group-hover:brightness-110 transition-all" 
                    onerror="this.src='https://via.placeholder.com/500x300?text=${encodeURIComponent(title)}'">
                
                <div class="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-all flex flex-col justify-end p-4">
                    <h3 class="font-bold text-white text-sm truncate">${title}</h3>
                    <p class="text-xs text-gray-300">${year}</p>
                    <div class="flex items-center gap-1 text-yellow-400 text-xs mt-2">
                        <i class="fas fa-star"></i>
                        <span>${rating}</span>
                    </div>
                    <button class="mt-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-4 rounded-lg transition-all">
                        <i class="fas fa-play mr-1"></i> Watch Now
                    </button>
                </div>
            </div>
        `;

        card.addEventListener('click', () => openModal(item));

        return card;
    }

    function openModal(item) {
        state.currentMediaCtx = {
            id: item.id,
            title: item.title || item.name,
            isMovie: state.currentType === 'movie',
            posterPath: item.poster_path || item.backdrop_path,
            year: (item.release_date || item.first_air_date || '').split('-')[0],
            rating: (item.vote_average || 0).toFixed(1),
            overview: item.overview || 'No description available',
            totalSeasons: item.number_of_seasons
        };

        // Update modal content
        document.getElementById('modalTitle').textContent = state.currentMediaCtx.title;
        document.getElementById('modalYear').innerHTML = `<i class="fas fa-calendar mr-1"></i> <span>${state.currentMediaCtx.year}</span>`;
        document.getElementById('modalRating').innerHTML = `<i class="fas fa-star mr-1"></i> <span>${state.currentMediaCtx.rating}</span>`;
        document.getElementById('modalType').textContent = state.currentType.toUpperCase();
        document.getElementById('modalOverview').textContent = state.currentMediaCtx.overview;

        // Show season/episode controls for TV
        const tvControls = document.getElementById('tvControls');
        if (tvControls) {
            tvControls.style.display = state.currentMediaCtx.isMovie ? 'none' : 'flex';
        }

        // Show modal
        elements.playerModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        // Load default source
        setTimeout(updatePlayerSource, 100);
    }

    function updatePlayerSource() {
        if (!state.currentMediaCtx) return;

        const player = document.getElementById('videoPlayer');
        const placeholder = document.getElementById('videoPlaceholder');

        if (!player) return;

        let embedUrl = '';
        const sourceKey = 'vidsrc'; // Use only verified source
        const { id, isMovie, totalSeasons } = state.currentMediaCtx;

        if (isMovie) {
            embedUrl = STREAMING_SOURCES.vidsrc.url(id, 'movie');
        } else {
            const season = parseInt(document.getElementById('seasonInput')?.value || 1);
            const episode = parseInt(document.getElementById('episodeInput')?.value || 1);
            embedUrl = STREAMING_SOURCES.vidsrc.url(id, 'tv', season, episode);
        }

        if (embedUrl) {
            placeholder.classList.add('hidden');
            player.src = embedUrl;
            player.classList.remove('opacity-0');
        }
    }

    function closeModal() {
        elements.playerModal.classList.add('hidden');
        document.body.style.overflow = '';
        const player = document.getElementById('videoPlayer');
        if (player) player.src = '';
        state.currentMediaCtx = null;
    }

    function toggleFullscreen() {
        const videoContainer = document.querySelector('#playerModal .aspect-video');
        if (!videoContainer) return;

        if (!document.fullscreenElement) {
            videoContainer.requestFullscreen().catch(err => {
                console.error('[MovieStream] Fullscreen error:', err);
                // Fallback: maximize modal
                document.getElementById('playerModal').style.zIndex = '9999';
            });
        } else {
            document.exitFullscreen();
        }
    }

    function shouldLoadMore() {
        if (state.isLoading || !state.hasMore) return false;

        const scrollPercent = (window.innerHeight + window.scrollY) / document.documentElement.scrollHeight;
        return scrollPercent > 0.7;
    }

    function clearGrid() {
        elements.mediaGrid.innerHTML = '';
        state.currentPage = 1;
        state.hasMore = true;
    }

    function showLoadingState(show) {
        if (show && elements.mediaGrid.children.length === 0) {
            elements.loadingState.classList.remove('hidden');
            elements.loadingState.classList.add('flex');
        } else {
            elements.loadingState.classList.add('hidden');
            elements.loadingState.classList.remove('flex');
        }
    }

    function showErrorState(message) {
        elements.errorState.classList.remove('hidden');
        document.getElementById('errorMessage').textContent = message;
    }

    // Utility function
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Export for inline script access
    window.closeModal = closeModal;
    window.updatePlayerSource = updatePlayerSource;
    window.toggleFullscreen = toggleFullscreen;
});
