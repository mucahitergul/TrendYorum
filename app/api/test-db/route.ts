import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/db';

export async function GET(request: NextRequest) {
  try {
    const client = await pool.connect();
    
    try {
      // Basit test sorgusu
      const result = await client.query('SELECT COUNT(*) as total_reviews FROM reviews');
      const skuResult = await client.query("SELECT COUNT(*) as sku_count FROM reviews WHERE sku = '40970378'");
      
      return NextResponse.json({
        success: true,
        total_reviews: result.rows[0].total_reviews,
        sku_40970378_count: skuResult.rows[0].sku_count,
        message: 'Veritabanı bağlantısı başarılı'
      });
      
    } finally {
      client.release();
    }
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      message: 'Veritabanı bağlantısı başarısız'
    }, { status: 500 });
  }
}