# Subdomain Otomatik Kurulum Rehberi

Bu rehber, Hetzner Cloud sunucusunda subdomain olarak Trendyol Yorumları projesini otomatik kurmak için hazırlanmıştır.

## 🚀 Hızlı Başlangıç

### Tek Komut Kurulum

```bash
# Sunucuya bağlan
ssh root@YOUR_SERVER_IP

# Kurulum script'ini indir ve çalıştır
wget https://raw.githubusercontent.com/mucahitergul/TrendYorum/main/auto-deploy-subdomain.sh
chmod +x auto-deploy-subdomain.sh
./auto-deploy-subdomain.sh
```

## 📋 Ön Gereksinimler

### 1. Hetzner Cloud Sunucu
- **OS**: Ubuntu 22.04 LTS
- **RAM**: Minimum 2GB (4GB önerilen)
- **Disk**: Minimum 20GB
- **CPU**: Minimum 1 vCPU (2 vCPU önerilen)

### 2. Domain Ayarları
Kurulum öncesi DNS ayarlarınızı yapın:

```
A kaydı: reviews.example.com -> YOUR_SERVER_IP
```

### 3. Uzak Veritabanı
PostgreSQL veritabanınızın hazır olması gerekiyor:
- Host adresi
- Port (varsayılan: 5432)
- Veritabanı adı
- Kullanıcı adı ve şifre

## 🔧 Kurulum Süreci

### Adım 1: Sunucu Hazırlığı
Script otomatik olarak:
- ✅ Sistem güncellemesi
- ✅ Gerekli paketleri yükleme
- ✅ Firewall ayarları
- ✅ Node.js 20.x kurulumu
- ✅ PM2 kurulumu

### Adım 2: Uygulama Kurulumu
- ✅ Uygulama kullanıcısı oluşturma
- ✅ Proje dizini hazırlama
- ✅ Veritabanı bağlantısı test etme
- ✅ Next.js konfigürasyonu

### Adım 3: Dosya Yükleme
Script size şu dosyaları yüklemenizi söyleyecek:
```bash
# Demo sayfası
scp app/demo/page.tsx user@server:/path/

# API route
scp app/api/reviews/route.ts user@server:/path/

# Static dosyalar
scp public/static/* user@server:/path/
```

### Adım 4: Build ve Deploy
- ✅ NPM bağımlılıkları
- ✅ Next.js build
- ✅ PM2 ile başlatma

