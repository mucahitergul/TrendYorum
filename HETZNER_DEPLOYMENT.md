# Hetzner Sunucusunda Next.js Trendyol Yorumları Projesi Kurulumu

Bu rehber, Hetzner Cloud sunucusunda Next.js Trendyol yorumları projesini kurmak için adım adım talimatlar içerir.

## 🚀 Ön Gereksinimler

- Hetzner Cloud hesabı
- SSH erişimi olan Ubuntu 22.04 LTS sunucu
- Domain adı (opsiyonel)

## 📋 1. Hetzner Cloud Sunucu Kurulumu

### Sunucu Oluşturma
```bash
# Hetzner Cloud Console'dan:
# - Location: Nuremberg (veya size yakın)
# - Image: Ubuntu 22.04 LTS
# - Type: CPX11 (2 vCPU, 4 GB RAM) - minimum
# - SSH Key: Kendi SSH anahtarınızı ekleyin
```

### İlk Bağlantı
```bash
ssh root@YOUR_SERVER_IP
```

## 🔧 2. Sunucu Hazırlığı

### Sistem Güncellemesi
```bash
apt update && apt upgrade -y
```

### Gerekli Paketleri Yükleyin
```bash
# Temel araçlar
apt install -y curl wget git unzip software-properties-common

# Nginx
apt install -y nginx

# Certbot (SSL için)
apt install -y certbot python3-certbot-nginx

# UFW Firewall
ufw enable
ufw allow ssh
ufw allow 'Nginx Full'
```

## 📦 3. Node.js ve PM2 Kurulumu

### Node.js 20.x Kurulumu
```bash
# NodeSource repository ekle
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Node.js yükle
apt install -y nodejs

# Versiyonu kontrol et
node --version  # v20.x.x olmalı
npm --version   # 10.x.x olmalı
```

### PM2 Process Manager
```bash
npm install -g pm2
```

## 👤 4. Uygulama Kullanıcısı Oluşturma

```bash
# Yeni kullanıcı oluştur
adduser --disabled-password --gecos "" trendyol-app

# Sudo yetkisi ver
usermod -aG sudo trendyol-app

# SSH anahtarını kopyala
mkdir -p /home/trendyol-app/.ssh
cp /root/.ssh/authorized_keys /home/trendyol-app/.ssh/
chown -R trendyol-app:trendyol-app /home/trendyol-app/.ssh
chmod 700 /home/trendyol-app/.ssh
chmod 600 /home/trendyol-app/.ssh/authorized_keys

# Kullanıcıya geç
su - trendyol-app
```

## 📁 5. Proje Kurulumu

### Proje Dizini Oluşturma
```bash
mkdir -p /home/trendyol-app/apps
cd /home/trendyol-app/apps
```

### Git Repository Clone (Eğer Git kullanıyorsanız)
```bash
# Git repository'niz varsa:
git clone https://github.com/YOUR_USERNAME/trendyol-reviews.git
cd trendyol-reviews

# Veya manuel dosya yükleme için:
mkdir trendyol-reviews
cd trendyol-reviews
```

### Manuel Dosya Yükleme (SCP ile)
```bash
# Local bilgisayarınızdan:
scp -r ./app trendyol-app@YOUR_SERVER_IP:/home/trendyol-app/apps/trendyol-reviews/
scp -r ./public trendyol-app@YOUR_SERVER_IP:/home/trendyol-app/apps/trendyol-reviews/
scp package.json trendyol-app@YOUR_SERVER_IP:/home/trendyol-app/apps/trendyol-reviews/
scp next.config.js trendyol-app@YOUR_SERVER_IP:/home/trendyol-app/apps/trendyol-reviews/
scp tailwind.config.ts trendyol-app@YOUR_SERVER_IP:/home/trendyol-app/apps/trendyol-reviews/
scp tsconfig.json trendyol-app@YOUR_SERVER_IP:/home/trendyol-app/apps/trendyol-reviews/
```

### Package.json Oluşturma (Eğer yoksa)
```bash
cat > package.json << 'EOF'
{
  "name": "trendyol-reviews",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start -p 3000",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "autoprefixer": "^10.0.0",
    "eslint": "^8.0.0",
    "eslint-config-next": "14.0.0",
    "postcss": "^8.0.0",
    "tailwindcss": "^3.0.0",
    "typescript": "^5.0.0"
  }
}
EOF
```

### Bağımlılıkları Yükleyin
```bash
npm install
```

### Projeyi Build Edin
```bash
npm run build
```

## ⚙️ 6. PM2 ile Uygulama Başlatma

### PM2 Ecosystem Dosyası
```bash
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'trendyol-reviews',
    script: 'npm',
    args: 'start',
    cwd: '/home/trendyol-app/apps/trendyol-reviews',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
EOF
```

### Uygulamayı Başlatın
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### PM2 Startup Script'ini Çalıştırın
```bash
# PM2'nin verdiği komutu root olarak çalıştırın
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u trendyol-app --hp /home/trendyol-app
```

## 🌐 7. Nginx Konfigürasyonu

### Root kullanıcısına geçin
```bash
exit  # trendyol-app kullanıcısından çık
```

### Nginx Site Konfigürasyonu
```bash
cat > /etc/nginx/sites-available/trendyol-reviews << 'EOF'
server {
    listen 80;
    server_name YOUR_DOMAIN.com www.YOUR_DOMAIN.com;  # Domain'inizi yazın
    
    # Eğer domain yoksa, sadece IP kullanın:
    # server_name YOUR_SERVER_IP;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files
    location /static/ {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
EOF
```

