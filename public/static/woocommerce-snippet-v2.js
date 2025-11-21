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

  const CONFIG = {
    API_BASE_URL: `${origin}/api`,
    CONTAINER_ID: 'trendyol-reviews-container',
    CSS_URL: `${origin}/static/trendyol.css`
  };

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
    imageLoading: false,
    galleryScrolling: false,
    container: null,
    documentListenerAdded: false
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
          <div class="divide-y">
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
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-medium text-gray-900">Tüm Değerlendirmeler</h2>
            <div class="flex items-center">
              <img id="trendyol-logo" src="https://dukkan.madetoll.com.tr/wp-content/uploads/2025/11/trendyollogo.png" alt="Trendyol" style="width: 200px; height: auto;">
            </div>
          </div>
          
          <div class="flex items-center gap-6 mb-6">
            <div class="flex items-center gap-2">
              <span class="text-2xl font-bold text-gray-900">
                ${state.data?.product?.average_score ?? '4.6'}
              </span>
              <div class="flex">
                ${utils.createStarRating(Math.floor(state.data?.product?.average_score || 4.6))}
              </div>
            </div>
            <div class="text-sm text-gray-600">
              <span class="font-medium">${state.comments.length}</span> Değerlendirme
              <span class="mx-2">•</span>
              <span class="font-medium">${state.data?.product?.total_comment_count ?? '0'}</span> Yorum
            </div>
          </div>
          
          <div class="search-filter-container" style="display: flex; flex-direction: column; gap: 1rem;">
            <style>
              @media (min-width: 640px) {
                .search-filter-container {
                  flex-direction: row !important;
                }
              }
            </style>
            <div class="flex-1 relative">
              <input id="search-input" class="w-full border border-gray-300 rounded-lg px-4 py-2 pl-10 text-sm" 
                     placeholder="Değerlendirmelerde Ara" value="${state.searchTerm}">
              <svg class="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div class="relative w-full sm:w-auto">
              <button id="sort-btn" class="flex items-center justify-center gap-2 text-sm px-3 py-2 border border-orange-500 text-orange-500 rounded-lg hover:bg-orange-50 w-full sm:w-auto">
                <span>${sortOptions.find(opt => opt.value === state.sortOption)?.label}</span>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              ${state.showSortDropdown ? `
                <div id="sort-dropdown" class="absolute top-full left-0 sm:right-0 sm:left-auto mt-1 bg-white border border-gray-200 rounded-lg shadow-lg w-full sm:min-w-48" style="z-index: 9999;">
                  <div class="py-1">
                    ${sortOptions.map(option => `
                      <button class="sort-option w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${state.sortOption === option.value ? 'text-orange-500 bg-orange-50' : 'text-gray-700'}" 
                              data-value="${option.value}">
                        ${option.label}
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
      )).slice(0, 50);

      if (allPhotos.length === 0) return '';

      return `
        <div class="p-6 border-b">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-medium text-gray-900">Fotoğraflı Değerlendirmeler (${state.data?.product?.total_comment_count || state.data?.comments?.length || 0})</h3>
            <div class="flex gap-1">
              <button class="gallery-nav-btn" data-direction="prev">
                <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button class="gallery-nav-btn" data-direction="next">
                <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
          
          <div class="relative">
            <div class="absolute left-0 top-0 bottom-0 w-8 z-10 pointer-events-none" 
                 style="background: linear-gradient(90deg, #FFFFFF 10.61%, rgba(255, 255, 255, 0) 100%)"></div>
            <div class="absolute right-0 top-0 bottom-0 w-8 z-10 pointer-events-none" 
                 style="background: linear-gradient(270deg, #FFFFFF 10.61%, rgba(255, 255, 255, 0) 100%)"></div>
            
            <div class="gallery-container flex gap-3 overflow-x-auto scrollbar-hide pb-2 scroll-smooth">
              ${allPhotos.map(photo => `
                <div class="gallery-photo-item flex-shrink-0 bg-black rounded-lg border hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden group" 
                     style="width: calc((100% - 7 * 0.75rem) / 8); min-width: 100px; aspect-ratio: 1/1;"
                     data-photo="${photo}">
                  <img src="${utils.getOptimizedImageUrl(photo, 200)}" alt="" 
                       class="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" loading="lazy">
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
        <div class="p-6 border-b">
          <div class="flex items-center gap-3 mb-3">
            <div class="flex">
              ${utils.createStarRating(comment.rating)}
            </div>
            <div class="text-sm text-gray-600">
              <span class="font-medium">${comment.user || '****'}</span>
              <span class="mx-2">•</span>
              <span>${comment.date || ''}</span>
            </div>
          </div>
          
          <p class="text-gray-800 mb-4 leading-relaxed">
            ${comment.comment || ''}
          </p>
          
          ${comment.photos && comment.photos.length > 0 ? `
            <div class="flex gap-2 mb-4">
              ${comment.photos.slice(0, 6).map(photo => `
                <div class="w-16 h-16 bg-black rounded border hover:shadow-md transition-shadow cursor-pointer overflow-hidden comment-photo" 
                     data-photo="${photo}">
                  <img src="${utils.getOptimizedImageUrl(photo, 150)}" alt="" class="w-full h-full object-cover">
                </div>
              `).join('')}
            </div>
          ` : ''}
          
          <div class="text-sm mb-3" style="color: #666;">
            <span class="font-medium">Madetoll by TazeKrem</span> satıcısından alındı
          </div>
          
          ${comment.user_info ? `
            <div class="text-sm text-gray-500 mb-3">
              <span>Boy: ${comment.user_info.height || ''}</span>
              <span class="mx-3">Kilo: ${comment.user_info.weight || ''}</span>
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
            <button id="load-more-btn" class="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium">
              Daha Fazla Yorum Yükle
            </button>
          `}
        </div>
      `;
    },

    renderModal() {
      if (!state.modalOpen) return;

      const comment = state.comments[state.currentCommentIndex];
      if (!comment || !comment.photos) return;

      const photo = comment.photos[state.currentPhotoIndex];
      const isMobile = window.innerWidth <= 768;

      const modalHTML = `
        <div id="photo-modal" class="fixed inset-0 bg-black ${isMobile ? 'bg-opacity-95' : 'bg-opacity-75'} flex items-center justify-center z-50" style="z-index: 999999;">
          <div class="modal-container" style="display: flex; background: ${isMobile ? '#000' : 'white'}; border-radius: ${isMobile ? '0' : '8px'}; overflow: hidden; width: ${isMobile ? '100vw' : '1000px'}; height: ${isMobile ? '100vh' : '800px'}; max-width: ${isMobile ? '100vw' : '90vw'}; max-height: ${isMobile ? '100vh' : '90vh'}; flex-direction: ${isMobile ? 'column' : 'row'};">
            
            <button id="modal-close" class="absolute ${isMobile ? 'top-4 right-4' : 'top-4 right-4'} z-10" style="z-index: 1000; background: ${isMobile ? 'rgba(0,0,0,0.8)' : 'transparent'}; border-radius: ${isMobile ? '50%' : '0'}; padding: ${isMobile ? '0.75rem' : '0.5rem'}; ${isMobile ? 'backdrop-filter: blur(10px); border: 2px solid rgba(255,255,255,0.2);' : ''}">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="${isMobile ? 'white' : 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            
            <div class="modal-image-area relative bg-black flex items-center justify-center" style="width: ${isMobile ? '100%' : '600px'}; height: ${isMobile ? '70vh' : '800px'}; ${isMobile ? 'flex: 0 0 70vh;' : 'min-width: 600px; flex-shrink: 0;'} display: flex; align-items: center; justify-content: center; padding: ${isMobile ? '1rem' : '2rem'}; box-sizing: border-box;">
              ${!isMobile ? `
                <button class="modal-nav-btn absolute left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-3 z-10" data-direction="prev">
                  <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                <button class="modal-nav-btn absolute right-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-3 z-10" data-direction="next">
                  <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ` : ''}
              
              <img id="modal-image" src="${photo}" alt="" style="max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain; display: block; margin: 0 auto; position: relative; z-index: 5;">
            </div>
            
            <div id="modal-comment-area" class="modal-comment-area overflow-y-auto" style="width: ${isMobile ? '100%' : '400px'}; ${isMobile ? 'height: 30vh; flex: 0 0 30vh;' : 'padding: 2rem; flex-shrink: 0;'} background: ${isMobile ? '#fff' : '#f8f8f8'}; ${isMobile ? 'border-radius: 20px 20px 0 0; padding: 1rem; position: relative; box-shadow: 0 -4px 20px rgba(0,0,0,0.1);' : ''}">${isMobile ? '<div style="position: absolute; top: 0.5rem; left: 50%; transform: translateX(-50%); width: 40px; height: 4px; background: #e5e7eb; border-radius: 2px;"></div>' : ''}
              <div class="mb-4">
                <div class="flex mb-2">
                  ${utils.createStarRating(comment.rating)}
                </div>
                <div class="text-sm text-gray-600">
                  <span class="font-medium">${comment.user || ''}</span>
                  <span class="mx-2">•</span>
                  <span>${comment.date || ''}</span>
                </div>
              </div>
              
              <p class="text-gray-800 mb-4 leading-relaxed">
                ${comment.comment || ''}
              </p>
              
              <div class="text-sm mb-3" style="color: #666;">
                <span class="font-medium">Madetoll by TazeKrem</span> satıcısından alındı
              </div>
              
              ${comment.user_info ? `
                <div class="text-sm text-gray-500 mb-4">
                  <span>Boy: ${comment.user_info.height || ''}</span>
                  <span class="mx-3">Kilo: ${comment.user_info.weight || ''}</span>
                </div>
              ` : ''}
              
              ${comment.photos && comment.photos.length > 1 ? `
                <div class="text-sm text-gray-500">
                  ${state.currentPhotoIndex + 1} / ${comment.photos.length}
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      `;

      // Remove existing modal
      const existing = document.getElementById('photo-modal');
      if (existing) existing.remove();

      // Add new modal
      document.body.insertAdjacentHTML('beforeend', modalHTML);
      document.body.style.overflow = 'hidden';

      // No loading system - images show immediately
      console.log('Modal opened - image should be visible immediately');

      // Attach modal listeners
      eventManager.attachModalListeners();
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
      const target = e.target.closest('button, .gallery-photo-item, .comment-photo');
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
        setTimeout(() => state.galleryScrolling = false, 300);
        return;
      }

      // Photo click (gallery or comment photos)
      if (target.classList.contains('gallery-photo-item') || target.classList.contains('comment-photo')) {
        const photoUrl = target.dataset.photo;
        console.log('Gallery photo clicked:', photoUrl);
        if (photoUrl) this.openModal(photoUrl);
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
      const modal = document.getElementById('photo-modal');
      if (!modal) return;

      const isMobile = window.innerWidth <= 768;

      modal.addEventListener('click', (e) => {
        const target = e.target;

        // Close button
        if (target.closest('#modal-close')) {
          e.preventDefault();
          this.closeModal();
          return;
        }

        // Navigation (only for desktop)
        const navBtn = target.closest('.modal-nav-btn');
        if (navBtn && !isMobile) {
          e.preventDefault();
          this.navigatePhoto(navBtn.dataset.direction);
          return;
        }

        // Backdrop
        if (target.id === 'photo-modal') {
          e.preventDefault();
          this.closeModal();
          return;
        }
      });

      // Mobile swipe support
      if (isMobile) {
        let startX = 0;
        let startY = 0;
        let isScrolling = false;

        const imageArea = modal.querySelector('.modal-image-area');
        if (imageArea) {
          imageArea.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            isScrolling = false;
          }, { passive: true });

          imageArea.addEventListener('touchmove', (e) => {
            if (!startX || !startY) return;

            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;
            const diffX = Math.abs(currentX - startX);
            const diffY = Math.abs(currentY - startY);

            if (diffY > diffX) {
              isScrolling = true;
            }
          }, { passive: true });

          imageArea.addEventListener('touchend', (e) => {
            if (!startX || isScrolling) return;

            const endX = e.changedTouches[0].clientX;
            const diffX = startX - endX;

            // Minimum swipe distance
            if (Math.abs(diffX) > 50) {
              if (diffX > 0) {
                // Swipe left - next image
                this.navigatePhoto('next');
              } else {
                // Swipe right - previous image
                this.navigatePhoto('prev');
              }
            }

            startX = 0;
            startY = 0;
            isScrolling = false;
          }, { passive: true });
        }

        // Mobile double tap to close
        let lastTap = 0;
        imageArea?.addEventListener('touchend', (e) => {
          const currentTime = new Date().getTime();
          const tapLength = currentTime - lastTap;
          if (tapLength < 500 && tapLength > 0) {
            this.closeModal();
          }
          lastTap = currentTime;
        });
      }
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
      // First try to find in currently displayed comments
      for (let i = 0; i < state.comments.length; i++) {
        const comment = state.comments[i];
        if (comment.photos) {
          for (let j = 0; j < comment.photos.length; j++) {
            if (comment.photos[j] === photoUrl) {
              state.currentCommentIndex = i;
              state.currentPhotoIndex = j;
              state.modalOpen = true;
              renderer.renderModal();
              return;
            }
          }
        }
      }

      // If not found, search in ALL comments and load that comment
      const allComments = state.data?.comments || [];
      for (let i = 0; i < allComments.length; i++) {
        const comment = allComments[i];
        if (comment.photos) {
          for (let j = 0; j < comment.photos.length; j++) {
            if (comment.photos[j] === photoUrl) {
              // Add this comment to displayed comments if not already there
              if (!state.comments.find(c => c === comment)) {
                state.comments.unshift(comment);
              }
              state.currentCommentIndex = state.comments.findIndex(c => c === comment);
              state.currentPhotoIndex = j;
              state.modalOpen = true;
              renderer.renderModal();
              return;
            }
          }
        }
      }
    },

    closeModal() {
      state.modalOpen = false;
      const modal = document.getElementById('photo-modal');
      if (modal) modal.remove();
      document.body.style.overflow = '';
    },

    navigatePhoto(direction) {
      const comment = state.comments[state.currentCommentIndex];
      if (!comment?.photos) return;

      // No loading - just update image directly
      const modalImage = document.getElementById('modal-image');
      if (modalImage) {
        console.log('Navigating to new photo - no loading screen');
      }

      if (direction === 'next') {
        if (state.currentPhotoIndex < comment.photos.length - 1) {
          state.currentPhotoIndex++;
        } else {
          // Next comment with photos
          let foundNext = false;
          for (let i = state.currentCommentIndex + 1; i < state.comments.length; i++) {
            if (state.comments[i].photos?.length > 0) {
              state.currentCommentIndex = i;
              state.currentPhotoIndex = 0;
              foundNext = true;
              break;
            }
          }

          // If no next comment found and we have more data, load more comments
          if (!foundNext && state.hasMore && !state.loading) {
            console.log('Loading more comments for navigation');
            state.page++;
            eventManager.updateComments().then(() => {
              // Try to find next comment with photos again
              for (let i = state.currentCommentIndex + 1; i < state.comments.length; i++) {
                if (state.comments[i].photos?.length > 0) {
                  state.currentCommentIndex = i;
                  state.currentPhotoIndex = 0;
                  // Re-trigger navigation after loading
                  eventManager.navigatePhoto('next');
                  return;
                }
              }
            });
            return; // Exit early while loading
          }
        }
      } else {
        if (state.currentPhotoIndex > 0) {
          state.currentPhotoIndex--;
        } else {
          // Previous comment with photos
          for (let i = state.currentCommentIndex - 1; i >= 0; i--) {
            if (state.comments[i].photos?.length > 0) {
              state.currentCommentIndex = i;
              state.currentPhotoIndex = state.comments[i].photos.length - 1;
              break;
            }
          }
        }
      }

      // Update image
      const newComment = state.comments[state.currentCommentIndex];
      const newPhoto = newComment.photos[state.currentPhotoIndex];

      if (modalImage) {
        console.log('Navigating to new photo');

        // Direct image update - no loading
        modalImage.src = newPhoto;
        modalImage.style.display = 'block';
        modalImage.style.opacity = '1';
        console.log('Navigation image updated directly');
      }

      // Update comment info
      const commentInfo = document.getElementById('modal-comment-area');
      if (commentInfo) {
        console.log('Updating comment info for:', newComment.user);
        commentInfo.innerHTML = `
          <div class="mb-4">
            <div class="flex mb-2">
              ${utils.createStarRating(newComment.rating)}
            </div>
            <div class="text-sm text-gray-600">
              <span class="font-medium">${newComment.user || ''}</span>
              <span class="mx-2">•</span>
              <span>${newComment.date || ''}</span>
            </div>
          </div>
          
          <p class="text-gray-800 mb-4 leading-relaxed">
            ${newComment.comment || ''}
          </p>
          
          <div class="text-sm mb-3" style="color: #666;">
            <span class="font-medium">Madetoll by TazeKrem</span> satıcısından alındı
          </div>
          
          ${newComment.user_info ? `
            <div class="text-sm text-gray-500 mb-4">
              <span>Boy: ${newComment.user_info.height || ''}</span>
              <span class="mx-3">Kilo: ${newComment.user_info.weight || ''}</span>
            </div>
          ` : ''}
          
          ${newComment.photos && newComment.photos.length > 1 ? `
            <div class="text-sm text-gray-500">
              ${state.currentPhotoIndex + 1} / ${newComment.photos.length}
            </div>
          ` : ''}
        `;
      }
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
