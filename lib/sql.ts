export const createTablesSQL = `
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  sku TEXT NOT NULL,
  domain TEXT NOT NULL,
  content_id TEXT,
  merchant_id TEXT,
  listing_id TEXT,
  average_score NUMERIC,
  total_comment_count INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (sku, domain)
);

CREATE TABLE IF NOT EXISTS reviews (
  id BIGINT PRIMARY KEY,
  sku TEXT NOT NULL,
  domain TEXT NOT NULL,
  user_full_name TEXT,
  rating INTEGER,
  comment TEXT,
  date_text TEXT,
  elit_customer TEXT,
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS review_photos (
  id SERIAL PRIMARY KEY,
  review_id BIGINT REFERENCES reviews(id) ON DELETE CASCADE,
  url TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS import_runs (
  id SERIAL PRIMARY KEY,
  domain TEXT NOT NULL,
  sku TEXT NOT NULL,
  content_id TEXT,
  merchant_id TEXT,
  listing_id TEXT,
  status TEXT NOT NULL,
  error TEXT,
  total_pages INTEGER,
  total_elements INTEGER,
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP
);
`;