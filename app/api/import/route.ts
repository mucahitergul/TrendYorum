import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import pool from "../../../lib/db";
import { createTablesSQL } from "../../../lib/sql";
import { fetchReviewsWithBrowser } from "../../../lib/trendyolBrowser";

type ImportBody = {
  domain: string;
  sku: string;
  contentId?: string;
  merchantId?: string;
  listingId?: string;
  useSample?: boolean;
};

function formatDate(ms: number) {
  const d = new Date(ms);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function transformTrendyol(content: any[]) {
  const byId = new Map<string, any>();
  for (const c of content) {
    const rid = String(c.reviewId ?? c.id ?? "");
    const photoUrl = c.mediaFile?.mediaType === "IMAGE" && c.mediaFile?.url ? c.mediaFile.url : null;
    if (!byId.has(rid)) {
      byId.set(rid, {
        review_id: c.reviewId ?? c.id ?? 0,
        user: c.userFullName || "",
        date: c.lastModifiedDate ? formatDate(c.lastModifiedDate) : "",
        rating: c.rate || 0,
        comment: c.comment || "",
        photos: photoUrl ? [photoUrl] : [],
        elit_customer: c.trusted ? "Onaylı Müşteri" : "",
        like_count: 0,
        comment_height_details: "",
        comment_weight_details: "",
        comment_size_details: ""
      });
    } else if (photoUrl) {
      const ref = byId.get(rid);
      if (ref && Array.isArray(ref.photos)) {
        // aynı fotoğrafları tekrar eklemeyelim
        if (!ref.photos.includes(photoUrl)) ref.photos.push(photoUrl);
      }
    }
  }
  const comments = Array.from(byId.values());
  const avg = comments.length
    ? comments.reduce((s, c) => s + (c.rating || 0), 0) / comments.length
    : 0;
  return { comments, average_score: Number(avg.toFixed(2)), total_comment_count: comments.length };
}

export async function POST(req: Request) {
  const body = (await req.json()) as ImportBody;
  if (!body.domain) {
    return NextResponse.json({ message: "domain zorunlu" }, { status: 400 });
  }
  const sku = body.sku || body.contentId || "";
  let runId: number | null = null;
  let totalPagesVar = 0;
  let totalElementsVar = 0;
  try {
    const client = await pool.connect();
    try {
      await client.query(createTablesSQL);
      const ins = await client.query(
        `INSERT INTO import_runs (domain, sku, content_id, merchant_id, listing_id, status, started_at)
         VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING id`,
        [body.domain, sku, body.contentId || null, body.merchantId || null, body.listingId || null, 'started']
      );
      runId = ins.rows[0]?.id ?? null;
    } finally {
      client.release();
    }
  } catch {}

  let content: any[] = [];
  try {
    if (body.useSample) {
      const samplePath = path.resolve(process.cwd(), "trendyolyorumapi.json");
      const raw = fs.readFileSync(samplePath, "utf8");
      const json = JSON.parse(raw);
      content = json.content || json.contents || [];
    } else {
      if (!body.contentId || !body.merchantId) {
        return NextResponse.json({ message: "contentId ve merchantId gerekli" }, { status: 400 });
      }
      const viaBrowser = await fetchReviewsWithBrowser({ contentId: body.contentId!, merchantId: body.merchantId!, listingId: body.listingId || undefined });
      totalPagesVar = viaBrowser.totalPages;
      totalElementsVar = viaBrowser.totalElements;
      content = viaBrowser.content;
    }
  } catch (e: any) {
    try {
      if (runId) {
        const client = await pool.connect();
        try {
          await client.query(
            `UPDATE import_runs SET status=$2, error=$3, ended_at=NOW() WHERE id=$1`,
            [runId, 'error', String(e?.message || e)]
          );
        } finally { client.release(); }
      }
    } catch {}
    return NextResponse.json({ message: `İçe aktarma hatası: ${e.message}` }, { status: 500 });
  }

  const rawCount = content.length;
  const transformed = transformTrendyol(content);
  const payload = {
    [sku]: {
      barcode: sku,
      product_brand: "N/A",
      product_name: "N/A",
      product_image: "",
      seller_name: "",
      seller_logo: "",
      product_warning: "N/A",
      favorite_count: "N/A",
      average_score: transformed.average_score,
      total_comment_count: transformed.total_comment_count,
      comments: transformed.comments,
      questions: []
    }
  } as any;

  // DB yazma
  try {
    const client = await pool.connect();
    try {
      await client.query(createTablesSQL);
      await client.query(
        `INSERT INTO products (sku, domain, content_id, merchant_id, listing_id, average_score, total_comment_count, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
         ON CONFLICT (sku, domain)
         DO UPDATE SET average_score=EXCLUDED.average_score, total_comment_count=EXCLUDED.total_comment_count, content_id=EXCLUDED.content_id, merchant_id=EXCLUDED.merchant_id, listing_id=EXCLUDED.listing_id, updated_at=NOW()`,
        [sku, body.domain, body.contentId || null, body.merchantId || null, body.listingId || null, transformed.average_score, transformed.total_comment_count]
      );
      for (const c of transformed.comments) {
        const rid = Number(c.review_id) || Math.floor(Math.random()*1e12);
        await client.query(
          `INSERT INTO reviews (id, sku, domain, user_full_name, rating, comment, date_text, elit_customer, like_count)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           ON CONFLICT (id) DO UPDATE SET user_full_name=EXCLUDED.user_full_name, rating=EXCLUDED.rating, comment=EXCLUDED.comment, date_text=EXCLUDED.date_text, elit_customer=EXCLUDED.elit_customer, like_count=EXCLUDED.like_count`,
          [rid, sku, body.domain, c.user, c.rating, c.comment, c.date, c.elit_customer, c.like_count]
        );
        await client.query(`DELETE FROM review_photos WHERE review_id=$1`, [rid]);
        if (Array.isArray(c.photos)) {
          for (const url of c.photos) {
            await client.query(
              `INSERT INTO review_photos (review_id, url) VALUES ($1,$2)`,
              [rid, url]
            );
          }
        }
      }
      if (runId) {
        const status = rawCount === totalElementsVar ? 'success' : 'success_mismatch';
        const errorMsg = rawCount === totalElementsVar ? null : `expected ${totalElementsVar}, got ${rawCount}`;
        await client.query(
          `UPDATE import_runs SET status=$2, error=$3, total_pages=$4, total_elements=$5, ended_at=NOW() WHERE id=$1`,
          [runId, status, errorMsg, totalPagesVar, totalElementsVar]
        );
      }
    } finally {
      client.release();
    }
  } catch (e) {
    // DB hatalarını bastırmadan mesaj verelim
    console.error("DB error", e);
  }

  const outDir = path.resolve(process.cwd(), "public", "trendyol", body.domain);
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${sku}.json`);
  fs.writeFileSync(outFile, JSON.stringify(payload));

  return NextResponse.json({ message: `Oluşturuldu: /trendyol/${body.domain}/${sku}.json ve DB güncellendi` });
}
export const runtime = 'nodejs';