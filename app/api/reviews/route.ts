import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/db';

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
    // Veritabanından SKU'ya göre ürün ve yorumları çek
    const client = await pool.connect();
    
    try {
      // Önce ürün bilgilerini çek
      const productQuery = `
        SELECT sku, domain, average_score, total_comment_count 
        FROM products 
        WHERE sku = $1 
        ORDER BY updated_at DESC 
        LIMIT 1
      `;
      
      const productResult = await client.query(productQuery, [sku]);
      
      let product = null;
      if (productResult.rows.length > 0) {
        product = productResult.rows[0];
      }
      
      // Debug: SKU'yu logla
      console.log('API Debug - Aranan SKU:', sku);
      
      // Yorumları çek (domain eşleştirmesi olmadan, sadece SKU ile)
      const reviewsQuery = `
        SELECT r.id, r.user_full_name, r.rating, r.comment, r.date_text, r.elit_customer, r.domain,
               COALESCE(json_agg(rp.url) FILTER (WHERE rp.url IS NOT NULL), '[]') as photos
        FROM reviews r
        LEFT JOIN review_photos rp ON rp.review_id = r.id
        WHERE r.sku = $1
        GROUP BY r.id, r.user_full_name, r.rating, r.comment, r.date_text, r.elit_customer, r.domain
        ORDER BY r.id DESC
        LIMIT 200
      `;
      
      const reviewsResult = await client.query(reviewsQuery, [sku]);
      
      // Debug: Sonuç sayısını logla
      console.log('API Debug - Bulunan yorum sayısı:', reviewsResult.rows.length);
      if (reviewsResult.rows.length > 0) {
        console.log('API Debug - İlk yorumun domain\'i:', reviewsResult.rows[0].domain);
      }
      
      // Veriyi format et
      const formattedData = {
        product: {
          average_score: product?.average_score || 0,
          total_comment_count: reviewsResult.rows.length || 0,
          domain: 'Madetoll by TazeKrem'
        },
        comments: reviewsResult.rows.map((review: any) => ({
          review_id: review.id,
          user: review.user_full_name || '****',
          rating: review.rating || 0,
          comment: review.comment || '',
          date: review.date_text || '',
          photos: review.photos || [],
          seller: 'Madetoll by TazeKrem',
          elit_customer: review.elit_customer || false,
          user_info: null // Eğer user_info tablosu varsa buraya eklenebilir
        }))
      };

      return NextResponse.json(formattedData, { headers: corsHeaders });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error fetching reviews from database:', error);
    
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