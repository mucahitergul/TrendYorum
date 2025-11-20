import { NextResponse } from "next/server";
import pool from "../../../lib/db";
import { createTablesSQL } from "../../../lib/sql";

export async function GET() {
  try {
    const client = await pool.connect();
    try {
      await client.query(createTablesSQL);
      const res = await client.query("SELECT id, domain, sku, content_id, merchant_id, listing_id, status, error, total_pages, total_elements, started_at, ended_at FROM import_runs ORDER BY id DESC LIMIT 200");
      return NextResponse.json({ rows: res.rows });
    } finally {
      client.release();
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}