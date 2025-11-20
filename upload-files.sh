#!/bin/bash

# Hetzner Sunucusuna Proje Dosyalarını Yükleme Script'i
# Kullanım: chmod +x upload-files.sh && ./upload-files.sh

set -e

# Renkli çıktı için
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              Proje Dosyalarını Sunucuya Yükleme             ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Kullanıcı bilgilerini al
read -p "Sunucu IP adresi: " SERVER_IP
read -p "SSH kullanıcısı (varsayılan: trendyol-app): " SSH_USER
SSH_USER=${SSH_USER:-trendyol-app}

read -p "SSH portu (varsayılan: 22): " SSH_PORT
SSH_PORT=${SSH_PORT:-22}

echo -e "${YELLOW}Sunucu bilgileri:${NC}"
echo "IP: $SERVER_IP"
echo "Kullanıcı: $SSH_USER"
echo "Port: $SSH_PORT"
echo ""

# Bağlantıyı test et
echo -e "${BLUE}Sunucu bağlantısı test ediliyor...${NC}"
if ! ssh -p $SSH_PORT -o ConnectTimeout=10 $SSH_USER@$SERVER_IP "echo 'Bağlantı başarılı'" 2>/dev/null; then
    echo -e "${RED}❌ Sunucuya bağlanılamıyor! SSH ayarlarını kontrol edin.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Sunucu bağlantısı başarılı${NC}"

# Proje dizinini kontrol et
REMOTE_DIR="/home/$SSH_USER/apps/trendyol-reviews"
echo -e "${BLUE}Uzak dizin kontrol ediliyor: $REMOTE_DIR${NC}"

ssh -p $SSH_PORT $SSH_USER@$SERVER_IP "mkdir -p $REMOTE_DIR/{app/{api/reviews,demo},public/static}"

# Dosyaları kontrol et ve yükle
echo -e "${BLUE}Proje dosyaları yükleniyor...${NC}"

# 1. Demo sayfası
if [ -f "app/demo/page.tsx" ]; then
    echo -e "${YELLOW}📄 Demo sayfası yükleniyor...${NC}"
    scp -P $SSH_PORT app/demo/page.tsx $SSH_USER@$SERVER_IP:$REMOTE_DIR/app/demo/
    echo -e "${GREEN}✅ app/demo/page.tsx yüklendi${NC}"
else
    echo -e "${RED}❌ app/demo/page.tsx bulunamadı${NC}"
fi

# 2. API route
if [ -f "app/api/reviews/route.ts" ]; then
    echo -e "${YELLOW}📄 API route yükleniyor...${NC}"
    scp -P $SSH_PORT app/api/reviews/route.ts $SSH_USER@$SERVER_IP:$REMOTE_DIR/app/api/reviews/
    echo -e "${GREEN}✅ app/api/reviews/route.ts yüklendi${NC}"
else
    echo -e "${RED}❌ app/api/reviews/route.ts bulunamadı${NC}"
fi

# 3. WooCommerce snippet
if [ -f "public/static/woocommerce-snippet.js" ]; then
    echo -e "${YELLOW}📄 WooCommerce snippet yükleniyor...${NC}"
    scp -P $SSH_PORT public/static/woocommerce-snippet.js $SSH_USER@$SERVER_IP:$REMOTE_DIR/public/static/
    echo -e "${GREEN}✅ public/static/woocommerce-snippet.js yüklendi${NC}"
else
    echo -e "${RED}❌ public/static/woocommerce-snippet.js bulunamadı${NC}"
fi

# 4. CSS dosyası
if [ -f "public/static/trendyol.css" ]; then
    echo -e "${YELLOW}📄 CSS dosyası yükleniyor...${NC}"
    scp -P $SSH_PORT public/static/trendyol.css $SSH_USER@$SERVER_IP:$REMOTE_DIR/public/static/
    echo -e "${GREEN}✅ public/static/trendyol.css yüklendi${NC}"
else
    echo -e "${RED}❌ public/static/trendyol.css bulunamadı${NC}"
fi

# 5. Konfigürasyon dosyaları (varsa)
CONFIG_FILES=("next.config.js" "tailwind.config.ts" "tsconfig.json" "postcss.config.js" "package.json")

for file in "${CONFIG_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${YELLOW}📄 $file yükleniyor...${NC}"
        scp -P $SSH_PORT "$file" $SSH_USER@$SERVER_IP:$REMOTE_DIR/
        echo -e "${GREEN}✅ $file yüklendi${NC}"
    fi
done

# 6. Dokümantasyon dosyaları (opsiyonel)
DOC_FILES=("WOOCOMMERCE_INTEGRATION.md" "HETZNER_DEPLOYMENT.md" "README.md")

echo -e "${YELLOW}Dokümantasyon dosyaları yüklensin mi? (y/n):${NC}"
read -p "" UPLOAD_DOCS

if [ "$UPLOAD_DOCS" = "y" ] || [ "$UPLOAD_DOCS" = "Y" ]; then
    for file in "${DOC_FILES[@]}"; do
        if [ -f "$file" ]; then
            echo -e "${YELLOW}📄 $file yükleniyor...${NC}"
            scp -P $SSH_PORT "$file" $SSH_USER@$SERVER_IP:$REMOTE_DIR/
            echo -e "${GREEN}✅ $file yüklendi${NC}"
        fi
    done
