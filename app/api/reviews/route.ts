import { NextRequest, NextResponse } from 'next/server';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS(request: NextRequest) {
  return new Response(null, { status: 200, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sku = searchParams.get('sku');

  if (!sku) {
    return NextResponse.json({ error: 'SKU parameter is required' }, { status: 400, headers: corsHeaders });
  }

  try {
    // Bu örnekte sabit veri döndürüyoruz
    // Gerçek uygulamada burada veritabanından SKU'ya göre veri çekeceksiniz
    
    // SKU'ya göre contentId ve merchantId mapping'i
    const skuMapping: { [key: string]: { contentId: string; merchantId: string } } = {
      // Örnek SKU mapping'leri - kendi ürünlerinize göre güncelleyin
      'PROD-001': { contentId: '41833143', merchantId: '371621' },
      'PROD-002': { contentId: '835796151', merchantId: '371621' },
      'sample-sku': { contentId: '41833143', merchantId: '371621' },
      // Daha fazla SKU mapping ekleyebilirsiniz
    };

    const mapping = skuMapping[sku];
    
    if (!mapping) {
      // SKU bulunamadı, boş veri döndür
      return NextResponse.json({
        product: {
          average_score: 0,
          total_comment_count: 0,
          domain: 'Madetoll by TazeKrem'
        },
        comments: []
      }, { headers: corsHeaders });
    }

    // Trendyol API'sinden veri çek
    const apiUrl = `https://public-mdc.trendyol.com/discovery-web-socialgw-service/v1/review/${mapping.contentId}?merchantId=${mapping.merchantId}&storefrontId=1&culture=tr-TR&linear=true`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
      },
    });

    if (!response.ok) {
      throw new Error(`Trendyol API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Yorumları işle ve mağaza adını güncelle
    if (data.result && data.result.productReviews && data.result.productReviews.content) {
      data.result.productReviews.content = data.result.productReviews.content.map((comment: any) => ({
        ...comment,
        seller: 'Madetoll by TazeKrem' // Mağaza adını manuel olarak ayarla
      }));
    }

    // Veriyi uygun formata dönüştür
    const formattedData = {
      product: {
        average_score: data.result?.averageRating || 0,
        total_comment_count: data.result?.totalElements || 0,
        domain: 'Madetoll by TazeKrem'
      },
      comments: data.result?.productReviews?.content?.map((review: any) => ({
        review_id: review.id,
        user: review.userPublicName || review.userName,
        rating: review.rate,
        comment: review.comment,
        date: review.commentDateISOtype || review.commentDate,
        photos: review.imageUrls || [],
        seller: 'Madetoll by TazeKrem',
        user_info: review.userInfo ? {
          height: review.userInfo.height,
          weight: review.userInfo.weight
        } : null
      })) || []
    };

    return NextResponse.json(formattedData, { headers: corsHeaders });

  } catch (error) {
    console.error('Error fetching reviews:', error);
    
    // Hata durumunda boş veri döndür
    return NextResponse.json({
      product: {
        average_score: 0,
        total_comment_count: 0,
        domain: 'Madetoll by TazeKrem'
      },
      comments: []
    }, { headers: corsHeaders });
  }
}