### Adım 5: Web Sunucu
- ✅ Nginx konfigürasyonu
- ✅ SSL sertifikası (Let's Encrypt)
- ✅ Güvenlik ayarları

## 📊 Kurulum Detayları

### Sistem Gereksinimleri
```bash
# Minimum sistem gereksinimleri
RAM: 2GB
Disk: 20GB
CPU: 1 vCPU
Network: 1Gbps

# Önerilen sistem gereksinimleri
RAM: 4GB
Disk: 40GB
CPU: 2 vCPU
Network: 1Gbps
```

### Kurulacak Paketler
```bash
# Sistem paketleri
curl wget git unzip software-properties-common
nginx certbot python3-certbot-nginx
ufw htop tree postgresql-client build-essential

# Node.js ekosistemi
nodejs (v20.x)
npm (latest)
pm2 (latest)
```

### Oluşturulacak Dosyalar
```
/home/trendyol-app/apps/trendyol-reviews/
├── app/
│   ├── api/reviews/route.ts
│   ├── demo/page.tsx
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── public/static/
│   ├── woocommerce-snippet.js
│   └── trendyol.css
├── .env.local
├── package.json
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── postcss.config.js
├── ecosystem.config.js
└── logs/
```

## 🔒 Güvenlik Ayarları

### Firewall (UFW)
```bash
# Açık portlar
22/tcp    # SSH
80/tcp    # HTTP (redirect to HTTPS)
443/tcp   # HTTPS
```

### SSL Sertifikası
- Let's Encrypt otomatik kurulum
- Otomatik yenileme ayarı
- A+ SSL rating konfigürasyonu

### Nginx Güvenlik Başlıkları
```nginx
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 1; mode=block
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer-when-downgrade
Strict-Transport-Security: max-age=31536000
```

## 🌐 DNS Konfigürasyonu

### Gerekli DNS Kayıtları
```
# A kaydı (zorunlu)
reviews.example.com.    IN  A   YOUR_SERVER_IP

# AAAA kaydı (opsiyonel, IPv6 varsa)
reviews.example.com.    IN  AAAA  YOUR_IPv6

# CAA kaydı (opsiyonel, SSL güvenliği için)
reviews.example.com.    IN  CAA   0 issue "letsencrypt.org"
```

### DNS Yayılma Kontrolü
```bash
# DNS kontrolü
nslookup reviews.example.com
dig reviews.example.com

# Çevrimiçi araçlar
https://dnschecker.org/
https://www.whatsmydns.net/
```

## 🗄️ Veritabanı Konfigürasyonu

### PostgreSQL Bağlantı Bilgileri
Script kurulum sırasında şunları soracak:
- **Host**: Veritabanı sunucu adresi
- **Port**: Varsayılan 5432
- **Database**: Veritabanı adı
- **Username**: Kullanıcı adı
- **Password**: Şifre

### Environment Değişkenleri
```bash
# .env.local dosyasında oluşturulacak
DATABASE_URL="postgresql://user:pass@host:port/db"
DB_HOST="your-db-host.com"
DB_PORT="5432"
DB_NAME="trendyol_reviews"
DB_USER="your_user"
DB_PASSWORD="your_password"
```

### Bağlantı Testi
Script otomatik olarak veritabanı bağlantısını test eder:
```bash
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1;"
```

## ⚙️ Konfigürasyon Seçenekleri

### Uygulama Ayarları
```javascript
// next.config.js
const nextConfig = {
  experimental: { appDir: true },
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    API_BASE_URL: process.env.API_BASE_URL,
  },
}
```

### PM2 Konfigürasyonu
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'trendyol-reviews',
    script: 'npm',
    args: 'start',
    instances: 1,
    autorestart: true,
    max_memory_restart: '1G',
    env: { NODE_ENV: 'production', PORT: 3000 }
  }]
};
```

### Nginx Konfigürasyonu
```nginx
server {
    listen 443 ssl http2;
    server_name reviews.example.com;
    
    # SSL ve güvenlik ayarları
    # Proxy ayarları
    # Cache ayarları
}
```

## 📊 Monitoring ve Loglar

### PM2 Monitoring
```bash
# Durum kontrolü
pm2 status

# Logları görüntüleme
pm2 logs trendyol-reviews

# Monitoring dashboard
pm2 monit

# Restart
pm2 restart trendyol-reviews
```

### Nginx Logları
```bash
# Access logları
tail -f /var/log/nginx/access.log

# Error logları
tail -f /var/log/nginx/error.log

# Specific site logları
tail -f /var/log/nginx/reviews.example.com.access.log
```

### Uygulama Logları
```bash
# PM2 logları
/home/trendyol-app/apps/trendyol-reviews/logs/
├── combined.log
├── err.log
└── out.log
```

## 🔄 Backup ve Maintenance

### Otomatik Backup
Script otomatik olarak backup sistemi kurar:
```bash
# Backup script'i
/home/trendyol-app/backup.sh

# Crontab job'u (günlük 02:00)
0 2 * * * /home/trendyol-app/backup.sh
```

### Manuel Backup
```bash
# Uygulama backup'ı
tar -czf backup_$(date +%Y%m%d).tar.gz /home/trendyol-app/apps/

# Nginx konfigürasyon backup'ı
tar -czf nginx_backup_$(date +%Y%m%d).tar.gz /etc/nginx/

