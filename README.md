# Trendyol Yorumları - WooCommerce Entegrasyonu

Bu proje, WooCommerce ürün sayfalarında Trendyol yorumlarını göstermek için geliştirilmiş bir Next.js uygulamasıdır. Subdomain olarak kurulup uzak veritabanı ile çalışacak şekilde optimize edilmiştir.

## 🚀 Hızlı Başlangıç

### Yerel Geliştirme

```bash
# Bağımlılıkları yükle
npm install

# Geliştirme sunucusunu başlat
npm run dev

# Tarayıcıda aç
http://localhost:3000
```

### Hetzner Subdomain Kurulumu

#### Tek Komut Kurulum (Önerilen)

```bash
# 1. Sunucuya bağlan
ssh root@YOUR_SERVER_IP

# 2. Hızlı kurulum script'ini çalıştır
wget https://raw.githubusercontent.com/YOUR_REPO/main/quick-install.sh
chmod +x quick-install.sh
./quick-install.sh
```

#### Manuel Kurulum Seçenekleri

**Seçenek 1: Otomatik Subdomain Kurulumu**
```bash
wget https://raw.githubusercontent.com/YOUR_REPO/main/auto-deploy-subdomain.sh
chmod +x auto-deploy-subdomain.sh
./auto-deploy-subdomain.sh
```

**Seçenek 2: Geleneksel Kurulum**
```bash
wget https://raw.githubusercontent.com/YOUR_REPO/main/deploy.sh
chmod +x deploy.sh
./deploy.sh
```

#### Kurulum Rehberleri

- **🌐 Subdomain Kurulumu**: [SUBDOMAIN_DEPLOYMENT.md](./SUBDOMAIN_DEPLOYMENT.md)
- **🖥️ Geleneksel Kurulum**: [HETZNER_DEPLOYMENT.md](./HETZNER_DEPLOYMENT.md)
- **🛒 WooCommerce Entegrasyonu**: [WOOCOMMERCE_INTEGRATION.md](./WOOCOMMERCE_INTEGRATION.md)

#### Dosya Yükleme

```bash
# Yerel bilgisayarınızdan proje dosyalarını yükleyin
chmod +x upload-files.sh
./upload-files.sh
```

## 📁 Proje Yapısı

```
├── app/
│   ├── api/reviews/route.ts      # API endpoint (SKU bazlı yorum çekme)
│   ├── demo/page.tsx             # Demo sayfası
│   ├── layout.tsx                # Ana layout
│   ├── page.tsx                  # Ana sayfa
│   └── globals.css               # Global CSS
├── public/static/
│   ├── woocommerce-snippet.js    # WooCommerce entegrasyon script'i
│   └── trendyol.css              # Trendyol stilleri
├── auto-deploy-subdomain.sh      # Subdomain otomatik kurulum
├── quick-install.sh              # Hızlı kurulum wrapper
├── deploy.sh                     # Geleneksel kurulum
├── upload-files.sh               # Dosya yükleme script'i
└── docs/                         # Dokümantasyon
    ├── SUBDOMAIN_DEPLOYMENT.md
    ├── HETZNER_DEPLOYMENT.md
    └── WOOCOMMERCE_INTEGRATION.md
```

## 🔧 Konfigürasyon

### 1. Subdomain Kurulum Bilgileri

Kurulum sırasında şu bilgiler istenecek:

```bash
# Domain Bilgileri
Ana Domain: example.com
Subdomain: reviews
Tam Adres: reviews.example.com

# Veritabanı Bilgileri (Uzak PostgreSQL)
Host: your-db-host.com
Port: 5432
Database: trendyol_reviews
Username: your_user
Password: your_password

# SSL Bilgileri
Email: admin@example.com
```

### 2. SKU Mapping

`app/api/reviews/route.ts` dosyasında SKU eşleştirmesini yapın:

```typescript
const skuMapping = {
  'WOOCOMMERCE-SKU-1': { 
    contentId: 'TRENDYOL-CONTENT-ID', 
    merchantId: 'TRENDYOL-MERCHANT-ID' 
  },
  'WOOCOMMERCE-SKU-2': { 
    contentId: 'TRENDYOL-CONTENT-ID-2', 
    merchantId: 'TRENDYOL-MERCHANT-ID' 
  },
  // Daha fazla ürün ekleyin...
};
```

### 3. Environment Değişkenleri

Kurulum otomatik olarak `.env.local` dosyası oluşturur:

```bash
# Database Configuration
DATABASE_URL="postgresql://user:pass@host:port/db"
DB_HOST="your-db-host.com"
DB_PORT="5432"
DB_NAME="trendyol_reviews"
DB_USER="your_user"
DB_PASSWORD="your_password"

# Application Configuration
NODE_ENV="production"
NEXT_PUBLIC_API_URL="https://reviews.example.com"
API_BASE_URL="https://reviews.example.com/api"

# Security
NEXTAUTH_SECRET="auto-generated-secret"
NEXTAUTH_URL="https://reviews.example.com"
```

