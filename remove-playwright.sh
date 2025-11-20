#!/bin/bash

# Playwright'ı Kaldırma Script'i
# Production ortamında Playwright genellikle gereksizdir

echo "Playwright kaldırılıyor..."

cd /home/trendyol/app

# Package.json'dan playwright'ı kaldır
echo "Package.json güncelleniyor..."
sudo -u trendyol npm uninstall playwright

# Node_modules'ı temizle
echo "Node modules temizleniyor..."
sudo -u trendyol rm -rf node_modules package-lock.json

# Bağımlılıkları yeniden yükle
echo "Bağımlılıklar yeniden yükleniyor..."
sudo -u trendyol npm install

# Build et
echo "Proje build ediliyor..."
sudo -u trendyol npm run build

# PM2 yeniden başlat
echo "PM2 yeniden başlatılıyor..."
sudo -u trendyol pm2 restart trendyol-reviews

# Durum kontrol et
echo "Durum kontrol ediliyor..."
sudo -u trendyol pm2 status

# Site testi
echo "Site testi yapılıyor..."
sleep 3
if curl -s -o /dev/null -w "%{http_code}" https://yorum.isletmemdijitalde.com | grep -q "200"; then
    echo "✅ Site çalışıyor: https://yorum.isletmemdijitalde.com"
else
    echo "⚠️ Site henüz hazır değil, birkaç saniye bekleyin"
fi

echo "🎉 Playwright kaldırıldı, sistem temizlendi!"