// Basit veritabanı test sorgusu
const pool = require('./lib/db.js').default;

async function testQuery() {
  const client = await pool.connect();
  
  try {
    console.log('=== Veritabanı Test ===');
    
    // 1. Toplam yorum sayısı
    const totalResult = await client.query('SELECT COUNT(*) as count FROM reviews WHERE sku = $1', ['40970378']);
    console.log('Toplam yorum sayısı:', totalResult.rows[0].count);
    
    // 2. İlk 3 yorum
    const reviewsResult = await client.query(`
      SELECT id, sku, domain, user_full_name, rating, comment, date_text 
      FROM reviews 
      WHERE sku = $1 
      LIMIT 3
    `, ['40970378']);
    
    console.log('İlk 3 yorum:');
    reviewsResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ID: ${row.id}, Domain: ${row.domain}, User: ${row.user_full_name}, Rating: ${row.rating}`);
    });
    
    // 3. Fotoğraflar
    const photosResult = await client.query(`
      SELECT r.id, COUNT(rp.url) as photo_count
      FROM reviews r
      LEFT JOIN review_photos rp ON rp.review_id = r.id
      WHERE r.sku = $1
      GROUP BY r.id
      LIMIT 3
    `, ['40970378']);
    
    console.log('Fotoğraf sayıları:');
    photosResult.rows.forEach(row => {
      console.log(`Review ID: ${row.id}, Fotoğraf sayısı: ${row.photo_count}`);
    });
    
  } finally {
    client.release();
  }
}

testQuery().catch(console.error);