import { NextResponse } from "next/server";
import pool from "../../../lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const contentId = url.searchParams.get('contentId') || '';
  const merchantId = url.searchParams.get('merchantId') || '';
  if (!contentId || !merchantId) return NextResponse.json({ error: 'contentId ve merchantId gerekli' }, { status: 400 });
  try {
    const client = await pool.connect();
    try {
      const p = await client.query(
        `SELECT sku, domain, average_score, total_comment_count FROM products WHERE content_id=$1 AND merchant_id=$2 ORDER BY updated_at DESC LIMIT 1`,
        [contentId, merchantId]
      );
      if (p.rows.length === 0) return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 });
      const { sku, domain, average_score, total_comment_count } = p.rows[0];
      const r = await client.query(
        `SELECT r.id, r.user_full_name, r.rating, r.comment, r.date_text, r.elit_customer,
                COALESCE(json_agg(rp.url) FILTER (WHERE rp.url IS NOT NULL), '[]') as photos
         FROM reviews r
         LEFT JOIN review_photos rp ON rp.review_id=r.id
         WHERE r.sku=$1 AND r.domain=$2
         GROUP BY r.id, r.user_full_name, r.rating, r.comment, r.date_text, r.elit_customer
         ORDER BY r.id DESC
         LIMIT 200`,
        [sku, domain]
      );
      return NextResponse.json({
        product: { sku, domain, average_score, total_comment_count },
        comments: r.rows.map((x: any) => ({
          review_id: x.id,
          user: x.user_full_name,
          rating: x.rating,
          comment: x.comment,
          date: x.date_text,
          elit_customer: x.elit_customer,
          photos: x.photos
        }))
      });
    } finally {
      client.release();
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}