## 🛒 WooCommerce Entegrasyonu

### Basit Entegrasyon

WooCommerce temanızın ürün sayfasına ekleyin:

```html
<script src="https://reviews.example.com/static/woocommerce-snippet.js" defer></script>
```

### Functions.php ile Entegrasyon

```php
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

### Otomatik SKU Algılama

Script otomatik olarak WooCommerce ürün SKU'sunu algılar:
- `.sku` class'ından
- `[data-sku]` attribute'undan  
- `[data-product_id]` attribute'undan
- URL parametrelerinden

## ✨ Özellikler

- **🔍 Akıllı Arama**: Yorumlarda gerçek zamanlı arama
- **📊 Sıralama**: Tarih, puan ve önerilen sıralama seçenekleri
- **🖼️ Fotoğraf Galerisi**: Müşteri fotoğrafları ile interaktif galeri
- **📱 Responsive**: Mobil ve desktop uyumlu tasarım
- **⚡ Performans**: CDN optimizasyonu ve lazy loading
- **🔄 Sayfalama**: Infinite scroll ve "Daha Fazla Yükle" özelliği
- **🌐 Türkçe Destek**: DD.MM.YYYY tarih formatı dahil
- **🔒 Güvenlik**: XSS koruması ve güvenlik başlıkları
- **🗄️ Uzak Veritabanı**: PostgreSQL desteği
- **🌐 Subdomain**: Ayrı subdomain'de çalışma

## 🎯 Demo

Kurulum tamamlandıktan sonra:

- **Ana Sayfa**: `https://reviews.example.com`
- **Demo Sayfası**: `https://reviews.example.com/demo`
- **API Test**: `https://reviews.example.com/api/reviews?sku=sample-sku`
- **Health Check**: `https://reviews.example.com/health`

## 📊 API Kullanımı

### Endpoint

```
GET https://reviews.example.com/api/reviews?sku={PRODUCT_SKU}
```

### Örnek Yanıt

```json
{
  "product": {
    "average_score": 4.6,
    "total_comment_count": 186,
    "domain": "Madetoll by TazeKrem"
  },
  "comments": [
    {
      "review_id": "123456",
      "user": "A*** H***",
      "rating": 5,
      "comment": "Ürün çok güzel, tavsiye ederim",
      "date": "28 Nisan 2025",
      "photos": ["https://cdn.dsmcdn.com/..."],
      "seller": "Madetoll by TazeKrem",
      "user_info": {
        "height": "172 cm",
        "weight": "65 kg"
      }
    }
  ]
}
```

## 🏗️ Sistem Gereksinimleri

### Minimum Gereksinimler
- **OS**: Ubuntu 22.04 LTS
- **RAM**: 2GB
- **Disk**: 20GB
- **CPU**: 1 vCPU
- **Network**: 1Gbps

### Önerilen Gereksinimler
- **OS**: Ubuntu 22.04 LTS
- **RAM**: 4GB
- **Disk**: 40GB SSD
- **CPU**: 2 vCPU
- **Network**: 1Gbps

### Uzak Veritabanı
- **PostgreSQL**: 12+
- **Bağlantı**: TCP/IP erişimi
- **SSL**: Önerilen

## 🔧 Geliştirme

### Yerel Geliştirme Ortamı

```bash
# Proje klonla
git clone https://github.com/YOUR_REPO/trendyol-reviews.git
cd trendyol-reviews

# Environment dosyası oluştur
cp .env.example .env.local

# Veritabanı bilgilerini düzenle
nano .env.local

# Bağımlılıkları yükle
npm install

# Geliştirme sunucusunu başlat
npm run dev
```

### Build ve Deploy

```bash
# Production build
npm run build

# Production sunucusunu başlat
npm start

# PM2 ile başlat (sunucuda)
pm2 start ecosystem.config.js
```

## 🛠️ Sorun Giderme

### Yaygın Sorunlar

**1. DNS Yayılmamış**
```bash
# Kontrol
nslookup reviews.example.com

# Çözüm: DNS A kaydını kontrol edin
```

**2. Veritabanı Bağlantı Hatası**
```bash
# Test
psql -h DB_HOST -p DB_PORT -U DB_USER -d DB_NAME

# .env.local kontrolü
cat /home/trendyol-app/apps/trendyol-reviews/.env.local
```

**3. SSL Sertifikası Sorunu**
```bash
# Manuel kurulum
certbot --nginx -d reviews.example.com

# Yenileme testi
certbot renew --dry-run
```

