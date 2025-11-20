import { NextResponse } from "next/server";
import pool from "../../../lib/db";
import fs from "node:fs";
import path from "node:path";

export async function GET() {
  try {
    const client = await pool.connect();
    try {
      const res = await client.query("SELECT sku, domain, content_id, merchant_id, listing_id, average_score, total_comment_count, updated_at FROM products ORDER BY updated_at DESC LIMIT 200");
      return NextResponse.json({ rows: res.rows });
    } finally {
      client.release();
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const domain: string = body?.domain;
    const sku: string = body?.sku;
    if (!domain || !sku) return NextResponse.json({ error: "domain ve sku zorunlu" }, { status: 400 });
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM review_photos WHERE review_id IN (SELECT id FROM reviews WHERE sku=$1 AND domain=$2)", [sku, domain]);
      await client.query("DELETE FROM reviews WHERE sku=$1 AND domain=$2", [sku, domain]);
      await client.query("DELETE FROM products WHERE sku=$1 AND domain=$2", [sku, domain]);
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
    try {
      const outFile = path.resolve(process.cwd(), "public", "trendyol", domain, `${sku}.json`);
      if (fs.existsSync(outFile)) fs.unlinkSync(outFile);
    } catch {}
    return NextResponse.json({ message: "Ürün ve ilişkili yorumlar silindi" });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}