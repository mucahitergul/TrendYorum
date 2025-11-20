(function () {
  'use strict';

  const scriptEl = document.currentScript || document.querySelector('script[src*="woocommerce-snippet.js"]');
  const origin = scriptEl ? new URL(scriptEl.src).origin : window.location.origin;
  const CONFIG = {
    API_BASE_URL: `${origin}/api`,
    CONTAINER_ID: 'trendyol-reviews-container',
    CSS_URL: `${origin}/static/trendyol.css`
  };

  // State management
  let state = {
    data: null,
    comments: [],
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
    galleryScrolling: false
  };

  // Helper functions
  function getOptimizedImageUrl(originalUrl, size = 300) {
    if (!originalUrl || typeof originalUrl !== 'string') {
      return originalUrl;
    }

    if (originalUrl.includes('cdn.dsmcdn.com')) {
      if (originalUrl.includes('/mnresize/')) {
        return originalUrl;
      }
      return originalUrl.replace(
        'https://cdn.dsmcdn.com/',
        `https://cdn.dsmcdn.com/mnresize/${size}/${size}/`
      );
    }
    return originalUrl;
  }

  function parseTurkishDate(dateStr) {
    if (!dateStr) return new Date(0);

    const monthMap = {
      'Ocak': 0, 'Şubat': 1, 'Mart': 2, 'Nisan': 3, 'Mayıs': 4, 'Haziran': 5,
      'Temmuz': 6, 'Ağustos': 7, 'Eylül': 8, 'Ekim': 9, 'Kasım': 10, 'Aralık': 11
    };

    // DD.MM.YYYY format
    if (dateStr.includes('.')) {
      const parts = dateStr.trim().split('.');
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const year = parseInt(parts[2]);
        if (!isNaN(day) && !isNaN(month) && !isNaN(year) && month >= 0 && month <= 11) {
          return new Date(year, month, day);
        }
      }
    }

    // Turkish date format
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
  }

  function getFilteredCommentsForGallery() {
    let filteredComments = state.data?.comments || [];

    if (state.searchTerm.trim()) {
      filteredComments = filteredComments.filter(comment =>
        comment.comment?.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
        comment.user?.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
        comment.seller?.toLowerCase().includes(state.searchTerm.toLowerCase())
      );
    }

    return [...filteredComments].sort((a, b) => {
      switch (state.sortOption) {
        case "newest":
          return parseTurkishDate(b.date || '').getTime() - parseTurkishDate(a.date || '').getTime();
        case "oldest":
          return parseTurkishDate(a.date || '').getTime() - parseTurkishDate(b.date || '').getTime();
        case "highest":
          return (b.rating || 0) - (a.rating || 0);
        case "lowest":
          return (a.rating || 0) - (b.rating || 0);
        case "recommended":
        default:
          return 0;
      }
    });
  }

  // API functions
  async function loadComments(pageNum = 1, reset = false, customSort, customSearch) {
    if (state.loading) return;

    state.loading = true;
    try {
      await new Promise(resolve => setTimeout(resolve, 300));

      let filteredComments = state.data?.comments || [];
      const currentSearch = customSearch !== undefined ? customSearch : state.searchTerm;

      if (currentSearch.trim()) {
        filteredComments = filteredComments.filter(comment =>
          comment.comment?.toLowerCase().includes(currentSearch.toLowerCase()) ||
          comment.user?.toLowerCase().includes(currentSearch.toLowerCase()) ||
          comment.seller?.toLowerCase().includes(currentSearch.toLowerCase())
        );
      }

      const currentSort = customSort || state.sortOption;
      const sortedComments = [...filteredComments].sort((a, b) => {
        switch (currentSort) {
          case "newest":
            return parseTurkishDate(b.date || '').getTime() - parseTurkishDate(a.date || '').getTime();
          case "oldest":
            return parseTurkishDate(a.date || '').getTime() - parseTurkishDate(b.date || '').getTime();
          case "highest":
            return (b.rating || 0) - (a.rating || 0);
          case "lowest":
            return (a.rating || 0) - (b.rating || 0);
          case "recommended":
          default:
            return 0;
        }
      });

      const limit = 5;
      const startIndex = (pageNum - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedComments = sortedComments.slice(startIndex, endIndex);

      if (reset) {
        state.comments = paginatedComments;
      } else {
        state.comments = [...state.comments, ...paginatedComments];
      }

      state.hasMore = endIndex < sortedComments.length;
      state.page = pageNum;
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      state.loading = false;
    }
  }

  async function loadProductData(sku) {
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/reviews?sku=${encodeURIComponent(sku)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      state.data = data;
      await loadComments(1, true, "recommended", "");
      return data;
    } catch (error) {
      console.error('Error loading product data:', error);
      return null;
    }
  }

  // UI Rendering functions
  function createStarRating(rating) {
    return '★★★★★'.split('').map((star, i) =>
      `<span class="${i < (rating || 0) ? 'text-yellow-400' : 'text-gray-300'}">${star}</span>`
    ).join('');
  }

  function renderGallery() {
    const photos = Array.from(new Set(getFilteredCommentsForGallery().flatMap(c => c.photos || []))).slice(0, 30);

    return `
      <div class="p-6 border-b">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-medium text-gray-900">Fotoğraflı Değerlendirmeler</h3>
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
            ${photos.map((photo, idx) => `
              <div class="flex-shrink-0 w-20 h-20 bg-black rounded-lg border hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden group gallery-photo" 
                   data-photo="${photo}">
                <img src="${getOptimizedImageUrl(photo, 150)}" alt="" 
                     class="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" loading="lazy">
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  function renderComments() {
    if (state.comments.length === 0 && !state.loading) {
      return `
        <div class="p-6 text-center text-gray-500">
          <p>Arama kriterlerinize uygun yorum bulunamadı.</p>
        </div>
      `;
    }

    return state.comments.map((comment, index) => `
      <div class="p-6 border-b">
        <div class="flex items-center gap-3 mb-3">
          <div class="flex text-yellow-400">
            ${createStarRating(comment.rating)}
          </div>
          <div class="text-sm text-gray-600">
            <span class="font-medium">${comment.user || '****'}</span>
            <span class="mx-2">•</span>
            <span>${comment.date || '28 Nisan 2025'}</span>
          </div>
        </div>
        
        <p class="text-gray-800 mb-4 leading-relaxed">
          ${comment.comment || 'Ürünlerim sağlam bir şekilde geldi güzel kaliteler❤️ özenli paketleme ve hediye için teşekkür ederim'}
        </p>
        
        ${comment.photos && comment.photos.length > 0 ? `
          <div class="flex gap-2 mb-4">
            ${comment.photos.slice(0, 6).map(photo => `
              <div class="w-16 h-16 bg-black rounded border hover:shadow-md transition-shadow cursor-pointer overflow-hidden comment-photo" 
                   data-photo="${photo}">
                <img src="${getOptimizedImageUrl(photo, 150)}" alt="" class="w-full h-full object-cover">
              </div>
            `).join('')}
          </div>
        ` : ''}
        
        <div class="text-sm text-gray-600 mb-3">
          <span class="font-medium">${comment.seller || state.data?.product?.domain || 'Madetoll by TazeKrem'}</span> satıcısından alındı
        </div>
        
        ${comment.user_info ? `
          <div class="text-sm text-gray-500 mb-3">
            <span>Boy: ${comment.user_info.height || '172 cm'}</span>
            <span class="mx-3">Kilo: ${comment.user_info.weight || '102 kg'}</span>
          </div>
        ` : ''}
      </div>
    `).join('');
  }

  function renderLoadMore() {
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
  }

  function renderModal() {
    if (!state.modalOpen || !state.comments[state.currentCommentIndex]) return '';

    const comment = state.comments[state.currentCommentIndex];
    const photo = comment.photos[state.currentPhotoIndex];

    return `
      <div id="photo-modal" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div class="relative max-w-4xl max-h-[90vh] w-full mx-4 flex bg-white rounded-lg overflow-hidden">
          <button id="modal-close" class="absolute top-4 right-4 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div class="relative bg-black flex items-center justify-center" style="width: 400px; height: 600px;">
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
            
            ${state.imageLoading ? `
              <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-20">
                <div class="flex flex-col items-center gap-3">
                  <div class="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
                  <span class="text-white text-sm">Görsel yükleniyor...</span>
                </div>
              </div>
            ` : ''}
            
            <img id="modal-image" src="${photo}" alt="" class="max-w-full max-h-full object-contain transition-opacity duration-200 ${state.imageLoading ? 'opacity-0' : 'opacity-100'}">
          </div>
          
          <div class="w-80 bg-white p-6 overflow-y-auto">
            <div class="mb-4">
              <div class="flex text-yellow-400 mb-2">
                ${createStarRating(comment.rating)}
              </div>
              <div class="text-sm text-gray-600">
                <span class="font-medium">${comment.user || 'A*** H***'}</span>
                <span class="mx-2">•</span>
                <span>${comment.date || '16 Aralık 2022'}</span>
              </div>
            </div>
            
            <p class="text-gray-800 mb-4 leading-relaxed">
              ${comment.comment || 'Pat patlara satışı halde geldi teşekkür ederim'}
            </p>
            
            <div class="text-sm text-gray-600 mb-4">
              <span class="font-medium">${comment.seller || state.data?.product?.domain || 'Madetoll by TazeKrem'}</span> satıcısından alındı
            </div>
            
            ${comment.user_info ? `
              <div class="text-sm text-gray-500 mb-4">
                <span>Boy: ${comment.user_info.height || '172 cm'}</span>
                <span class="mx-3">Kilo: ${comment.user_info.weight || '102 kg'}</span>
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
  }

  function render() {
    const container = document.getElementById(CONFIG.CONTAINER_ID);
    if (!container || !state.data) return;

    const sortOptions = [
      { value: "recommended", label: "Önerilen Sıralama" },
      { value: "newest", label: "Yeniden Eskiye" },
      { value: "oldest", label: "Eskiden Yeniye" },
      { value: "highest", label: "Artan Puan" },
      { value: "lowest", label: "Azalan Puan" }
    ];

    container.innerHTML = `
      <div class="bg-white rounded-lg shadow-sm border">
        <div class="p-6 border-b">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-medium text-gray-900">Tüm Değerlendirmeler</h2>
            <div class="flex items-center text-sm text-gray-500">
              <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Sağlık Beyanı & Yorum Yayınlama Kriterleri
            </div>
          </div>
          
          <div class="flex items-center gap-6 mb-6">
            <div class="flex items-center gap-2">
              <span class="text-2xl font-bold text-gray-900">
                ${state.data?.product?.average_score ?? '4.6'}
              </span>
              <div class="flex text-yellow-400">
                ${createStarRating(Math.floor(state.data?.product?.average_score || 4.6))}
              </div>
            </div>
            <div class="text-sm text-gray-600">
              <span class="font-medium">${state.comments.length}</span> Değerlendirme
              <span class="mx-2">•</span>
              <span class="font-medium">${state.data?.product?.total_comment_count ?? '186'}</span> Yorum
            </div>
          </div>
          
          <div class="flex gap-4">
            <div class="flex-1 relative">
              <input id="search-input" class="w-full border border-gray-300 rounded-lg px-4 py-2 pl-10 text-sm" 
                     placeholder="Değerlendirmelerde Ara" value="${state.searchTerm}">
              <svg class="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div class="relative">
              <button id="sort-btn" class="flex items-center gap-2 text-sm px-3 py-2 border border-orange-500 text-orange-500 rounded-lg hover:bg-orange-50">
                <span>${sortOptions.find(opt => opt.value === state.sortOption)?.label}</span>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              ${state.showSortDropdown ? `
                <div id="sort-dropdown" class="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-48">
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
        
        ${renderGallery()}
        
        <div class="divide-y">
          ${renderComments()}
          ${renderLoadMore()}
        </div>
      </div>
    `;

    // Render modal separately to body
    renderModalToBody();

    attachEventListeners();
  }

  function renderModalToBody() {
    const existingModal = document.getElementById('photo-modal');

    if (!state.modalOpen || !state.comments[state.currentCommentIndex]) {
      // Close modal if it exists
      if (existingModal && existingModal.parentNode) {
        try {
          existingModal.parentNode.removeChild(existingModal);
        } catch (e) {
          console.warn('Could not remove modal:', e);
        }
      }
      document.body.style.overflow = '';
      return;
    }

    // If modal exists, just update its content
    if (existingModal) {
      updateModalContent(existingModal);
    } else {
      // Create new modal
      const modalHTML = renderModal();
      if (modalHTML) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = modalHTML;
        const modalElement = tempDiv.firstElementChild;

        if (modalElement) {
          document.body.appendChild(modalElement);
          modalElement.addEventListener('click', handleModalClick);
          document.body.style.overflow = 'hidden';

          // Setup image load handlers
          setupModalImageHandlers(modalElement);
        }
      }
    }
  }

  function updateModalContent(modalElement) {
    const comment = state.comments[state.currentCommentIndex];
    if (!comment) return;

    const photo = comment.photos[state.currentPhotoIndex];

    // Update image
    const modalImage = modalElement.querySelector('#modal-image');
    if (modalImage && modalImage.src !== photo) {
      state.imageLoading = true;
      modalImage.style.opacity = '0';

      // Setup new load handler before changing src
      setupModalImageHandlers(modalElement);

      // Change image source
      modalImage.src = photo;
    }

    // Update comment info
    const commentInfo = modalElement.querySelector('.w-80');
    if (commentInfo) {
      commentInfo.innerHTML = `
        <div class="mb-4">
          <div class="flex text-yellow-400 mb-2">
            ${createStarRating(comment.rating)}
          </div>
          <div class="text-sm text-gray-600">
            <span class="font-medium">${comment.user || 'A*** H***'}</span>
            <span class="mx-2">•</span>
            <span>${comment.date || '16 Aralık 2022'}</span>
          </div>
        </div>
        
        <p class="text-gray-800 mb-4 leading-relaxed">
          ${comment.comment || 'Pat patlara satışı halde geldi teşekkür ederim'}
        </p>
        
        <div class="text-sm text-gray-600 mb-4">
          <span class="font-medium">${comment.seller || state.data?.product?.domain || 'Madetoll by TazeKrem'}</span> satıcısından alındı
        </div>
        
        ${comment.user_info ? `
          <div class="text-sm text-gray-500 mb-4">
            <span>Boy: ${comment.user_info.height || '172 cm'}</span>
            <span class="mx-3">Kilo: ${comment.user_info.weight || '102 kg'}</span>
          </div>
        ` : ''}
        
        ${comment.photos && comment.photos.length > 1 ? `
          <div class="text-sm text-gray-500">
            ${state.currentPhotoIndex + 1} / ${comment.photos.length}
          </div>
        ` : ''}
      `;
    }

    // Update loading state
    const loadingOverlay = modalElement.querySelector('.absolute.inset-0.flex.items-center');
    if (state.imageLoading && !loadingOverlay) {
      const imageContainer = modalElement.querySelector('.relative.bg-black');
      if (imageContainer) {
        const overlay = document.createElement('div');
        overlay.className = 'absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-20';
        overlay.innerHTML = `
          <div class="flex flex-col items-center gap-3">
            <div class="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
            <span class="text-white text-sm">Görsel yükleniyor...</span>
          </div>
        `;
        imageContainer.appendChild(overlay);
      }
    } else if (!state.imageLoading && loadingOverlay) {
      loadingOverlay.remove();
    }
  }

  function setupModalImageHandlers(modalElement) {
    const modalImage = modalElement.querySelector('#modal-image');
    if (modalImage) {
      // Remove old handlers to prevent duplicates
      modalImage.onload = null;
      modalImage.onerror = null;

      modalImage.addEventListener('load', function handleLoad() {
        state.imageLoading = false;
        const loadingOverlay = document.querySelector('#photo-modal .absolute.inset-0.flex.items-center');
        if (loadingOverlay && loadingOverlay.parentNode) {
          loadingOverlay.parentNode.removeChild(loadingOverlay);
        }
        modalImage.style.opacity = '1';
      }, { once: true });

      modalImage.addEventListener('error', function handleError() {
        state.imageLoading = false;
        const loadingOverlay = document.querySelector('#photo-modal .absolute.inset-0.flex.items-center');
        if (loadingOverlay && loadingOverlay.parentNode) {
          loadingOverlay.parentNode.removeChild(loadingOverlay);
        }
      }, { once: true });
    }
  }

  // Event handlers
  function attachEventListeners() {
    const container = document.getElementById(CONFIG.CONTAINER_ID);
    if (!container) return;

    // Use event delegation for better performance and to avoid duplicate listeners
    container.removeEventListener('click', handleContainerClick);
    container.addEventListener('click', handleContainerClick);

    container.removeEventListener('input', handleContainerInput);
    container.addEventListener('input', handleContainerInput);
  }

  // Container click handler (event delegation)
  function handleContainerClick(e) {
    const target = e.target.closest('button, .gallery-photo, .comment-photo');
    if (!target) return;

    // Sort button
    if (target.id === 'sort-btn') {
      e.preventDefault();
      state.showSortDropdown = !state.showSortDropdown;
      render();
      return;
    }

    // Sort options
    if (target.classList.contains('sort-option')) {
      e.preventDefault();
      state.sortOption = target.dataset.value;
      state.showSortDropdown = false;
      loadComments(1, true, state.sortOption).then(render);
      return;
    }

    // Gallery navigation
    if (target.classList.contains('gallery-nav-btn')) {
      e.preventDefault();
      if (state.galleryScrolling) return;

      state.galleryScrolling = true;
      const container = document.querySelector('.gallery-container');
      const itemWidth = 92;
      const scrollAmount = itemWidth;

      container.scrollBy({
        left: target.dataset.direction === 'next' ? scrollAmount : -scrollAmount,
        behavior: 'smooth'
      });

      setTimeout(() => state.galleryScrolling = false, 300);
      return;
    }

    // Photo clicks
    if (target.classList.contains('gallery-photo') || target.classList.contains('comment-photo')) {
      e.preventDefault();
      const photoUrl = target.dataset.photo;
      if (photoUrl) {
        openModal(photoUrl);
      }
      return;
    }

    // Load more button
    if (target.id === 'load-more-btn') {
      e.preventDefault();
      if (state.hasMore && !state.loading) {
        loadComments(state.page + 1, false).then(render);
      }
      return;
    }
  }

  // Container input handler
  let searchTimeout;
  function handleContainerInput(e) {
    if (e.target.id === 'search-input') {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        state.searchTerm = e.target.value;
        loadComments(1, true, undefined, state.searchTerm).then(render);
      }, 500);
    }
  }

  // Modal click handler
  function handleModalClick(e) {
    const target = e.target;

    // Close button - check for button or SVG inside
    const closeBtn = target.closest('#modal-close');
    if (closeBtn) {
      e.preventDefault();
      e.stopPropagation();
      closeModal();
      return;
    }

    // Navigation buttons
    const navBtn = target.closest('.modal-nav-btn');
    if (navBtn) {
      e.preventDefault();
      e.stopPropagation();
      const direction = navBtn.getAttribute('data-direction');
      if (direction) {
        navigatePhoto(direction);
      }
      return;
    }

    // Click on backdrop (outside modal content) - only if clicked directly on modal
    if (target.id === 'photo-modal' || target.classList.contains('bg-black')) {
      e.preventDefault();
      e.stopPropagation();
      closeModal();
      return;
    }
  }

  function closeModal() {
    state.modalOpen = false;
    const modal = document.getElementById('photo-modal');
    if (modal && modal.parentNode) {
      try {
        modal.parentNode.removeChild(modal);
      } catch (e) {
        console.warn('Could not close modal:', e);
      }
    }
    document.body.style.overflow = '';
  }

  function openModal(photoUrl) {
    let foundCommentIndex = -1;
    let foundPhotoIndex = -1;

    for (let i = 0; i < state.comments.length; i++) {
      const comment = state.comments[i];
      if (comment.photos && Array.isArray(comment.photos)) {
        for (let j = 0; j < comment.photos.length; j++) {
          if (comment.photos[j] === photoUrl || getOptimizedImageUrl(comment.photos[j]) === photoUrl) {
            foundCommentIndex = i;
            foundPhotoIndex = j;
            break;
          }
        }
        if (foundCommentIndex !== -1) break;
      }
    }

    if (foundCommentIndex !== -1) {
      state.currentCommentIndex = foundCommentIndex;
      state.currentPhotoIndex = foundPhotoIndex;
      state.imageLoading = true;
      state.modalOpen = true;
      renderModalToBody();
    }
  }

  function navigatePhoto(direction) {
    const currentComment = state.comments[state.currentCommentIndex];
    if (!currentComment?.photos) return;

    state.imageLoading = true;

    if (direction === 'next') {
      // Try next photo in current comment
      if (state.currentPhotoIndex < currentComment.photos.length - 1) {
        state.currentPhotoIndex++;
      } else {
        // Try next comment with photos
        let nextCommentIndex = state.currentCommentIndex + 1;
        while (nextCommentIndex < state.comments.length) {
          if (state.comments[nextCommentIndex].photos && state.comments[nextCommentIndex].photos.length > 0) {
            state.currentCommentIndex = nextCommentIndex;
            state.currentPhotoIndex = 0;
            break;
          }
          nextCommentIndex++;
        }
        // If no next comment found, stay at current
        if (nextCommentIndex >= state.comments.length) {
          state.imageLoading = false;
          return;
        }
      }
    } else if (direction === 'prev') {
      // Try previous photo in current comment
      if (state.currentPhotoIndex > 0) {
        state.currentPhotoIndex--;
      } else {
        // Try previous comment with photos
        let prevCommentIndex = state.currentCommentIndex - 1;
        while (prevCommentIndex >= 0) {
          if (state.comments[prevCommentIndex].photos && state.comments[prevCommentIndex].photos.length > 0) {
            state.currentCommentIndex = prevCommentIndex;
            state.currentPhotoIndex = state.comments[prevCommentIndex].photos.length - 1;
            break;
          }
          prevCommentIndex--;
        }
        // If no previous comment found, stay at current
        if (prevCommentIndex < 0) {
          state.imageLoading = false;
          return;
        }
      }
    }

    renderModalToBody();
  }

  // CSS Loading
  function loadCSS() {
    if (!document.querySelector(`link[href="${CONFIG.CSS_URL}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = CONFIG.CSS_URL;
      document.head.appendChild(link);
    }
  }

  // WooCommerce Integration
  function getProductSKU() {
    // Try multiple methods to get WooCommerce product SKU

    // Method 1: Check for SKU in product data
    const skuElement = document.querySelector('.sku');
    if (skuElement) {
      return skuElement.textContent.trim();
    }

    // Method 2: Check for SKU in product meta
    const skuMeta = document.querySelector('[data-sku]');
    if (skuMeta) {
      return skuMeta.dataset.sku;
    }

    // Method 3: Check for product ID and use as fallback
    const productId = document.querySelector('[data-product_id]');
    if (productId) {
      return productId.dataset.product_id;
    }

    // Method 4: Try to extract from URL or page content
    const urlParams = new URLSearchParams(window.location.search);
    const productParam = urlParams.get('product') || urlParams.get('p');
    if (productParam) {
      return productParam;
    }

    return null;
  }

  // Initialize
  async function init() {
    // Load CSS
    loadCSS();

    // Create container if it doesn't exist
    let container = document.getElementById(CONFIG.CONTAINER_ID);
    if (!container) {
      container = document.createElement('div');
      container.id = CONFIG.CONTAINER_ID;

      // Insert container right after the script tag
      const scriptEl = document.currentScript || document.querySelector('script[src*="woocommerce-snippet.js"]');
      if (scriptEl && scriptEl.parentElement) {
        // Insert into the same parent as the script (Elementor widget container)
        scriptEl.parentElement.appendChild(container);
        console.log('Trendyol Reviews: Container created in Elementor widget');
      } else {
        // Fallback: Try to find a good place to insert the reviews
        const productTabs = document.querySelector('.woocommerce-tabs');
        const productSummary = document.querySelector('.product-summary');
        const singleProduct = document.querySelector('.single-product');

        if (productTabs) {
          productTabs.parentNode.insertBefore(container, productTabs.nextSibling);
        } else if (productSummary) {
          productSummary.parentNode.insertBefore(container, productSummary.nextSibling);
        } else if (singleProduct) {
          singleProduct.appendChild(container);
        } else {
          document.body.appendChild(container);
        }
        console.log('Trendyol Reviews: Container created with fallback method');
      }
    }

    // Get product SKU
    const sku = getProductSKU();
    if (!sku) {
      console.warn('Trendyol Reviews: Product SKU not found');
      return;
    }

    console.log('Trendyol Reviews: Loading reviews for SKU:', sku);

    // Load product data
    const data = await loadProductData(sku);
    if (data) {
      render();
    } else {
      container.innerHTML = `
        <div class="bg-white rounded-lg shadow-sm border p-6 text-center text-gray-500">
          <p>Bu ürün için henüz değerlendirme bulunmuyor.</p>
        </div>
      `;
    }
  }

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose global functions for manual control
  window.TrendyolReviews = {
    init,
    loadProductData,
    render,
    state
  };

})();