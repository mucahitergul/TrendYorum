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
      
      if (productResult.rowCount === 0) {
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

      const product = productResult.rows[0];
      
      // Yorumları çek
      const reviewsQuery = `
        SELECT r.id, r.user_full_name, r.rating, r.comment, r.date_text, r.elit_customer,
               COALESCE(json_agg(rp.url) FILTER (WHERE rp.url IS NOT NULL), '[]') as photos
        FROM reviews r
        LEFT JOIN review_photos rp ON rp.review_id = r.id
        WHERE r.sku = $1 AND r.domain = $2
        GROUP BY r.id, r.user_full_name, r.rating, r.comment, r.date_text, r.elit_customer
        ORDER BY r.id DESC
        LIMIT 200
      `;
      
      const reviewsResult = await client.query(reviewsQuery, [sku, product.domain]);
      
      // Veriyi format et
      const formattedData = {
        product: {
          average_score: product.average_score || 0,
          total_comment_count: product.total_comment_count || 0,
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