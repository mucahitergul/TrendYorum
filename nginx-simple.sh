#!/bin/bash

# Basit HTTP-only Nginx Konfigürasyonu
# SSL sonradan Certbot ile otomatik eklenecek

DOMAIN="yorum.isletmemdijitalde.com"

echo "Basit HTTP Nginx konfigürasyonu oluşturuluyor..."

# Hatalı konfigürasyonu kaldır
rm -f /etc/nginx/sites-enabled/$DOMAIN
rm -f /etc/nginx/sites-available/$DOMAIN

# Basit HTTP-only konfigürasyon
cat > /etc/nginx/sites-available/$DOMAIN << 'EOF'
server {
    listen 80;
    server_name yorum.isletmemdijitalde.com;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;

    # Main application
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

    # API endpoints
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

# Site'ı aktifleştir
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/

# Nginx test et
if nginx -t; then
    echo "✅ Nginx konfigürasyonu geçerli"
    systemctl restart nginx
    echo "✅ Nginx yeniden başlatıldı"
    
    # Uygulama çalışıyor mu kontrol et
    if curl -s http://localhost:3000 > /dev/null; then
        echo "✅ Uygulama çalışıyor"
    else
        echo "⚠️ Uygulama henüz başlamamış, PM2 durumunu kontrol edin"
        sudo -u trendyol pm2 status
    fi
    
    # SSL sertifikası kur
    echo "SSL sertifikası kuruluyor..."
    if certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN; then
        echo "✅ SSL sertifikası başarıyla kuruldu"
        echo "🌐 Site erişilebilir: https://$DOMAIN"
    else
        echo "⚠️ SSL sertifikası kurulamadı"
        echo "🌐 Site erişilebilir: http://$DOMAIN"
        echo "Manuel SSL kurulumu için: certbot --nginx -d $DOMAIN"
    fi
else
    echo "❌ Nginx konfigürasyonu hala hatalı!"
    nginx -t
    exit 1
fi

echo "🎉 Kurulum tamamlandı!"
echo "📊 Sistem durumu:"
echo "- PM2: $(sudo -u trendyol pm2 jlist | jq -r '.[0].pm2_env.status' 2>/dev/null || echo 'unknown')"
echo "- Nginx: $(systemctl is-active nginx)"
echo "- Port 3000: $(ss -tlnp | grep :3000 | wc -l) bağlantı"