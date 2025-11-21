/**
 * Trendyol Reviews Widget for WooCommerce
 * Optimized for WordPress & Elementor
 * Version: 2.0
 */
(function () {
  'use strict';

  // Configuration
  const scriptEl = document.currentScript || document.querySelector('script[src*="woocommerce-snippet"]');
  const origin = scriptEl ? new URL(scriptEl.src).origin : window.location.origin;

  // Allow override from window.TRENDYOL_CONFIG
  const defaultConfig = {
    API_BASE_URL: `${origin}/api`,
    CONTAINER_ID: 'trendyol-reviews-container',
    CSS_URL: `${origin}/static/trendyol.css`
  };

  const CONFIG = window.TRENDYOL_CONFIG ? { ...defaultConfig, ...window.TRENDYOL_CONFIG } : defaultConfig;

  // Global state
  const state = {
    data: null,
    comments: [],
    allComments: [],
    loading: false,
    hasMore: true,
    page: 1,
    searchTerm: '',
    sortOption: 'recommended',
    showSortDropdown: false,
    modalOpen: false,
    currentPhotoIndex: 0,
    currentCommentIndex: 0,
    galleryScrolling: false,
    galleryAllPhotos: [],
    galleryLoadedCount: 11,
    container: null
  };

  // Utility functions
  const utils = {
    getOptimizedImageUrl(url, size = 300) {
      if (!url || typeof url !== 'string') return url;
      if (url.includes('cdn.dsmcdn.com') && !url.includes('/mnresize/')) {
        return url.replace('https://cdn.dsmcdn.com/', `https://cdn.dsmcdn.com/mnresize/${size}/${size}/`);
      }
      return url;
    },

    parseTurkishDate(dateStr) {
      if (!dateStr) return new Date(0);

      const monthMap = {
        'Ocak': 0, 'Şubat': 1, 'Mart': 2, 'Nisan': 3, 'Mayıs': 4, 'Haziran': 5,
        'Temmuz': 6, 'Ağustos': 7, 'Eylül': 8, 'Ekim': 9, 'Kasım': 10, 'Aralık': 11
      };

      if (dateStr.includes('.')) {
        const parts = dateStr.trim().split('.');
        if (parts.length === 3) {
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1;
          const year = parseInt(parts[2]);
          if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
            return new Date(year, month, day);
          }
        }
      }

      const parts = dateStr.trim().split(' ');
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = monthMap[parts[1]];
        const year = parseInt(parts[2]);
        if (!isNaN(day) && month !== undefined && !isNaN(year)) {
          return new Date(year, month, day);
        }
      }

      return new Date(dateStr);
    },

    createStarRating(rating) {
      console.log('Creating stars for rating:', rating);
      const numericRating = parseFloat(rating) || 0;
      return '★★★★★'.split('').map((star, i) =>
        `<span style="color: ${i < numericRating ? '#FFD700' : '#D1D5DB'};">${star}</span>`
      ).join('');
    },

    debounce(func, wait) {
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
  };

  // API functions
  const api = {
    async fetchReviews(sku) {
      try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/reviews?sku=${encodeURIComponent(sku)}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
      } catch (error) {
        console.error('Error loading reviews:', error);
        return null;
      }
    }
  };

  // Data processing
  const dataProcessor = {
    filterAndSort(comments, searchTerm, sortOption) {
      let filtered = [...comments];

      if (searchTerm.trim()) {
        const search = searchTerm.toLowerCase();
        filtered = filtered.filter(c =>
          c.comment?.toLowerCase().includes(search) ||
          c.user?.toLowerCase().includes(search) ||
          c.seller?.toLowerCase().includes(search)
        );
      }

      filtered.sort((a, b) => {
        switch (sortOption) {
          case 'newest':
            return utils.parseTurkishDate(b.date || '').getTime() - utils.parseTurkishDate(a.date || '').getTime();
          case 'oldest':
            return utils.parseTurkishDate(a.date || '').getTime() - utils.parseTurkishDate(b.date || '').getTime();
          case 'highest':
            return (b.rating || 0) - (a.rating || 0);
          case 'lowest':
            return (a.rating || 0) - (b.rating || 0);
          default:
            return 0;
        }
      });

      return filtered;
    },

    paginate(comments, page, limit = 5) {
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      return {
        items: comments.slice(0, endIndex),
        hasMore: endIndex < comments.length
      };
    }
  };

  // UI Renderer
  const renderer = {
    renderMain() {
      if (!state.container || !state.data) return;

      const sortOptions = [
        { value: 'recommended', label: 'Önerilen Sıralama' },
        { value: 'newest', label: 'Yeniden Eskiye' },
        { value: 'oldest', label: 'Eskiden Yeniye' },
        { value: 'highest', label: 'Artan Puan' },
        { value: 'lowest', label: 'Azalan Puan' }
      ];

      state.container.innerHTML = `
        <div class="bg-white rounded-lg shadow-sm border">
          ${this.renderHeader(sortOptions)}
          ${this.renderGallery()}
          <div id="reviews-section" class="reviews-section divide-y">
            ${this.renderComments()}
            ${this.renderLoadMore()}
          </div>
        </div>
      `;

      eventManager.attachMainListeners();
    },

    renderHeader(sortOptions) {
      return `
        <div class="p-6 border-b">
          <div class="reviews-header">
            <div class="reviews-header-left">
              <div class="rating-row">
                <span class="rating-value rating-emphasis">${state.data?.product?.average_score ?? '4.6'}</span>
                <div class="rating-stars rating-stars-emphasis">${utils.createStarRating(Math.floor(state.data?.product?.average_score || 4.6))}</div>
              </div>
              <div class="meta-row">
                <span class="font-medium">${state.comments.length}</span> Değerlendirme
                <span class="mx-2">•</span>
                <span class="font-medium">${state.data?.product?.total_comment_count ?? '0'}</span> Yorum
              </div>
            </div>
            <div class="reviews-header-right">
              <img id="trendyol-logo" src="https://dukkan.madetoll.com.tr/wp-content/uploads/2025/11/trendyollogo.svg" alt="Trendyol" style="width: 200px; height: auto;">
            </div>
          </div>
          
          <div class="search-filter-container" style="display: flex; flex-direction: column; gap: 1rem;">
            <style>
              @media (min-width: 769px) {
                .search-filter-container {
                  flex-direction: row !important;
                }
                .search-filter-container .search-input-wrapper {
                  flex: 0 0 70% !important;
                  width: 70% !important;
                }
                .search-filter-container .sort-button-wrapper {
                  flex: 0 0 30% !important;
                  width: 30% !important;
                }
              }
              @media (max-width: 768px) {
                .search-filter-container {
                  flex-direction: column !important;
                }
                .search-filter-container .search-input-wrapper,
                .search-filter-container .sort-button-wrapper {
                  width: 100% !important;
                }
              }
            </style>
            <div class="search-input-wrapper relative">
              <input id="search-input" class="w-full border border-gray-300 rounded-lg px-4 py-2 pl-10 text-sm" 
                     placeholder="Değerlendirmelerde Ara" value="${state.searchTerm}">
              <svg class="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div class="sort-button-wrapper relative">
              <button id="sort-btn" class="flex items-center justify-center gap-2 text-sm px-3 py-2 border border-orange-500 text-orange-500 rounded-lg hover:bg-orange-50 w-full">
                <span>${sortOptions.find(opt => opt.value === state.sortOption)?.label}</span>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              ${state.showSortDropdown ? `
                <div id="sort-dropdown" class="absolute top-full left-0 sm:right-0 sm:left-auto mt-1 bg-white border border-gray-200 rounded-lg shadow-lg w-full sm:min-w-48" style="z-index: 9999;">
                  <div class="py-1">
                    ${sortOptions.map(option => `
                      <button class="sort-option w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${state.sortOption === option.value ? 'text-orange-500 bg-orange-50 active' : 'text-gray-700'}" 
                              data-value="${option.value}">
                        ${state.sortOption === option.value ? '<svg class="tick-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
                        <span>${option.label}</span>
                      </button>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    },

    renderGallery() {
      // Get all photos from ALL comments (not just filtered ones)
      const allPhotos = Array.from(new Set(
        (state.data?.comments || []).flatMap(c => c.photos || [])
      ));

      if (allPhotos.length === 0) return '';

      state.galleryAllPhotos = allPhotos;
      if (!state.galleryLoadedCount || state.galleryLoadedCount < 1) {
        state.galleryLoadedCount = 11;
      }
      const visiblePhotos = allPhotos.slice(0, state.galleryLoadedCount);

      return `
        <div class="p-6 border-b">
          <div class="flex items-center justify-between mb-4">
            <h3 class="photo-reviews-title font-medium text-gray-900">Fotoğraflı Değerlendirmeler (${state.data?.product?.total_comment_count || state.data?.comments?.length || 0})</h3>
          </div>
          
          <div class="relative">
            <button class="gallery-nav-btn gallery-nav-btn-overlay left" data-direction="prev" aria-label="Önceki">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <button class="gallery-nav-btn gallery-nav-btn-overlay right" data-direction="next" aria-label="Sonraki">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
            <div class="gallery-fade-left"></div>
            <div class="gallery-fade-right"></div>
            
            <div class="gallery-container flex gap-3 overflow-x-auto scrollbar-hide pb-2 scroll-smooth">
              ${visiblePhotos.map(photo => `
                <div class="gallery-photo-item flex-shrink-0 bg-black rounded-lg border hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden group" 
                     data-photo="${photo}">
                  <img src="${utils.getOptimizedImageUrl(photo, 300)}" alt="" 
                       style="width: 100%; height: 100%; object-fit: cover;" loading="lazy">
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    },

    renderComments() {
      if (state.comments.length === 0) {
        return `
          <div class="p-6 text-center text-gray-500">
            <p>Arama kriterlerinize uygun yorum bulunamadı.</p>
          </div>
        `;
      }

      return state.comments.map(comment => `
        <div class="review-card p-6 border-b">
          <div class="review-header flex items-center gap-3 mb-3">
            <div class="review-stars flex">
              ${utils.createStarRating(comment.rating)}
            </div>
            <div class="review-details text-sm text-gray-600">
              <span class="review-user font-medium">${comment.user || '****'}</span>
              <span class="divider mx-2">•</span>
              <span class="review-date">${comment.date || ''}</span>
            </div>
          </div>
          
          <p class="review-body text-gray-800 mb-4 leading-relaxed">
            ${comment.comment || ''}
          </p>
          
          ${comment.photos && comment.photos.length > 0 ? `
            <div class="review-photos flex gap-2 mb-4 flex-wrap">
              ${comment.photos.slice(0, 6).map(photo => `
                <div class="review-photo bg-black border hover:shadow-md transition-shadow cursor-pointer overflow-hidden" 
                     style="width: 150px; height: 150px; flex-shrink: 0; border-radius: 5px;"
                     data-photo="${photo}">
                  <img src="${utils.getOptimizedImageUrl(photo, 300)}" alt="" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
              `).join('')}
            </div>
          ` : ''}
          
          <div class="review-seller text-sm mb-3" style="color: #666;">
            <span class="font-medium">Madetoll by TazeKrem</span> satıcısından alındı
          </div>
          
          ${comment.user_info ? `
            <div class="review-user-extra text-sm text-gray-500 mb-3">
              <span class="height">Boy: ${comment.user_info.height || ''}</span>
              <span class="weight mx-3">Kilo: ${comment.user_info.weight || ''}</span>
            </div>
          ` : ''}
        </div>
      `).join('');
    },

    renderLoadMore() {
      if (!state.hasMore) return '';

      return `
        <div class="p-6 text-center">
          ${state.loading ? `
            <div class="flex items-center justify-center gap-2">
              <div class="animate-spin rounded-full h-4 w-4 border-2 border-orange-500 border-t-transparent"></div>
              <span class="text-gray-600">Yükleniyor...</span>
            </div>
          ` : `
            <button id="load-more-btn" class="load-more-button">
              <span>Daha Fazla Yorum Yükle</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
          `}
        </div>
      `;
    },

    renderModal() {
      if (!state.modalOpen) return;

      const comment = state.comments[state.currentCommentIndex];
      if (!comment || !comment.photos || comment.photos.length === 0) return;

      const photos = comment.photos;
      if (!photos[state.currentPhotoIndex]) {
        state.currentPhotoIndex = 0;
      }
      const currentPhoto = photos[state.currentPhotoIndex];
      const productName = state.data?.product?.name || 'Madetoll Cica Cream (Onarıcı Bakım Kremi)';
      const sellerName = comment.seller || state.data?.product?.seller || 'Madetoll by TazeKrem';

      const navButtons = `
        <button id="prevBtn" class="nav-btn prev" data-direction="prev">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <button id="nextBtn" class="nav-btn next" data-direction="next">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      `;

      const dotsMarkup = photos.length > 1 ? `
        <div id="sliderDots" class="slider-dots">
          ${photos.map((_, idx) => `
            <div class="dot ${idx === state.currentPhotoIndex ? 'active' : ''}" data-index="${idx}"></div>
          `).join('')}
        </div>
      ` : '';

      const hasUser = Boolean(comment.user);
      const hasDate = Boolean(comment.date);
      const showMetaDot = hasUser && hasDate;
      const reviewDate = comment.date || '';
      const userName = comment.user || '';
      const reviewText = comment.comment || '';

      const userInfoBlock = comment.user_info ? `
        <div class="user-extra">
          <span>Boy: ${comment.user_info.height || '-'}</span>
          <span>Kilo: ${comment.user_info.weight || '-'}</span>
        </div>
      ` : '';

      const modalHTML = `
        <div id="reviewModal" class="modal-overlay active">
          <div class="modal-container">
            <button id="closeBtn" class="close-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            <div class="modal-image-area">
              <div class="main-image-container">
                <div id="imageLoader" class="image-loader">
                  <div class="spinner"></div>
                  <p>Görsel Yükleniyor...</p>
                </div>
                <img id="mainImage" src="" alt="${productName} görseli" class="main-image hidden">
              </div>
              ${navButtons}
              ${dotsMarkup}
            </div>

            <div class="modal-content-area">
              <div class="scrollable-content">
                <div class="product-header">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path>
                    <path d="M3 6h18"></path>
                    <path d="M16 10a4 4 0 0 1-8 0"></path>
                  </svg>
                  <span class="product-name">${productName}</span>
                </div>

                <div class="review-meta">
                  <div class="stars">
                    ${utils.createStarRating(comment.rating)}
                  </div>
                  <div class="user-details">
                    <span class="user-name">${userName}</span>
                    ${showMetaDot ? '<span class="dot-separator"></span>' : ''}
                    <span>${reviewDate}</span>
                  </div>
                </div>

                <p class="review-text">
                  ${reviewText}
                </p>

                <div class="seller-badge">
                  <span class="seller-name">${sellerName}</span> satıcısından alındı
                </div>

                ${userInfoBlock}
              </div>
            </div>
          </div>
        </div>
      `;

      const existing = document.getElementById('reviewModal');
      if (existing) existing.remove();

      document.body.insertAdjacentHTML('beforeend', modalHTML);
      document.body.classList.add('no-scroll');

      eventManager.attachModalListeners();
      
      // Load the first image
      eventManager.updateModalImage();
    }
  };

  // Event Manager
  const eventManager = {
    attachMainListeners() {
      if (!state.container) return;

      // Clear existing listeners by replacing innerHTML and re-adding
      // This prevents duplicate event listeners

      // Search input
      const searchInput = state.container.querySelector('#search-input');
      if (searchInput) {
        searchInput.addEventListener('input', utils.debounce((e) => {
          state.searchTerm = e.target.value;
          state.page = 1; // Reset page when search changes
          this.updateComments();
        }, 500));
      }
    },

    init() {
      if (!state.container) return;

      // Add main click handler only once during initialization
      state.container.addEventListener('click', this.handleMainClick.bind(this));

      // Add document listener only once during initialization
      const closeDropdown = (e) => {
        if (state.showSortDropdown && !e.target.closest('#sort-btn') && !e.target.closest('#sort-dropdown')) {
          console.log('Closing dropdown from document click');
          state.showSortDropdown = false;
          renderer.renderMain();
        }
      };

      document.addEventListener('click', closeDropdown);
      document.addEventListener('touchstart', closeDropdown); // For mobile devices
    },

    handleMainClick(e) {
      const target = e.target.closest('button, .gallery-photo-item, .review-photo');
      if (!target) return;

      e.preventDefault();

      // Sort button
      if (target.id === 'sort-btn') {
        console.log('Sort button clicked, dropdown state:', state.showSortDropdown);
        e.stopPropagation(); // Prevent document click from immediately closing
        state.showSortDropdown = !state.showSortDropdown;
        renderer.renderMain();
        return;
      }

      // Sort option
      if (target.classList.contains('sort-option')) {
        console.log('Sort option selected:', target.dataset.value);
        e.stopPropagation(); // Prevent document click
        state.sortOption = target.dataset.value;
        state.showSortDropdown = false;
        state.page = 1; // Reset page when sorting changes
        this.updateComments();
        return;
      }

      // Gallery navigation
      if (target.classList.contains('gallery-nav-btn')) {
        if (state.galleryScrolling) return;
        state.galleryScrolling = true;
        const container = state.container.querySelector('.gallery-container');
        container.scrollBy({
          left: target.dataset.direction === 'next' ? 92 : -92,
          behavior: 'smooth'
        });
        // Lazy load next photo when nearing the right end
        if (target.dataset.direction === 'next') {
          const nearEnd = (container.scrollLeft + container.clientWidth) >= (container.scrollWidth - 120);
          if (nearEnd && state.galleryLoadedCount < state.galleryAllPhotos.length) {
            const nextPhoto = state.galleryAllPhotos[state.galleryLoadedCount];
            if (nextPhoto) {
              const newItem = `
                <div class="gallery-photo-item flex-shrink-0 bg-black rounded-lg border hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden group" 
                     data-photo="${nextPhoto}">
                  <img src="${utils.getOptimizedImageUrl(nextPhoto, 300)}" alt="" 
                       style="width: 100%; height: 100%; object-fit: cover;" loading="lazy">
                </div>`;
              container.insertAdjacentHTML('beforeend', newItem);
              state.galleryLoadedCount++;
            }
          }
        }
        setTimeout(() => state.galleryScrolling = false, 300);
        return;
      }

      // Photo click (gallery or comment photos)
      if (target.classList.contains('gallery-photo-item') || target.classList.contains('review-photo')) {
        const photoUrl = target.dataset.photo;
        console.log('🖼️ Gallery photo clicked:', photoUrl);
        console.log('📊 Current state:', { comments: state.comments.length, modalOpen: state.modalOpen });
        if (photoUrl) {
          this.openModal(photoUrl);
        } else {
          console.error('❌ No photo URL found!');
        }
        return;
      }

      // Load more
      if (target.id === 'load-more-btn') {
        state.page++;
        this.updateComments();
        return;
      }
    },

    attachModalListeners() {
      const modal = document.getElementById('reviewModal');
      if (!modal) return;

      const closeBtn = modal.querySelector('#closeBtn');
      const prevBtn = modal.querySelector('#prevBtn');
      const nextBtn = modal.querySelector('#nextBtn');
      const dots = modal.querySelectorAll('#sliderDots .dot');

      closeBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        this.closeModal();
      });

      const handleNav = (direction) => (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.navigatePhoto(direction);
      };

      prevBtn?.addEventListener('click', handleNav('prev'));
      nextBtn?.addEventListener('click', handleNav('next'));

      const keyHandler = (e) => {
        if (!state.modalOpen) return;
        if (e.key === 'ArrowRight') {
          this.navigatePhoto('next');
        } else if (e.key === 'ArrowLeft') {
          this.navigatePhoto('prev');
        } else if (e.key === 'Escape') {
          this.closeModal();
        }
      };
      window.addEventListener('keydown', keyHandler, { passive: true });

      dots.forEach((dot) => {
        dot.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const index = parseInt(dot.dataset.index || '0', 10);
          state.currentPhotoIndex = Number.isNaN(index) ? 0 : index;
          this.updateModalImage();
        });
      });

      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal();
        }
      });
    },

    updateComments() {
      return new Promise((resolve) => {
        console.log('Updating comments with sort:', state.sortOption, 'search:', state.searchTerm);

        const filtered = dataProcessor.filterAndSort(
          state.data?.comments || [],
          state.searchTerm,
          state.sortOption
        );

        const paginated = dataProcessor.paginate(filtered, state.page);
        state.comments = paginated.items;
        state.hasMore = paginated.hasMore;
        state.allComments = filtered;

        console.log('Comments updated:', state.comments.length, 'items');

        renderer.renderMain();
        resolve();
      });
    },

    openModal(photoUrl) {
      console.log('🚀 openModal called with:', photoUrl);
      console.log('📝 Available comments:', state.comments.length);
      
      // First try to find in currently displayed comments
      for (let i = 0; i < state.comments.length; i++) {
        const comment = state.comments[i];
        if (comment.photos) {
          for (let j = 0; j < comment.photos.length; j++) {
            if (comment.photos[j] === photoUrl) {
              console.log('✅ Photo found in displayed comments!', { commentIndex: i, photoIndex: j });
              state.currentCommentIndex = i;
              state.currentPhotoIndex = j;
              state.modalOpen = true;
              document.body.classList.add('no-scroll');
              renderer.renderModal();
              return;
            }
          }
        }
      }

      // If not found, search in ALL comments and load that comment
      console.log('🔍 Searching in all comments...');
      const allComments = state.data?.comments || [];
      for (let i = 0; i < allComments.length; i++) {
        const comment = allComments[i];
        if (comment.photos) {
          for (let j = 0; j < comment.photos.length; j++) {
            if (comment.photos[j] === photoUrl) {
              console.log('✅ Photo found in all comments!', { commentIndex: i, photoIndex: j });
              // Add this comment to displayed comments if not already there
              if (!state.comments.find(c => c === comment)) {
                state.comments.unshift(comment);
              }
              state.currentCommentIndex = state.comments.findIndex(c => c === comment);
              state.currentPhotoIndex = j;
              state.modalOpen = true;
              document.body.classList.add('no-scroll');
              renderer.renderModal();
              return;
            }
          }
        }
      }
      
      console.error('❌ Photo not found in any comments!', photoUrl);
    },

    closeModal() {
      state.modalOpen = false;
      const modal = document.getElementById('reviewModal');
      if (modal) modal.remove();
      document.body.classList.remove('no-scroll');
    },

    navigatePhoto(direction) {
      const comment = state.comments[state.currentCommentIndex];
      if (!comment?.photos) return;

      if (direction === 'next') {
        if (state.currentPhotoIndex < comment.photos.length - 1) {
          state.currentPhotoIndex++;
        } else {
          let nextCommentIndex = state.currentCommentIndex + 1;
          let foundNext = false;
          
          while (nextCommentIndex < state.comments.length) {
            const c = state.comments[nextCommentIndex];
            if (c?.photos && c.photos.length > 0) {
              state.currentCommentIndex = nextCommentIndex;
              state.currentPhotoIndex = 0;
              foundNext = true;
              break;
            }
            nextCommentIndex++;
          }
          
          // If we reached the end and there are more comments to load
          if (!foundNext && state.hasMore && nextCommentIndex >= state.comments.length) {
            console.log('🔄 Loading more comments from modal navigation...');
            state.page++;
            this.updateComments().then(() => {
              // After loading, try to navigate to the next photo
              const newNextIndex = state.currentCommentIndex + 1;
              if (newNextIndex < state.comments.length) {
                const c = state.comments[newNextIndex];
                if (c?.photos && c.photos.length > 0) {
                  state.currentCommentIndex = newNextIndex;
                  state.currentPhotoIndex = 0;
                  renderer.renderModal();
                }
              }
            });
            return; // Exit early, will re-render after loading
          }
        }
      } else {
        if (state.currentPhotoIndex > 0) {
          state.currentPhotoIndex--;
        } else {
          let prevCommentIndex = state.currentCommentIndex - 1;
          while (prevCommentIndex >= 0) {
            const c = state.comments[prevCommentIndex];
            if (c?.photos && c.photos.length > 0) {
              state.currentCommentIndex = prevCommentIndex;
              state.currentPhotoIndex = c.photos.length - 1;
              break;
            }
            prevCommentIndex--;
          }
        }
      }

      renderer.renderModal();
    },

    updateModalImage() {
      const comment = state.comments[state.currentCommentIndex];
      if (!comment?.photos) return;

      const mainImage = document.getElementById('mainImage');
      const imageLoader = document.getElementById('imageLoader');
      
      if (mainImage && imageLoader) {
        const newPhotoUrl = comment.photos[state.currentPhotoIndex];
        const optimizedUrl = utils.getOptimizedImageUrl(newPhotoUrl, 700);
        
        // If it's the same image, just show it
        if (mainImage.src === optimizedUrl) {
          imageLoader.style.setProperty('display', 'none', 'important');
          mainImage.style.setProperty('display', 'block', 'important');
          return;
        }
        
        // Show loader and hide image
        imageLoader.style.setProperty('display', 'flex', 'important');
        mainImage.style.setProperty('display', 'none', 'important');
        
        // Create a new image to preload
        const tempImage = new Image();
        
        tempImage.onload = () => {
          mainImage.src = optimizedUrl;
          imageLoader.style.setProperty('display', 'none', 'important');
          mainImage.style.setProperty('display', 'block', 'important');
        };
        
        tempImage.onerror = () => {
          imageLoader.style.setProperty('display', 'flex', 'important');
          imageLoader.innerHTML = '<p style="color: #ef4444;">Görsel yüklenemedi</p>';
          mainImage.style.setProperty('display', 'none', 'important');
        };
        
        // Start loading
        tempImage.src = optimizedUrl;
      }

      const dots = document.querySelectorAll('#sliderDots .dot');
      dots.forEach((dot, idx) => {
        dot.classList.toggle('active', idx === state.currentPhotoIndex);
      });
    }
  };

  // WooCommerce Integration
  const woocommerce = {
    getProductSKU() {
      // Method 1: SKU element
      const skuElement = document.querySelector('.sku');
      if (skuElement) return skuElement.textContent.trim();

      // Method 2: Data attribute
      const skuMeta = document.querySelector('[data-sku]');
      if (skuMeta) return skuMeta.dataset.sku;

      // Method 3: Product ID
      const productId = document.querySelector('[data-product_id]');
      if (productId) return productId.dataset.product_id;

      // Method 4: URL parameter
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('product') || urlParams.get('p');
    },

    getProductName() {
      const selectors = [
        '.product_title',
        'h1.product_title',
        '.entry-title',
        'h1.entry-title',
        '.summary .product_title',
        '.product .product_title',
        '[itemprop="name"]'
      ];

      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.textContent) {
          const name = el.textContent.trim();
          if (name) return name;
        }
      }

      const og = document.querySelector('meta[property="og:title"]');
      if (og) {
        const name = og.getAttribute('content');
        if (name) return name.trim();
      }

      return document.title?.trim() || '';
    },

    findOrCreateContainer() {
      // Check if container already exists
      let container = document.getElementById(CONFIG.CONTAINER_ID);
      if (container) return container;

      // Create new container
      container = document.createElement('div');
      container.id = CONFIG.CONTAINER_ID;

      // Try to insert near script tag
      if (scriptEl && scriptEl.parentElement) {
        scriptEl.parentElement.appendChild(container);
        return container;
      }

      // Fallback: Insert after product summary or tabs
      const insertPoints = [
        '.woocommerce-tabs',
        '.product-summary',
        '.single-product',
        'body'
      ];

      for (const selector of insertPoints) {
        const element = document.querySelector(selector);
        if (element) {
          if (selector === 'body') {
            element.appendChild(container);
          } else {
            element.parentNode.insertBefore(container, element.nextSibling);
          }
          return container;
        }
      }

      return container;
    }
  };

  // CSS Loader
  function loadCSS() {
    if (document.querySelector(`link[href="${CONFIG.CSS_URL}"]`)) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = CONFIG.CSS_URL;
    document.head.appendChild(link);
  }

  // Initialize
  async function init() {
    console.log('Trendyol Reviews: Initializing...');

    // Load CSS
    loadCSS();

    // Find or create container
    state.container = woocommerce.findOrCreateContainer();
    if (!state.container) {
      console.error('Trendyol Reviews: Could not create container');
      return;
    }

    // Get product SKU
    const sku = woocommerce.getProductSKU();
    if (!sku) {
      console.warn('Trendyol Reviews: Product SKU not found');
      return;
    }

    console.log('Trendyol Reviews: Loading reviews for SKU:', sku);

    // Load data
    const data = await api.fetchReviews(sku);
    if (!data || !data.comments) {
      state.container.innerHTML = `
        <div class="bg-white rounded-lg shadow-sm border p-6 text-center text-gray-500">
          <p>Bu ürün için henüz değerlendirme bulunmuyor.</p>
        </div>
      `;
      return;
    }

    // Initialize state
    state.data = data;
    state.allComments = data.comments || [];

    // Ensure product name from WooCommerce page
    const wcName = woocommerce.getProductName();
    if (wcName) {
      state.data.product = state.data.product || {};
      state.data.product.name = wcName;
    }

    // Initialize event managers
    eventManager.init();

    // Initial render
    eventManager.updateComments();

    console.log('Trendyol Reviews: Initialized successfully');
  }

  // Auto-initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose API
  window.TrendyolReviews = {
    init,
    state,
    refresh: () => eventManager.updateComments()
  };

})();