**4. Uygulama Başlamıyor**
```bash
# PM2 durumu
pm2 status

# Logları kontrol et
pm2 logs trendyol-reviews

# Manuel test
cd /home/trendyol-app/apps/trendyol-reviews
npm start
```

### Debug Komutları

```bash
# Sistem durumu
htop
df -h
free -h

# Uygulama durumu
pm2 status
pm2 logs trendyol-reviews

# Nginx durumu
systemctl status nginx
nginx -t

# Veritabanı bağlantısı
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1;"
```

## 📈 Performans Optimizasyonu

### Otomatik Optimizasyonlar
- **CDN**: Trendyol görselleri için `/mnresize/` optimizasyonu
- **Lazy Loading**: Görseller için gecikmiş yükleme
- **Gzip**: Nginx sıkıştırması
- **Cache Headers**: Static dosyalar için uzun cache
- **SSL**: A+ rating konfigürasyonu

### Manuel Optimizasyonlar
```bash
# PM2 cluster mode
pm2 start ecosystem.config.js --instances max

# Nginx worker processes
worker_processes auto;

# Database connection pooling
# .env.local'de DATABASE_URL'e ?pool=true ekleyin
```

## 🔒 Güvenlik

### Otomatik Güvenlik Ayarları
- **Firewall**: UFW ile port koruması
- **SSL**: Let's Encrypt sertifikası
- **Headers**: Güvenlik başlıkları
- **User Isolation**: Ayrı kullanıcı hesabı
- **File Permissions**: Güvenli dosya izinleri

### Manuel Güvenlik Ayarları
```bash
# Fail2Ban kurulumu
apt install fail2ban

# SSH port değiştirme
nano /etc/ssh/sshd_config

# Database SSL zorunlu kılma
# .env.local'de DATABASE_URL'e ?sslmode=require ekleyin
```

## 📝 Backup ve Maintenance

### Otomatik Backup
Kurulum otomatik olarak backup sistemi kurar:
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

# Veritabanı backup'ı (uzak sunucuda)
pg_dump -h $DB_HOST -U $DB_USER $DB_NAME > backup_$(date +%Y%m%d).sql
```

## 🔄 Güncelleme

### Uygulama Güncellemesi
```bash
# Proje dizinine git
cd /home/trendyol-app/apps/trendyol-reviews

# Güncellemeleri çek
git pull origin main

# Bağımlılıkları güncelle
npm install

# Build et
npm run build

# Yeniden başlat
pm2 restart trendyol-reviews
```

### Sistem Güncellemesi
```bash
# Sistem paketleri
apt update && apt upgrade -y

# Node.js güncelleme
npm install -g npm@latest
npm install -g pm2@latest

# SSL sertifikası yenileme
certbot renew
```

## 📞 Destek

### Kurulum Desteği
- **GitHub Issues**: https://github.com/YOUR_REPO/issues
- **Dokümantasyon**: Bu README ve ilgili .md dosyaları
- **Email**: support@example.com

### Sistem Yönetimi
- **Hetzner Cloud Console**: Sunucu yönetimi
- **SSH Erişimi**: Doğrudan sistem erişimi
- **PM2 Monitoring**: Uygulama izleme

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje MIT lisansı altında sunulmaktadır.

## 🎉 Teşekkürler

Bu projeyi kullandığınız için teşekkürler! ⭐ vermeyi unutmayın.

---

**Not**: Bu proje Trendyol'un resmi bir ürünü değildir. Trendyol'un genel erişilebilir API'lerini kullanmaktadır.

## 📋 Kurulum Kontrol Listesi

### Kurulum Öncesi
- [ ] Hetzner Cloud sunucu hazır (Ubuntu 22.04 LTS)
- [ ] Domain/subdomain DNS ayarları yapıldı
- [ ] Uzak PostgreSQL veritabanı hazır
- [ ] SSH erişimi test edildi

### Kurulum Sırası
- [ ] `quick-install.sh` script'i çalıştırıldı
- [ ] Kurulum bilgileri girildi (domain, veritabanı, email)
- [ ] Proje dosyaları yüklendi
- [ ] SSL sertifikası kuruldu
- [ ] Sistem testleri geçti

### Kurulum Sonrası
- [ ] SKU mapping yapılandırıldı
- [ ] WooCommerce entegrasyonu test edildi
- [ ] Backup sistemi kontrol edildi
- [ ] Monitoring kuruldu
- [ ] Dokümantasyon okundu

### Test Listesi
- [ ] Ana sayfa erişilebilir: `https://reviews.example.com`
- [ ] Demo sayfası çalışıyor: `https://reviews.example.com/demo`
- [ ] API endpoint yanıt veriyor: `https://reviews.example.com/api/reviews?sku=test`
- [ ] SSL sertifikası geçerli
- [ ] WooCommerce entegrasyonu çalışıyor