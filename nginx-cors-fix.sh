#!/bin/bash

# Nginx CORS Düzeltme Script'i

DOMAIN="yorum.isletmemdijitalde.com"

echo "Nginx'e CORS headers ekleniyor..."

# Mevcut konfigürasyonu yedekle
cp /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-available/$DOMAIN.backup

# API location bloğuna CORS ekle
sed -i '/location \/api\/ {/,/}/ {
    /proxy_set_header X-Forwarded-Proto/a\
        \
        # CORS Headers\
        add_header Access-Control-Allow-Origin "*" always;\
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;\
        add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization" always;\
        \
        # Handle preflight requests\
        if ($request_method = OPTIONS) {\
            return 204;\
        }
}' /etc/nginx/sites-available/$DOMAIN

# Nginx test et
if nginx -t; then
    echo "✅ Nginx konfigürasyonu geçerli"
    systemctl reload nginx
    echo "✅ Nginx yeniden yüklendi"
else
    echo "❌ Nginx konfigürasyonu hatalı, yedek geri yükleniyor"
    cp /etc/nginx/sites-available/$DOMAIN.backup /etc/nginx/sites-available/$DOMAIN
    exit 1
fi

echo "🎉 CORS headers eklendi!"