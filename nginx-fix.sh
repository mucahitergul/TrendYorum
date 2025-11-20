#!/bin/bash

# Nginx Konfigürasyon Düzeltme Script'i
# Kullanım: chmod +x nginx-fix.sh && ./nginx-fix.sh

DOMAIN="yorum.isletmemdijitalde.com"  # Kendi domain'inizi yazın

echo "Nginx konfigürasyonu düzeltiliyor..."

# Hatalı konfigürasyonu kaldır
rm -f /etc/nginx/sites-enabled/$DOMAIN
rm -f /etc/nginx/sites-available/$DOMAIN

# Yeni temiz konfigürasyon oluştur
cat > /etc/nginx/sites-available/$DOMAIN << 'EOF'
server {
    listen 80;
    server_name yorum.isletmemdijitalde.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yorum.isletmemdijitalde.com;

    # SSL Configuration (will be updated by Certbot)
    ssl_certificate /etc/letsencrypt/live/yorum.isletmemdijitalde.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yorum.isletmemdijitalde.com/privkey.pem;
    
    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

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
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files with long cache
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

    # Robots.txt
    location /robots.txt {
        return 200 "User-agent: *\nDisallow: /api/\nAllow: /\n";
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
else
    echo "❌ Nginx konfigürasyonu hala hatalı!"
    exit 1
fi

# SSL sertifikası kur
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo "SSL sertifikası kuruluyor..."
    certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
fi

echo "🎉 Nginx konfigürasyonu düzeltildi!"