fi

# Dosya izinlerini düzelt
echo -e "${BLUE}Dosya izinleri düzeltiliyor...${NC}"
ssh -p $SSH_PORT $SSH_USER@$SERVER_IP "chown -R $SSH_USER:$SSH_USER $REMOTE_DIR && chmod -R 755 $REMOTE_DIR"

# API Base URL'ini güncelle
echo -e "${YELLOW}API Base URL'ini güncellemek ister misiniz? (y/n):${NC}"
read -p "" UPDATE_API_URL

if [ "$UPDATE_API_URL" = "y" ] || [ "$UPDATE_API_URL" = "Y" ]; then
    read -p "Domain adınız (örn: example.com): " DOMAIN
    if [ ! -z "$DOMAIN" ]; then
        echo -e "${BLUE}API Base URL güncelleniyor...${NC}"
        ssh -p $SSH_PORT $SSH_USER@$SERVER_IP "sed -i \"s|API_BASE_URL: 'https://your-domain.com/api'|API_BASE_URL: 'https://$DOMAIN/api'|g\" $REMOTE_DIR/public/static/woocommerce-snippet.js"
        echo -e "${GREEN}✅ API Base URL güncellendi: https://$DOMAIN/api${NC}"
    fi
fi

# Projeyi build et ve yeniden başlat
echo -e "${YELLOW}Projeyi build etmek ve yeniden başlatmak ister misiniz? (y/n):${NC}"
read -p "" BUILD_PROJECT

if [ "$BUILD_PROJECT" = "y" ] || [ "$BUILD_PROJECT" = "Y" ]; then
    echo -e "${BLUE}Proje build ediliyor...${NC}"
    ssh -p $SSH_PORT $SSH_USER@$SERVER_IP "cd $REMOTE_DIR && npm install && npm run build"
    
    echo -e "${BLUE}PM2 ile yeniden başlatılıyor...${NC}"
    ssh -p $SSH_PORT $SSH_USER@$SERVER_IP "pm2 restart trendyol-reviews || pm2 start ecosystem.config.js"
    
    echo -e "${GREEN}✅ Proje başarıyla güncellendi ve yeniden başlatıldı${NC}"
fi

# Özet bilgiler
echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                  DOSYA YÜKLEME TAMAMLANDI!                  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${YELLOW}Yüklenen Dosyalar:${NC}"
echo "📁 Uzak Dizin: $REMOTE_DIR"
echo ""

echo -e "${YELLOW}Sonraki Adımlar:${NC}"
echo "1. 🔧 SKU mapping'ini yapılandırın:"
echo "   ssh -p $SSH_PORT $SSH_USER@$SERVER_IP"
echo "   nano $REMOTE_DIR/app/api/reviews/route.ts"
echo ""
echo "2. 📊 Uygulama durumunu kontrol edin:"
echo "   ssh -p $SSH_PORT $SSH_USER@$SERVER_IP 'pm2 status'"
echo ""
echo "3. 🌐 Siteyi test edin:"
echo "   http://$SERVER_IP (veya domain'iniz)"
echo ""
echo "4. 📋 Logları kontrol edin:"
echo "   ssh -p $SSH_PORT $SSH_USER@$SERVER_IP 'pm2 logs trendyol-reviews'"
echo ""

# Test bağlantısı öner
echo -e "${YELLOW}Şimdi siteyi test etmek ister misiniz? (y/n):${NC}"
read -p "" TEST_SITE

if [ "$TEST_SITE" = "y" ] || [ "$TEST_SITE" = "Y" ]; then
    echo -e "${BLUE}Site testi yapılıyor...${NC}"
    
    # Ana sayfa testi
    if curl -s -o /dev/null -w "%{http_code}" http://$SERVER_IP | grep -q "200"; then
        echo -e "${GREEN}✅ Ana sayfa erişilebilir: http://$SERVER_IP${NC}"
    else
        echo -e "${RED}❌ Ana sayfaya erişilemiyor${NC}"
    fi
    
    # API testi
    if curl -s -o /dev/null -w "%{http_code}" http://$SERVER_IP/api/reviews?sku=sample-sku | grep -q "200"; then
        echo -e "${GREEN}✅ API endpoint çalışıyor: http://$SERVER_IP/api/reviews?sku=sample-sku${NC}"
    else
        echo -e "${RED}❌ API endpoint'ine erişilemiyor${NC}"
    fi
    
    # Demo sayfası testi
    if curl -s -o /dev/null -w "%{http_code}" http://$SERVER_IP/demo | grep -q "200"; then
        echo -e "${GREEN}✅ Demo sayfası erişilebilir: http://$SERVER_IP/demo${NC}"
    else
        echo -e "${RED}❌ Demo sayfasına erişilemiyor${NC}"
    fi
fi

echo ""
echo -e "${GREEN}Dosya yükleme işlemi tamamlandı! 🚀${NC}"