#!/bin/bash

# Nginx CORS Düzeltme Script'i

DOMAIN="yorum.isletmemdijitalde.com"

echo "Nginx'e CORS headers ekleniyor..."

# Mevcut konfigürasyonu yedekle
cp /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-available/$DOMAIN.backup

# Yeni konfigürasyon oluştur
cat > /etc/nginx/sites-available/$DOMAIN << 'EOF'
server {
    listen 80;
    server_name yorum.isletmemdijitalde.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yorum.isletmemdijitalde.com;

    # SSL Configuration
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

    # API endpoints with CORS
    location /api/ {
        # CORS Headers
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization" always;
        
        # Handle preflight requests
        if ($request_method = OPTIONS) {
            add_header Access-Control-Allow-Origin "*";
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
            add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization";
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }
        
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

# Nginx test et
if nginx -t; then
    echo "✅ Nginx konfigürasyonu geçerli"
    systemctl reload nginx
    echo "✅ Nginx yeniden yüklendi"
    
    # CORS testini yap
    echo "🧪 CORS testi yapılıyor..."
    sleep 2
    
    CORS_TEST=$(curl -s -I -H "Origin: https://dukkan.madetoll.com.tr" \
                     -H "Access-Control-Request-Method: GET" \
                     -X OPTIONS \
                     https://yorum.isletmemdijitalde.com/api/reviews)
    
    if echo "$CORS_TEST" | grep -q "Access-Control-Allow-Origin"; then
        echo "✅ CORS headers başarıyla eklendi"
        echo "🌐 Test URL: https://yorum.isletmemdijitalde.com/api/reviews?sku=test"
    else
        echo "⚠️ CORS headers görünmüyor, manuel kontrol edin"
    fi
    
else
    echo "❌ Nginx konfigürasyonu hatalı, yedek geri yükleniyor"
    cp /etc/nginx/sites-available/$DOMAIN.backup /etc/nginx/sites-available/$DOMAIN
    systemctl reload nginx
    exit 1
fi

echo "🎉 CORS headers başarıyla eklendi!"
echo "📋 Test için tarayıcı konsolunda:"
echo "fetch('https://yorum.isletmemdijitalde.com/api/reviews?sku=test').then(r=>r.json()).then(console.log)"