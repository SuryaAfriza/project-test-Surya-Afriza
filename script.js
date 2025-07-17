document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const header = document.getElementById('main-header');
    const perPageSelect = document.getElementById('per-page-select');
    const sortBySelect = document.getElementById('sort-by-select');
    const postsGrid = document.getElementById('posts-grid');
    const paginationContainer = document.getElementById('pagination');
    const showingInfo = document.getElementById('showing-info');
    
    // CMS Elements
    const bannerElement = document.querySelector('.banner');
    const bannerTitle = document.querySelector('.banner-content h1');
    const bannerSubtitle = document.querySelector('.banner-content p');

    // State Management
    let state = {
        page: 1,
        itemsPerPage: 10,
        sortBy: '-published_at',
        totalItems: 0
    };

    // API Configuration
    const API_BASE_URL = 'https://suitmedia-backend.suitdev.com/api/ideas';
    const CMS_CONFIG_URL = 'config.json'; // File CMS untuk banner

    // Core Functions

    /**
      Load banner configuration from CMS
     */
    async function loadBannerConfig() {
        try {
            const response = await fetch(CMS_CONFIG_URL);
            const { banner } = await response.json();
            
            // Apply CMS settings
            bannerElement.style.backgroundImage = `url(${banner.image_url})`;
            bannerTitle.textContent = banner.title;
            bannerSubtitle.textContent = banner.subtitle;
            bannerElement.style.clipPath = banner.clip_path;
            
            // Parallax effect
            window.addEventListener('scroll', updateParallax);
        } catch (error) {
            console.error("Failed to load banner config:", error);
            // Fallback values
            bannerTitle.textContent = "Ideas";
            bannerSubtitle.textContent = "Where all our great things begin";
        }
    }

    /**
     * Update parallax effect on scroll
     */
    function updateParallax() {
        bannerElement.style.backgroundPositionY = `${window.scrollY * 0.5}px`;
    }

    /**
     * Initialize state from localStorage or URL
     */
    function loadState() {
        const savedState = localStorage.getItem('postState');
        if (savedState) {
            Object.assign(state, JSON.parse(savedState));
        }

        const params = new URLSearchParams(window.location.search);
        state.page = parseInt(params.get('page')) || state.page;
        state.itemsPerPage = parseInt(params.get('size')) || state.itemsPerPage;
        state.sortBy = params.get('sort') || state.sortBy;

        perPageSelect.value = state.itemsPerPage;
        sortBySelect.value = state.sortBy;
    }

    /**
     * Save state to localStorage and URL
     */
    function saveState() {
        localStorage.setItem('postState', JSON.stringify(state));
        
        const params = new URLSearchParams();
        params.set('page', state.page);
        params.set('size', state.itemsPerPage);
        params.set('sort', state.sortBy);
        window.history.replaceState({}, '', `?${params.toString()}`);
    }

    /**
     * Header scroll behavior
     */
    function setupHeaderScroll() {
        let lastScrollY = window.scrollY;
        
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                header.classList.add('header-scrolled');
            } else {
                header.classList.remove('header-scrolled');
            }

            if (lastScrollY < window.scrollY && window.scrollY > 100) {
                header.classList.add('header-hidden');
            } else {
                header.classList.remove('header-hidden');
            }
            lastScrollY = window.scrollY;
        });
    }

    /**
     * Fetch posts from API
     */
    async function fetchPosts() {
        postsGrid.innerHTML = '<div class="loading">Loading posts...</div>';
        
        const API_URL = `${API_BASE_URL}?page[number]=${state.page}&page[size]=${state.itemsPerPage}&append[]=small_image&append[]=medium_image&sort=${state.sortBy}`;

        try {
            const response = await fetch(API_URL, {
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const { data, meta } = await response.json();
            state.totalItems = meta.total;
            
            renderPosts(data);
            renderPagination(meta);
            updateShowingInfo(meta);
        } catch (error) {
            console.error("Failed to fetch posts:", error);
            postsGrid.innerHTML = '<div class="error">Failed to load posts. Please try again.</div>';
        }
    }

    /**
     * Render posts to grid
     */
    function renderPosts(posts) {
        postsGrid.innerHTML = '';

        if (posts.length === 0) {
            postsGrid.innerHTML = '<div class="empty">No posts found.</div>';
            return;
        }

        const fragment = document.createDocumentFragment();
        
        posts.forEach(post => {
            const card = document.createElement('div');
            card.className = 'card';
            
            const date = new Date(post.published_at);
            const formattedDate = date.toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            }).toUpperCase();

            card.innerHTML = `
                <div class="card-thumbnail">
                    <img src= "https://picsum.photos/400/250?random=${post.id}" alt="${post.title}" loading="lazy">
                </div>
                <div class="card-content">
                    <p class="card-date">${formattedDate}</p>
                    <h3 class="card-title">${post.title}</h3>
                </div>
            `;
            
            fragment.appendChild(card);
        });
        
        postsGrid.appendChild(fragment);
    }

    /**
     * Render pagination controls
     */
    function renderPagination(meta) {
        paginationContainer.innerHTML = '';
        
        if (meta.last_page <= 1) return;

        const prevButton = createPageButton('‹', state.page - 1, state.page === 1);
        paginationContainer.appendChild(prevButton);

        let startPage = Math.max(1, state.page - 2);
        let endPage = Math.min(meta.last_page, state.page + 2);

        if (startPage > 1) {
            paginationContainer.appendChild(createPageButton(1, 1));
            if (startPage > 2) paginationContainer.appendChild(createPageButton('...', null, true));
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationContainer.appendChild(createPageButton(
                i, i, false, i === state.page
            ));
        }

        if (endPage < meta.last_page) {
            if (endPage < meta.last_page - 1) paginationContainer.appendChild(createPageButton('...', null, true));
            paginationContainer.appendChild(createPageButton(meta.last_page, meta.last_page));
        }

        const nextButton = createPageButton('›', state.page + 1, state.page === meta.last_page);
        paginationContainer.appendChild(nextButton);
    }

    /**
     * Create pagination button
     */
    function createPageButton(text, page, disabled = false, active = false) {
        const button = document.createElement('button');
        button.textContent = text;
        button.disabled = disabled;
        
        if (active) button.classList.add('active');
        if (page) {
            button.addEventListener('click', () => {
                state.page = page;
                saveState();
                fetchPosts();
            });
        }
        
        return button;
    }

    /**
     * Update showing info text
     */
    function updateShowingInfo(meta) {
        showingInfo.textContent = `Showing ${meta.from} - ${meta.to} of ${meta.total}`;
    }

    // Event Listeners
    perPageSelect.addEventListener('change', (e) => {
        state.itemsPerPage = parseInt(e.target.value);
        state.page = 1;
        saveState();
        fetchPosts();
    });

    sortBySelect.addEventListener('change', (e) => {
        state.sortBy = e.target.value;
        state.page = 1;
        saveState();
        fetchPosts();
    });

    // Initialization
    loadState();
    loadBannerConfig(); // Load banner from CMS
    setupHeaderScroll();
    fetchPosts();
});