# SSL sertifikası backup'ı
tar -czf ssl_backup_$(date +%Y%m%d).tar.gz /etc/letsencrypt/
```

### Güncelleme Süreci
```bash
# Uygulama güncellemesi
cd /home/trendyol-app/apps/trendyol-reviews
git pull origin main
npm install
npm run build
pm2 restart trendyol-reviews

# Sistem güncellemesi
apt update && apt upgrade -y
```

## 🛠️ Sorun Giderme

### Yaygın Sorunlar

#### 1. DNS Yayılmamış
```bash
# Kontrol
nslookup reviews.example.com

# Çözüm
# DNS sağlayıcınızda A kaydını kontrol edin
# 24 saat bekleyin
```

#### 2. SSL Sertifikası Alınamıyor
```bash
# Manuel SSL kurulumu
certbot --nginx -d reviews.example.com

# DNS challenge kullanın
certbot --manual --preferred-challenges dns -d reviews.example.com
```

#### 3. Veritabanı Bağlantı Hatası
```bash
# Bağlantı testi
psql -h DB_HOST -p DB_PORT -U DB_USER -d DB_NAME

# Firewall kontrolü
telnet DB_HOST DB_PORT

# .env.local kontrolü
cat /home/trendyol-app/apps/trendyol-reviews/.env.local
```

#### 4. Uygulama Başlamıyor
```bash
# PM2 durumu
pm2 status

# Logları kontrol et
pm2 logs trendyol-reviews

# Manuel başlatma
cd /home/trendyol-app/apps/trendyol-reviews
npm start
```

#### 5. Nginx 502 Hatası
```bash
# Nginx durumu
systemctl status nginx

# Uygulama durumu
curl http://localhost:3000

# Port kontrolü
netstat -tlnp | grep :3000
```

### Debug Komutları
```bash
# Sistem durumu
htop
df -h
free -h

# Network durumu
ss -tlnp
netstat -tlnp

# Service durumları
systemctl status nginx
systemctl status ufw

# Log analizi
journalctl -u nginx -f
journalctl -xe
```

## 📈 Performans Optimizasyonu

### Sistem Optimizasyonu
```bash
# Swap dosyası (otomatik oluşturulur)
/swapfile    2GB

# Nginx worker processes
worker_processes auto;

# PM2 cluster mode (isteğe bağlı)
instances: max
```

### Cache Ayarları
```nginx
# Static dosyalar için cache
location /static/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# API için cache headers
location /api/ {
    add_header Cache-Control "no-cache, must-revalidate";
}
```

### Gzip Sıkıştırma
```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css application/json application/javascript;
```

## 🔗 Entegrasyon

### WooCommerce Entegrasyonu
Kurulum tamamlandıktan sonra:

```html
<!-- HTML -->
<script src="https://reviews.example.com/static/woocommerce-snippet.js" defer></script>
```

```php
// PHP (functions.php)
function add_trendyol_reviews_script() {
    if (is_product()) {
        wp_enqueue_script(
            'trendyol-reviews', 
            'https://reviews.example.com/static/woocommerce-snippet.js', 
            array(), 
            '1.0.0', 
            true
        );
    }
}
add_action('wp_enqueue_scripts', 'add_trendyol_reviews_script');
```

### API Kullanımı
```javascript
// API endpoint
GET https://reviews.example.com/api/reviews?sku=PRODUCT_SKU

// Response
{
  "product": { "average_score": 4.6, "total_comment_count": 186 },
  "comments": [...]
}
```

## 📞 Destek

### Kurulum Desteği
- GitHub Issues: https://github.com/mucahitergul/TrendYorum/issues
- Email: support@example.com
- Dokümantasyon: Bu dosya

### Sistem Yönetimi
- Hetzner Cloud Console
- SSH erişimi
- Monitoring araçları

## 📝 Lisans

Bu proje MIT lisansı altında sunulmaktadır.

---

**Not**: Bu kurulum rehberi production ortamı için hazırlanmıştır. Development ortamı için farklı ayarlar gerekebilir.