### Site'ı Aktifleştirin
```bash
# Varsayılan site'ı devre dışı bırak
rm -f /etc/nginx/sites-enabled/default

# Yeni site'ı aktifleştir
ln -s /etc/nginx/sites-available/trendyol-reviews /etc/nginx/sites-enabled/

# Nginx konfigürasyonunu test et
nginx -t

# Nginx'i yeniden başlat
systemctl restart nginx
```

## 🔒 8. SSL Sertifikası (Domain varsa)

```bash
# Let's Encrypt SSL sertifikası
certbot --nginx -d YOUR_DOMAIN.com -d www.YOUR_DOMAIN.com

# Otomatik yenileme test et
certbot renew --dry-run
```

## 🔧 9. Konfigürasyon Güncellemeleri

### API Base URL'ini Güncelleyin
```bash
su - trendyol-app
cd /home/trendyol-app/apps/trendyol-reviews

# woocommerce-snippet.js dosyasını düzenleyin
nano public/static/woocommerce-snippet.js
```

Dosyada şu satırı bulun ve güncelleyin:
```javascript
API_BASE_URL: 'https://YOUR_DOMAIN.com/api', // Kendi domain'inizi yazın
```

### SKU Mapping'ini Güncelleyin
```bash
nano app/api/reviews/route.ts
```

`skuMapping` objesini kendi ürünlerinize göre güncelleyin.

## 🔄 10. Uygulamayı Yeniden Başlatma

```bash
# Build ve restart
npm run build
pm2 restart trendyol-reviews
```

## 📊 11. Monitoring ve Loglar

### PM2 Durumunu Kontrol Etme
```bash
pm2 status
pm2 logs trendyol-reviews
pm2 monit
```

### Nginx Logları
```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Sistem Kaynaklarını Kontrol Etme
```bash
htop
df -h
free -h
```

## 🔧 12. Güvenlik Ayarları

### SSH Güvenliği
```bash
# /etc/ssh/sshd_config dosyasını düzenle
nano /etc/ssh/sshd_config

# Şu ayarları yapın:
# PermitRootLogin no
# PasswordAuthentication no
# Port 2222  # Varsayılan port değiştir

# SSH'ı yeniden başlat
systemctl restart ssh

# UFW'de yeni portu aç
ufw allow 2222
ufw delete allow ssh
```

### Fail2Ban Kurulumu
```bash
apt install -y fail2ban

cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = 2222
EOF

systemctl enable fail2ban
systemctl start fail2ban
```

## 🚀 13. Performans Optimizasyonu

### Swap Dosyası Oluşturma
```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### Nginx Gzip Kompresyonu
```bash
# /etc/nginx/nginx.conf dosyasına ekleyin:
nano /etc/nginx/nginx.conf

# http bloğuna ekleyin:
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_proxied expired no-cache no-store private must-revalidate auth;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
```

## 📝 14. Backup Stratejisi

### Otomatik Backup Script'i
```bash
cat > /home/trendyol-app/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/trendyol-app/backups"
APP_DIR="/home/trendyol-app/apps/trendyol-reviews"

mkdir -p $BACKUP_DIR

# Uygulama dosyalarını yedekle
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz -C $APP_DIR .

# Eski yedekleri sil (7 günden eski)
find $BACKUP_DIR -name "app_backup_*.tar.gz" -mtime +7 -delete

echo "Backup completed: app_backup_$DATE.tar.gz"
EOF

chmod +x /home/trendyol-app/backup.sh

# Crontab'a ekle (günlük 2:00'da)
crontab -e
# Şu satırı ekleyin:
# 0 2 * * * /home/trendyol-app/backup.sh
```

## ✅ 15. Test ve Doğrulama

### Uygulama Testi
```bash
# Uygulamanın çalıştığını kontrol et
curl http://localhost:3000

# API endpoint'ini test et
curl http://localhost:3000/api/reviews?sku=sample-sku

# Dış erişimi test et
curl http://YOUR_DOMAIN.com
```

### WooCommerce Entegrasyonu Testi
1. WooCommerce sitenizde script'i ekleyin
2. Ürün sayfasında yorumların göründüğünü kontrol edin
3. Tarayıcı konsolunda hata olmadığını kontrol edin

## 🆘 Sorun Giderme

### Yaygın Sorunlar

**Uygulama başlamıyor:**
```bash
pm2 logs trendyol-reviews
npm run build
```

**Nginx 502 hatası:**
```bash
systemctl status nginx
pm2 status
```

**SSL sertifikası sorunu:**
```bash
certbot certificates
certbot renew
```

**Port erişim sorunu:**
```bash
ufw status
netstat -tlnp | grep :3000
```

## 📞 Destek

Sorun yaşarsanız:
1. PM2 loglarını kontrol edin: `pm2 logs`
2. Nginx loglarını kontrol edin: `tail -f /var/log/nginx/error.log`
3. Sistem kaynaklarını kontrol edin: `htop`, `df -h`

## 🎉 Tamamlandı!

Artık Hetzner sunucunuzda Next.js Trendyol yorumları projesi çalışıyor!

**Erişim URL'leri:**
- Ana sayfa: `http://YOUR_DOMAIN.com` veya `http://YOUR_SERVER_IP`
- Demo sayfası: `http://YOUR_DOMAIN.com/demo`
- API: `http://YOUR_DOMAIN.com/api/reviews?sku=SAMPLE-SKU`

**WooCommerce Entegrasyonu:**
```html
<script src="http://YOUR_DOMAIN.com/static/woocommerce-snippet.js" defer></script>
```