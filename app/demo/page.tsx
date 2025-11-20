"use client";
import { useRef, useState } from "react";

export default function DemoPage() {
  const [contentId, setContentId] = useState("41833143");
  const [merchantId, setMerchantId] = useState("371621");
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [currentCommentIndex, setCurrentCommentIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("recommended");
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [galleryScrolling, setGalleryScrolling] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const galleryRef = useRef<HTMLDivElement | null>(null);



  // Smooth gallery navigation
  const navigateGallery = (direction: 'prev' | 'next') => {
    const container = galleryRef.current;
    if (!container || galleryScrolling) return;

    setGalleryScrolling(true);
    const itemWidth = 92; // 80px width + 12px gap
    const scrollAmount = itemWidth;

    container.scrollBy({
      left: direction === 'next' ? scrollAmount : -scrollAmount,
      behavior: 'smooth'
    });

    // Reset scrolling state after animation
    setTimeout(() => setGalleryScrolling(false), 300);
  };

  // Helper function to get optimized image URL for thumbnails
  const getOptimizedImageUrl = (originalUrl: string, size: number = 300) => {
    if (!originalUrl || typeof originalUrl !== 'string') {
      return originalUrl;
    }

    // Check if URL contains the CDN domain
    if (originalUrl.includes('cdn.dsmcdn.com')) {
      // If it's already optimized, don't modify
      if (originalUrl.includes('/mnresize/')) {
        return originalUrl;
      }

      // Simple replacement: add /mnresize/size/size/ after the domain
      const optimizedUrl = originalUrl.replace(
        'https://cdn.dsmcdn.com/',
        `https://cdn.dsmcdn.com/mnresize/${size}/${size}/`
      );

      console.log('Original URL:', originalUrl);
      console.log('Optimized URL:', optimizedUrl);
      return optimizedUrl;
    }

    return originalUrl;
  };

  // Helper function to parse Turkish date format
  const parseTurkishDate = (dateStr: string) => {
    if (!dateStr) return new Date(0);

    console.log('Parsing date:', dateStr);

    const monthMap: { [key: string]: number } = {
      'Ocak': 0, 'Şubat': 1, 'Mart': 2, 'Nisan': 3, 'Mayıs': 4, 'Haziran': 5,
      'Temmuz': 6, 'Ağustos': 7, 'Eylül': 8, 'Ekim': 9, 'Kasım': 10, 'Aralık': 11
    };

    // Try to parse DD.MM.YYYY format like "13.09.2025"
    if (dateStr.includes('.')) {
      const parts = dateStr.trim().split('.');
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1; // Month is 0-indexed
        const year = parseInt(parts[2]);

        if (!isNaN(day) && !isNaN(month) && !isNaN(year) && month >= 0 && month <= 11) {
          const parsedDate = new Date(year, month, day);
          console.log('Parsed DD.MM.YYYY date:', parsedDate);
          return parsedDate;
        }
      }
    }

    // Try to parse Turkish date format like "28 Nisan 2025" or "16 Aralık 2022"
    const parts = dateStr.trim().split(' ');
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = monthMap[parts[1]];
      const year = parseInt(parts[2]);

      if (!isNaN(day) && month !== undefined && !isNaN(year)) {
        const parsedDate = new Date(year, month, day);
        console.log('Parsed Turkish date:', parsedDate);
        return parsedDate;
      }
    }

    // Fallback to standard date parsing
    const fallbackDate = new Date(dateStr);
    console.log('Fallback date parsing:', fallbackDate);
    return fallbackDate;
  };

  // Get filtered comments for gallery (from all data)
  const getFilteredCommentsForGallery = () => {
    let filteredComments = data?.comments || [];

    // Apply search filter
    if (searchTerm.trim()) {
      filteredComments = filteredComments.filter((comment: any) =>
        comment.comment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comment.user?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comment.seller?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    const sortedComments = [...filteredComments].sort((a: any, b: any) => {
      switch (sortOption) {
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
          return 0; // Keep original order for recommended
      }
    });

    return sortedComments;
  };

  // Load comments from existing data with pagination simulation
  const loadComments = async (pageNum: number = 1, reset: boolean = false, customSort?: string, customSearch?: string) => {
    if (loading) return;

    setLoading(true);
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));

      // Get filtered and sorted comments from existing data
      let filteredComments = data?.comments || [];

      // Use custom search or current searchTerm
      const currentSearch = customSearch !== undefined ? customSearch : searchTerm;

      // Apply search filter
      if (currentSearch.trim()) {
        filteredComments = filteredComments.filter((comment: any) =>
          comment.comment?.toLowerCase().includes(currentSearch.toLowerCase()) ||
          comment.user?.toLowerCase().includes(currentSearch.toLowerCase()) ||
          comment.seller?.toLowerCase().includes(currentSearch.toLowerCase())
        );
      }

      // Use custom sort or current sortOption
      const currentSort = customSort || sortOption;

      // Apply sorting
      const sortedComments = [...filteredComments].sort((a: any, b: any) => {
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
            return 0; // Keep original order for recommended
        }
      });

      console.log(`Filtering with sort: ${currentSort}, search: "${currentSearch}", found: ${sortedComments.length} comments`);

      // Pagination simulation
      const limit = 5;
      const startIndex = (pageNum - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedComments = sortedComments.slice(startIndex, endIndex);

      if (reset) {
        setComments(paginatedComments);
      } else {
        setComments(prev => [...prev, ...paginatedComments]);
      }

      setHasMore(endIndex < sortedComments.length);
      setPage(pageNum);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load more comments for infinite scroll
  const loadMoreComments = () => {
    if (hasMore && !loading) {
      loadComments(page + 1, false);
    }
  };

  const sortOptions = [
    { value: "recommended", label: "Önerilen Sıralama" },
    { value: "newest", label: "Yeniden Eskiye" },
    { value: "oldest", label: "Eskiden Yeniye" },
    { value: "highest", label: "Artan Puan" },
    { value: "lowest", label: "Azalan Puan" }
  ];



  const openModal = (photoUrl: string) => {
    // Find the comment and photo index based on original URL (not optimized)
    let foundCommentIndex = -1;
    let foundPhotoIndex = -1;

    for (let i = 0; i < comments.length; i++) {
      const comment = comments[i];
      if (comment.photos && Array.isArray(comment.photos)) {
        for (let j = 0; j < comment.photos.length; j++) {
          // Check both original and optimized URLs
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
      setCurrentCommentIndex(foundCommentIndex);
      setCurrentPhotoIndex(foundPhotoIndex);
      setImageLoading(true);
      setModalOpen(true);
    }
  };

  const navigatePhoto = (direction: 'prev' | 'next') => {
    const currentComment = comments[currentCommentIndex];
    if (!currentComment?.photos) return;

    // Set loading state when navigating
    setImageLoading(true);

    if (direction === 'next') {
      if (currentPhotoIndex < currentComment.photos.length - 1) {
        setCurrentPhotoIndex(currentPhotoIndex + 1);
      } else {
        // Move to next comment with photos
        let nextCommentIndex = currentCommentIndex + 1;
        while (nextCommentIndex < comments.length) {
          if (comments[nextCommentIndex].photos && comments[nextCommentIndex].photos.length > 0) {
            setCurrentCommentIndex(nextCommentIndex);
            setCurrentPhotoIndex(0);
            break;
          }
          nextCommentIndex++;
        }
      }
    } else {
      if (currentPhotoIndex > 0) {
        setCurrentPhotoIndex(currentPhotoIndex - 1);
      } else {
        // Move to previous comment with photos
        let prevCommentIndex = currentCommentIndex - 1;
        while (prevCommentIndex >= 0) {
          if (comments[prevCommentIndex].photos && comments[prevCommentIndex].photos.length > 0) {
            setCurrentCommentIndex(prevCommentIndex);
            setCurrentPhotoIndex(comments[prevCommentIndex].photos.length - 1);
            break;
          }
          prevCommentIndex--;
        }
      }
    }
  };
  async function load() {
    setError(null);
    setData(null);
    setComments([]);
    if (!contentId || !merchantId) { setError("contentId ve merchantId gerekli"); return; }

    // Load product data
    const res = await fetch(`/api/demo?contentId=${encodeURIComponent(contentId)}&merchantId=${encodeURIComponent(merchantId)}`);
    if (!res.ok) { setError(`Hata: ${res.status}`); return; }
    const j = await res.json();
    setData(j);

    // Load initial comments after data is set
    setTimeout(() => {
      loadComments(1, true, "recommended", "");
    }, 100);

    if (!document.querySelector('link[href="/static/trendyol.css"]')) {
      const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = '/static/trendyol.css'; document.head.appendChild(l);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Demo Controls */}
      <div className="bg-white border-b p-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-medium mb-2">Trendyol Yorum Demo</h1>
          <div className="flex gap-3 items-center">
            <input
              className="border border-gray-300 rounded px-3 py-2 text-sm flex-1"
              placeholder="contentId (örn. 835796151)"
              value={contentId}
              onChange={e => setContentId(e.target.value)}
            />
            <input
              className="border border-gray-300 rounded px-3 py-2 text-sm flex-1"
              placeholder="merchantId (örn. 371621)"
              value={merchantId}
              onChange={e => setMerchantId(e.target.value)}
            />
            <button
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded text-sm font-medium"
              onClick={load}
            >
              Göster
            </button>
          </div>
          {error && <p className="mt-2 text-red-600 text-sm">{error}</p>}
        </div>
      </div>

      {/* Reviews Container */}
      {data && (
        <div className="max-w-4xl mx-auto p-4">
          <div className="bg-white rounded-lg shadow-sm border">
            {/* Header */}
            <div className="p-6 border-b">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">Tüm Değerlendirmeler</h2>
                <div className="flex items-center text-sm text-gray-500">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Sağlık Beyanı & Yorum Yayınlama Kriterleri
                </div>
              </div>

              {/* Rating Summary */}
              <div className="flex items-center gap-6 mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {data?.product?.average_score ?? '4.6'}
                  </span>
                  <div className="flex text-yellow-400">
                    {'★★★★★'.split('').map((star, i) => (
                      <span key={i} className={i < Math.floor(data?.product?.average_score || 4.6) ? 'text-yellow-400' : 'text-gray-300'}>
                        {star}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{comments.length}</span> Değerlendirme
                  <span className="mx-2">•</span>
                  <span className="font-medium">{data?.product?.total_comment_count ?? '186'}</span> Yorum
                </div>
              </div>

              {/* Search and Sort */}
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <input
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 pl-10 text-sm"
                    placeholder="Değerlendirmelerde Ara"
                    value={searchTerm}
                    onChange={(e) => {
                      const newSearchTerm = e.target.value;
                      setSearchTerm(newSearchTerm);
                      // Debounce search - reload after 500ms
                      const timeoutId = setTimeout(() => {
                        if (data) loadComments(1, true, undefined, newSearchTerm);
                      }, 500);
                      return () => clearTimeout(timeoutId);
                    }}
                  />
                  <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div className="relative">
                  <button
                    className="flex items-center gap-2 text-sm px-3 py-2 border border-orange-500 text-orange-500 rounded-lg hover:bg-orange-50"
                    onClick={() => setShowSortDropdown(!showSortDropdown)}
                  >
                    <span>{sortOptions.find(opt => opt.value === sortOption)?.label}</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showSortDropdown && (
                    <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-48">
                      <div className="py-1">
                        {sortOptions.map((option) => (
                          <button
                            key={option.value}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${sortOption === option.value ? 'text-orange-500 bg-orange-50' : 'text-gray-700'
                              }`}
                            onClick={() => {
                              setSortOption(option.value);
                              setShowSortDropdown(false);
                              // Reload comments with new sort immediately
                              if (data) loadComments(1, true, option.value);
                            }}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Photo Gallery */}
            <div className="p-6 border-b">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900">Fotoğraflı Değerlendirmeler</h3>
                <div className="flex gap-1">
                  <button
                    className={`p-2 rounded-full hover:bg-gray-100 transition-colors ${galleryScrolling ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => navigateGallery('prev')}
                    disabled={galleryScrolling}
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    className={`p-2 rounded-full hover:bg-gray-100 transition-colors ${galleryScrolling ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => navigateGallery('next')}
                    disabled={galleryScrolling}
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Gallery Container with Fade Effects */}
              <div className="relative">
                {/* Left Fade */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-8 z-10 pointer-events-none"
                  style={{ background: 'linear-gradient(90deg, #FFFFFF 10.61%, rgba(255, 255, 255, 0) 100%)' }}
                ></div>

                {/* Right Fade */}
                <div
                  className="absolute right-0 top-0 bottom-0 w-8 z-10 pointer-events-none"
                  style={{ background: 'linear-gradient(270deg, #FFFFFF 10.61%, rgba(255, 255, 255, 0) 100%)' }}
                ></div>

                {/* Gallery Scroll Container */}
                <div
                  ref={galleryRef}
                  className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 scroll-smooth"
                  style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    scrollBehavior: 'smooth'
                  }}
                >
                  {Array.from(new Set(getFilteredCommentsForGallery().flatMap((c: any) => c.photos || []))).slice(0, 30).map((u: unknown, idx: number) => (
                    <div
                      key={idx}
                      className="flex-shrink-0 w-20 h-20 bg-black rounded-lg border hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden group"
                      onClick={() => openModal(u as string)}
                    >
                      <img
                        src={(() => {
                          const optimizedUrl = getOptimizedImageUrl(u as string, 150);
                          // Debug: Log the URL transformation
                          if (idx === 0) {
                            console.log('Original URL:', u as string);
                            console.log('Optimized URL:', optimizedUrl);
                          }
                          return optimizedUrl;
                        })()}
                        alt=""
                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Reviews List */}
            <div className="divide-y">
              {comments.length === 0 && !loading ? (
                <div className="p-6 text-center text-gray-500">
                  <p>Arama kriterlerinize uygun yorum bulunamadı.</p>
                </div>
              ) : (
                comments.map((c: any, index: number) => (
                  <div key={c.review_id || index} className="p-6">
                    {/* Stars and User Info */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex text-yellow-400">
                        {'★★★★★'.split('').map((star, i) => (
                          <span key={i} className={i < (c.rating || 0) ? 'text-yellow-400' : 'text-gray-300'}>
                            {star}
                          </span>
                        ))}
                      </div>
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">{c.user || '****'}</span>
                        <span className="mx-2">•</span>
                        <span>{c.date || '28 Nisan 2025'}</span>
                      </div>
                    </div>

                    {/* Review Text */}
                    <p className="text-gray-800 mb-4 leading-relaxed">
                      {c.comment || 'Ürünlerim sağlam bir şekilde geldi güzel kaliteller❤️ özenli paketleme ve hediye için teşekkür ederim'}
                    </p>

                    {/* Review Photos */}
                    {Array.isArray(c.photos) && c.photos.length > 0 && (
                      <div className="flex gap-2 mb-4">
                        {c.photos.slice(0, 6).map((u: string, idx: number) => (
                          <div key={idx} className="w-16 h-16 bg-black rounded border hover:shadow-md transition-shadow cursor-pointer overflow-hidden" onClick={() => openModal(u)}>
                            <img
                              src={getOptimizedImageUrl(u, 150)}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Seller Info */}
                    <div className="text-sm text-gray-600 mb-3">
                      <span className="font-medium">{c.seller || data?.product?.domain || 'Madetoll by TazeKrem'}</span> satıcısından alındı
                    </div>

                    {/* User Info (if available) */}
                    {c.user_info && (
                      <div className="text-sm text-gray-500 mb-3">
                        <span>Boy: {c.user_info.height || '172 cm'}</span>
                        <span className="mx-3">Kilo: {c.user_info.weight || '102 kg'}</span>
                      </div>
                    )}


                  </div>
                ))
              )}

              {/* Load More Button / Loading */}
              {hasMore && (
                <div className="p-6 text-center">
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-orange-500 border-t-transparent"></div>
                      <span className="text-gray-600">Yükleniyor...</span>
                    </div>
                  ) : (
                    <button
                      onClick={loadMoreComments}
                      className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium"
                    >
                      Daha Fazla Yorum Yükle
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Photo Modal */}
      {modalOpen && comments[currentCommentIndex] && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={() => setModalOpen(false)}>
          <div className="relative max-w-4xl max-h-[90vh] w-full mx-4 flex bg-white rounded-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Close Button */}
            <button
              className="absolute top-4 right-4 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100"
              onClick={() => setModalOpen(false)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Image Section */}
            <div className="relative bg-black flex items-center justify-center" style={{ width: '400px', height: '600px' }}>
              {/* Navigation Buttons */}
              <button
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-3 z-10"
                onClick={() => navigatePhoto('prev')}
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <button
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-3 z-10"
                onClick={() => navigatePhoto('next')}
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Loading Indicator */}
              {imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-20">
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
                    <span className="text-white text-sm">Görsel yükleniyor...</span>
                  </div>
                </div>
              )}

              {/* Current Image */}
              <img
                src={comments[currentCommentIndex].photos[currentPhotoIndex]}
                alt=""
                className={`max-w-full max-h-full object-contain transition-opacity duration-200 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
                onLoad={() => setImageLoading(false)}
                onError={() => setImageLoading(false)}
              />
            </div>

            {/* Comment Details Section */}
            <div className="w-80 bg-white p-6 overflow-y-auto">
              {/* Stars and User Info */}
              <div className="mb-4">
                <div className="flex text-yellow-400 mb-2">
                  {'★★★★★'.split('').map((star, i) => (
                    <span key={i} className={i < (comments[currentCommentIndex].rating || 0) ? 'text-yellow-400' : 'text-gray-300'}>
                      {star}
                    </span>
                  ))}
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{comments[currentCommentIndex].user || 'A*** H***'}</span>
                  <span className="mx-2">•</span>
                  <span>{comments[currentCommentIndex].date || '16 Aralık 2022'}</span>
                </div>
              </div>

              {/* Review Text */}
              <p className="text-gray-800 mb-4 leading-relaxed">
                {comments[currentCommentIndex].comment || 'Pat patlara satışı halde geldi teşekkür ederim'}
              </p>

              {/* Seller Info */}
              <div className="text-sm text-gray-600 mb-4">
                <span className="font-medium">{comments[currentCommentIndex].seller || data?.product?.domain || 'Madetoll by TazeKrem'}</span> satıcısından alındı
              </div>

              {/* User Info (if available) */}
              {comments[currentCommentIndex].user_info && (
                <div className="text-sm text-gray-500 mb-4">
                  <span>Boy: {comments[currentCommentIndex].user_info.height || '172 cm'}</span>
                  <span className="mx-3">Kilo: {comments[currentCommentIndex].user_info.weight || '102 kg'}</span>
                </div>
              )}

              {/* Photo Counter */}
              {comments[currentCommentIndex].photos && comments[currentCommentIndex].photos.length > 1 && (
                <div className="text-sm text-gray-500 text-center">
                  {currentPhotoIndex + 1} / {comments[currentCommentIndex].photos.length}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}