#!/bin/bash

# Hetzner Subdomain Otomatik Kurulum Script'i
# Trendyol Yorumları Projesi - Uzak Veritabanı ile
# Kullanım: chmod +x auto-deploy-subdomain.sh && ./auto-deploy-subdomain.sh

set -e

# Renkli çıktı için
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logo ve başlık
clear
echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                    TRENDYOL YORUMLARI SUBDOMAIN KURULUMU                    ║"
echo "║                          Hetzner Cloud Otomatik Deployment                  ║"
echo "║                                                                              ║"
echo "║  🚀 Otomatik kurulum                                                        ║"
echo "║  🌐 Subdomain yapılandırması                                               ║"
echo "║  🗄️ Uzak veritabanı bağlantısı                                             ║"
echo "║  🔒 SSL sertifikası                                                         ║"
echo "║  ⚡ PM2 process manager                                                     ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Sistem kontrolü
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Bu script root kullanıcısı ile çalıştırılmalıdır!${NC}"
    echo "Kullanım: sudo ./auto-deploy-subdomain.sh"
    exit 1
fi

# İşletim sistemi kontrolü
if ! grep -q "Ubuntu" /etc/os-release; then
    echo -e "${RED}❌ Bu script sadece Ubuntu için tasarlanmıştır!${NC}"
    exit 1
fi

echo -e "${BLUE}Sistem bilgileri:${NC}"
echo "OS: $(lsb_release -d | cut -f2)"
echo "Kernel: $(uname -r)"
echo "Architecture: $(uname -m)"
echo "Memory: $(free -h | awk '/^Mem:/ {print $2}')"
echo "Disk: $(df -h / | awk 'NR==2 {print $4 " available"}')"
echo ""

# Kullanıcı bilgilerini al
echo -e "${YELLOW}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║                    KURULUM BİLGİLERİ                          ║${NC}"
echo -e "${YELLOW}╚═══════════════════════════════════════════════════════════════╝${NC}"

read -p "Ana domain adınız (örn: example.com): " DOMAIN
read -p "Subdomain adı (örn: reviews): " SUBDOMAIN
read -p "Uygulama kullanıcı adı (varsayılan: trendyol): " APP_USER
APP_USER=${APP_USER:-trendyol}

# Email adresi SSL için
read -p "Email adresiniz (SSL sertifikası için): " EMAIL

# Veritabanı bilgileri
echo ""
echo -e "${YELLOW}Uzak veritabanı bilgilerini girin:${NC}"
read -p "Veritabanı Host: " DB_HOST
read -p "Veritabanı Port (varsayılan: 5432): " DB_PORT
DB_PORT=${DB_PORT:-5432}
read -p "Veritabanı Adı: " DB_NAME
read -p "Veritabanı Kullanıcısı: " DB_USER
read -s -p "Veritabanı Şifresi: " DB_PASSWORD
echo ""

# Konfigürasyon özeti
echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                    KURULUM ÖZETİ                              ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo -e "${BLUE}Domain:${NC} $SUBDOMAIN.$DOMAIN"
echo -e "${BLUE}Uygulama Kullanıcısı:${NC} $APP_USER"
echo -e "${BLUE}Email:${NC} $EMAIL"
echo -e "${BLUE}Veritabanı:${NC} $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
echo -e "${BLUE}Proje Dizini:${NC} /home/$APP_USER/app"
echo ""

read -p "Bu bilgilerle kuruluma devam edilsin mi? (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo -e "${RED}Kurulum iptal edildi.${NC}"
    exit 1
fi

# Değişkenler
FULL_DOMAIN="$SUBDOMAIN.$DOMAIN"
APP_DIR="/home/$APP_USER/app"

echo ""
echo -e "${GREEN}🚀 Kurulum başlıyor...${NC}"
sleep 2

# 1. Sistem güncellemesi
echo -e "${BLUE}[1/15] Sistem güncelleniyor...${NC}"
apt update && apt upgrade -y
echo -e "${GREEN}✅ Sistem güncellemesi tamamlandı${NC}"

# 2. Gerekli paketleri yükle
echo -e "${BLUE}[2/15] Gerekli paketler yükleniyor...${NC}"
apt install -y curl wget git unzip software-properties-common nginx certbot python3-certbot-nginx \
    ufw htop tree postgresql-client build-essential
echo -e "${GREEN}✅ Gerekli paketler yüklendi${NC}"

# 3. Firewall ayarları
echo -e "${BLUE}[3/15] Firewall ayarlanıyor...${NC}"
ufw --force enable
ufw allow ssh
ufw allow 'Nginx Full'
ufw allow 80
ufw allow 443
echo -e "${GREEN}✅ Firewall ayarlandı${NC}"

# 4. Node.js kurulumu
echo -e "${BLUE}[4/15] Node.js 20.x kuruluyor...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs

# Node.js versiyonunu kontrol et
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
echo -e "${GREEN}✅ Node.js kuruldu: $NODE_VERSION, npm: $NPM_VERSION${NC}"

# 5. PM2 kurulumu
echo -e "${BLUE}[5/15] PM2 kuruluyor...${NC}"
npm install -g pm2
echo -e "${GREEN}✅ PM2 kuruldu: $(pm2 --version)${NC}"

# 6. Uygulama kullanıcısı oluştur
echo -e "${BLUE}[6/15] Uygulama kullanıcısı oluşturuluyor...${NC}"
if ! id "$APP_USER" &>/dev/null; then
    adduser --disabled-password --gecos "" $APP_USER
    usermod -aG sudo $APP_USER
    
    # SSH anahtarını kopyala
    mkdir -p /home/$APP_USER/.ssh
    if [ -f /root/.ssh/authorized_keys ]; then
        cp /root/.ssh/authorized_keys /home/$APP_USER/.ssh/
        chown -R $APP_USER:$APP_USER /home/$APP_USER/.ssh
        chmod 700 /home/$APP_USER/.ssh
        chmod 600 /home/$APP_USER/.ssh/authorized_keys
    fi
    echo -e "${GREEN}✅ Kullanıcı '$APP_USER' oluşturuldu${NC}"
else
    echo -e "${YELLOW}⚠️ Kullanıcı '$APP_USER' zaten mevcut${NC}"
fi

# 7. Proje dizini oluştur
echo -e "${BLUE}[7/15] Proje dizini hazırlanıyor...${NC}"
sudo -u $APP_USER mkdir -p $APP_DIR
cd $APP_DIR
echo -e "${GREEN}✅ Proje dizini oluşturuldu: $APP_DIR${NC}"

# 8. Veritabanı bağlantısı test et
echo -e "${BLUE}[8/15] Veritabanı bağlantısı test ediliyor...${NC}"
if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1;" &> /dev/null; then
    echo -e "${GREEN}✅ Veritabanı bağlantısı başarılı${NC}"
else
    echo -e "${RED}❌ Veritabanı bağlantısı başarısız!${NC}"
    echo -e "${YELLOW}Lütfen aşağıdaki bilgileri kontrol edin:${NC}"
    echo "Host: $DB_HOST"
    echo "Port: $DB_PORT"
    echo "Database: $DB_NAME"
    echo "User: $DB_USER"
    read -p "Devam etmek istiyor musunuz? (y/n): " CONTINUE
    if [ "$CONTINUE" != "y" ] && [ "$CONTINUE" != "Y" ]; then
        exit 1
    fi
fi

# 9. Package.json oluştur
echo -e "${BLUE}[9/15] Package.json oluşturuluyor...${NC}"
sudo -u $APP_USER cat > package.json << 'EOF'
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
    "react-dom": "^18.0.0",
    "pg": "^8.11.0",
    "@types/pg": "^8.10.0"
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
echo -e "${GREEN}✅ Package.json oluşturuldu${NC}"

# 10. Next.js konfigürasyon dosyaları oluştur
echo -e "${BLUE}[10/15] Next.js konfigürasyon dosyaları oluşturuluyor...${NC}"

# next.config.js
sudo -u $APP_USER cat > next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    API_BASE_URL: process.env.API_BASE_URL,
  },
}

module.exports = nextConfig
EOF

# tailwind.config.ts
sudo -u $APP_USER cat > tailwind.config.ts << 'EOF'
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
export default config
EOF

# tsconfig.json
sudo -u $APP_USER cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
EOF

# postcss.config.js
sudo -u $APP_USER cat > postcss.config.js << 'EOF'
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF

echo -e "${GREEN}✅ Konfigürasyon dosyaları oluşturuldu${NC}"

# 11. Environment dosyası oluştur
echo -e "${BLUE}[11/15] Environment dosyası oluşturuluyor...${NC}"
sudo -u $APP_USER cat > .env.local << EOF
# Database Configuration
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"
DB_HOST="$DB_HOST"
DB_PORT="$DB_PORT"
DB_NAME="$DB_NAME"
DB_USER="$DB_USER"
DB_PASSWORD="$DB_PASSWORD"

# Application Configuration
NODE_ENV="production"
NEXT_PUBLIC_API_URL="https://$FULL_DOMAIN"
API_BASE_URL="https://$FULL_DOMAIN/api"

# Security
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="https://$FULL_DOMAIN"

# Trendyol API Configuration
TRENDYOL_API_BASE="https://public-mdc.trendyol.com"
CACHE_TTL="3600"
EOF

# Set proper permissions for .env file
chown $APP_USER:$APP_USER .env.local
chmod 600 .env.local
echo -e "${GREEN}✅ Environment dosyası oluşturuldu${NC}"

# 12. Proje dosya yapısını oluştur  
echo -e "${BLUE}[12/15] Temel proje yapısı oluşturuluyor...${NC}"

# Ana dizinleri oluştur
sudo -u $APP_USER mkdir -p app/{api/reviews,demo} public/static

# Ana layout dosyası
sudo -u $APP_USER cat > app/layout.tsx << 'EOF'
import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Trendyol Yorumları',
  description: 'WooCommerce için Trendyol yorumları entegrasyonu',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  )
}
EOF

# globals.css
sudo -u $APP_USER cat > app/globals.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;
EOF

# Ana sayfa
sudo -u $APP_USER cat > app/page.tsx << 'EOF'
export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Trendyol Yorumları
        </h1>
        <p className="text-gray-600 mb-8">
          WooCommerce entegrasyonu için Trendyol yorumları sistemi
        </p>
        <div className="space-y-4">
          <a
            href="/demo"
            className="block w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Demo Sayfası
          </a>
          <a
            href="/api/reviews?sku=sample-sku"
            className="block w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            API Test
          </a>
        </div>
        <div className="mt-8 text-sm text-gray-500">
          <p>Subdomain: {window.location.hostname}</p>
          <p>Environment: Production</p>
        </div>
      </div>
    </div>
  )
}
EOF

echo -e "${GREEN}✅ Temel proje yapısı oluşturuldu${NC}"

# Proje dosyalarını GitHub'dan otomatik indir
echo -e "${BLUE}[12/15] Proje dosyaları GitHub'dan indiriliyor...${NC}"

cd /home/$APP_USER
# Script'in çalıştırıldığı dizini kontrol et
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo -e "${BLUE}Script dizini: $SCRIPT_DIR${NC}"

# Eğer script TrendYorum dizininden çalıştırılıyorsa, o dosyaları kullan
if [[ "$SCRIPT_DIR" == *"TrendYorum"* ]] && [ -f "$SCRIPT_DIR/package.json" ]; then
    echo -e "${GREEN}✅ Mevcut TrendYorum dosyaları kullanılıyor${NC}"
    echo -e "${YELLOW}Proje dosyaları kopyalanıyor...${NC}"
    
    # Dosyaları kopyala (izin sorunlarını önlemek için root olarak)
    cp -r "$SCRIPT_DIR"/* app/ 2>/dev/null
    chown -R $APP_USER:$APP_USER app/
    
    echo -e "${GREEN}✅ Proje dosyaları başarıyla kopyalandı${NC}"
else
    echo -e "${YELLOW}TrendYorum dizininde değil, GitHub'dan indiriliyor...${NC}"
    if [ -d "TrendYorum" ]; then
        rm -rf TrendYorum
    fi
    
    if git clone https://github.com/mucahitergul/TrendYorum.git; then
        cp -r TrendYorum/* app/
        chown -R $APP_USER:$APP_USER app/
        rm -rf TrendYorum
        echo -e "${GREEN}✅ Proje dosyaları GitHub'dan indirildi${NC}"
    else
        echo -e "${RED}❌ GitHub'dan indirme başarısız!${NC}"
        exit 1
    fi
fi

# Dosya kontrolü
echo -e "${YELLOW}Proje dosyaları kontrol ediliyor...${NC}"
REQUIRED_FILES=(
    "app/demo/page.tsx"
    "app/api/reviews/route.ts" 
    "public/static/woocommerce-snippet.js"
    "public/static/trendyol.css"
)

MISSING_FILES=()
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "app/$file" ]; then
        MISSING_FILES+=("$file")
    fi
done

if [ ${#MISSING_FILES[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ Tüm gerekli dosyalar mevcut${NC}"
else
    echo -e "${YELLOW}⚠️ Eksik dosyalar: ${MISSING_FILES[*]}${NC}"
    echo -e "${BLUE}Bu dosyalar GitHub'dan indirilemedi, kurulum devam ediyor...${NC}"
fi

# API Base URL'ini otomatik güncelle
if [ -f "app/public/static/woocommerce-snippet.js" ]; then
    echo -e "${YELLOW}API Base URL güncelleniyor...${NC}"
    sudo -u $APP_USER sed -i "s|API_BASE_URL: 'https://your-domain.com/api'|API_BASE_URL: 'https://$FULL_DOMAIN/api'|g" app/public/static/woocommerce-snippet.js
    echo -e "${GREEN}✅ API Base URL güncellendi${NC}"
fi



# 13. Bağımlılıkları yükle ve build et
echo -e "${BLUE}[13/15] Bağımlılıklar yükleniyor ve proje build ediliyor...${NC}"
sudo -u $APP_USER npm install

# Build işlemi
echo -e "${BLUE}Proje build ediliyor...${NC}"
sudo -u $APP_USER npm run build

# PM2 ecosystem dosyası
sudo -u $APP_USER cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'trendyol-reviews',
    script: 'npm',
    args: 'start',
    cwd: '$APP_DIR',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '$APP_DIR/logs/err.log',
    out_file: '$APP_DIR/logs/out.log',
    log_file: '$APP_DIR/logs/combined.log',
    time: true
  }]
};
EOF

# Log dizini oluştur
sudo -u $APP_USER mkdir -p logs

# PM2 ile başlat
sudo -u $APP_USER pm2 start ecosystem.config.js
sudo -u $APP_USER pm2 save

# PM2 startup
sudo -u $APP_USER pm2 startup | grep "sudo env" | bash

echo -e "${GREEN}✅ Uygulama başlatıldı${NC}"

# 14. Nginx konfigürasyonu
echo -e "${BLUE}[14/15] Nginx konfigürasyonu yapılıyor...${NC}"

cat > /etc/nginx/sites-available/$FULL_DOMAIN << EOF
server {
    listen 80;
    server_name $FULL_DOMAIN;

    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $FULL_DOMAIN;

    # SSL Configuration (will be updated by Certbot)
    ssl_certificate /etc/letsencrypt/live/$FULL_DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$FULL_DOMAIN/privkey.pem;
    
    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Main application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
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
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # API specific headers
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization" always;
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
ln -sf /etc/nginx/sites-available/$FULL_DOMAIN /etc/nginx/sites-enabled/

# Varsayılan site'ı devre dışı bırak (eğer varsa)
if [ -f /etc/nginx/sites-enabled/default ]; then
    rm /etc/nginx/sites-enabled/default
fi

# Nginx konfigürasyonunu test et
if nginx -t; then
    echo -e "${GREEN}✅ Nginx konfigürasyonu geçerli${NC}"
else
    echo -e "${RED}❌ Nginx konfigürasyonu hatalı!${NC}"
    exit 1
fi

# Nginx'i yeniden başlat
systemctl restart nginx
echo -e "${GREEN}✅ Nginx konfigürasyonu tamamlandı${NC}"

# 15. SSL sertifikası
echo -e "${BLUE}[15/15] SSL sertifikası kuruluyor...${NC}"

# DNS kontrolü
echo -e "${BLUE}DNS kontrolü yapılıyor...${NC}"
if nslookup $FULL_DOMAIN | grep -q "$(curl -s ifconfig.me)"; then
    echo -e "${GREEN}✅ DNS kaydı doğru yapılandırılmış${NC}"
else
    echo -e "${YELLOW}⚠️ DNS kaydı henüz yayılmamış olabilir${NC}"
    echo -e "${CYAN}$FULL_DOMAIN A kaydının $(curl -s ifconfig.me) IP adresini göstermesi gerekiyor${NC}"
fi

# SSL sertifikası al
if certbot --nginx -d $FULL_DOMAIN --non-interactive --agree-tos --email $EMAIL; then
    echo -e "${GREEN}✅ SSL sertifikası başarıyla kuruldu${NC}"
    
    # Otomatik yenileme test et
    certbot renew --dry-run
    echo -e "${GREEN}✅ SSL otomatik yenileme ayarlandı${NC}"
else
    echo -e "${RED}❌ SSL sertifikası kurulumu başarısız!${NC}"
    echo -e "${YELLOW}Manuel olarak kurmayı deneyin: certbot --nginx -d $FULL_DOMAIN${NC}"
fi

# Swap dosyası oluştur (eğer yoksa)
echo -e "${BLUE}Swap dosyası kontrol ediliyor...${NC}"
if [ ! -f /swapfile ]; then
    echo -e "${BLUE}Swap dosyası oluşturuluyor...${NC}"
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo -e "${GREEN}✅ 2GB Swap dosyası oluşturuldu${NC}"
else
    echo -e "${YELLOW}⚠️ Swap dosyası zaten mevcut${NC}"
fi

# Backup script'i oluştur
echo -e "${BLUE}Backup script'i oluşturuluyor...${NC}"
sudo -u $APP_USER cat > /home/$APP_USER/backup.sh << EOF
#!/bin/bash
DATE=\$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/$APP_USER/backups"
APP_DIR="/home/$APP_USER/app"

mkdir -p \$BACKUP_DIR

# Uygulama dosyalarını yedekle
tar -czf \$BACKUP_DIR/app_backup_\$DATE.tar.gz -C \$APP_DIR .

# Eski yedekleri sil (7 günden eski)
find \$BACKUP_DIR -name "app_backup_*.tar.gz" -mtime +7 -delete

echo "Backup completed: app_backup_\$DATE.tar.gz"
EOF

chmod +x /home/$APP_USER/backup.sh

# Crontab için backup job'u öner
echo -e "${BLUE}Otomatik backup için crontab job'u oluşturuluyor...${NC}"
(sudo -u $APP_USER crontab -l 2>/dev/null; echo "0 2 * * * /home/$APP_USER/backup.sh") | sudo -u $APP_USER crontab -

# Sistem durumunu kontrol et
echo -e "${BLUE}Sistem durumu kontrol ediliyor...${NC}"
PM2_STATUS=$(sudo -u $APP_USER pm2 jlist | jq -r '.[0].pm2_env.status' 2>/dev/null || echo "unknown")
NGINX_STATUS=$(systemctl is-active nginx)

# Final test
echo -e "${BLUE}Final testler yapılıyor...${NC}"
sleep 5

# Local test
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
    echo -e "${GREEN}✅ Uygulama localhost'ta çalışıyor${NC}"
else
    echo -e "${RED}❌ Uygulama localhost'ta erişilemiyor${NC}"
fi

# HTTPS test
if curl -s -o /dev/null -w "%{http_code}" https://$FULL_DOMAIN | grep -q "200"; then
    echo -e "${GREEN}✅ HTTPS erişimi çalışıyor${NC}"
else
    echo -e "${YELLOW}⚠️ HTTPS erişimi henüz çalışmıyor (DNS yayılması bekleniyor olabilir)${NC}"
fi

# Kurulum tamamlandı
clear
echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                          KURULUM BAŞARIYLA TAMAMLANDI! 🎉                   ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                        ERİŞİM BİLGİLERİ                      ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo -e "${GREEN}🌐 Ana Sayfa:${NC} https://$FULL_DOMAIN"
echo -e "${GREEN}🧪 Demo Sayfası:${NC} https://$FULL_DOMAIN/demo"
echo -e "${GREEN}🔗 API Endpoint:${NC} https://$FULL_DOMAIN/api/reviews?sku=sample-sku"
echo -e "${GREEN}📊 Health Check:${NC} https://$FULL_DOMAIN/health"
echo ""

echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                    WOOCOMMERCE ENTEGRASYONU                  ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo -e "${YELLOW}WooCommerce sitenizde kullanmak için:${NC}"
echo ""
echo -e "${BLUE}HTML:${NC}"
echo "<script src=\"https://$FULL_DOMAIN/static/woocommerce-snippet.js\" defer></script>"
echo ""
echo -e "${BLUE}PHP (functions.php):${NC}"
echo "wp_enqueue_script('trendyol-reviews', 'https://$FULL_DOMAIN/static/woocommerce-snippet.js', array(), '1.0.0', true);"
echo ""

echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                      YÖNETİM KOMUTLARI                       ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo -e "${BLUE}Uygulama Durumu:${NC} sudo -u $APP_USER pm2 status"
echo -e "${BLUE}Logları Görüntüle:${NC} sudo -u $APP_USER pm2 logs trendyol-reviews"
echo -e "${BLUE}Yeniden Başlat:${NC} sudo -u $APP_USER pm2 restart trendyol-reviews"
echo -e "${BLUE}Nginx Test:${NC} nginx -t"
echo -e "${BLUE}Nginx Yeniden Başlat:${NC} systemctl restart nginx"
echo -e "${BLUE}SSL Yenile:${NC} certbot renew"
echo -e "${BLUE}Sistem Durumu:${NC} htop"
echo -e "${BLUE}Disk Kullanımı:${NC} df -h"
echo -e "${BLUE}Backup Çalıştır:${NC} sudo -u $APP_USER /home/$APP_USER/backup.sh"
echo ""

echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                      ÖNEMLİ DOSYALAR                         ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo -e "${BLUE}Proje Dizini:${NC} $APP_DIR"
echo -e "${BLUE}Environment:${NC} $APP_DIR/.env.local"
echo -e "${BLUE}Nginx Config:${NC} /etc/nginx/sites-available/$FULL_DOMAIN"
echo -e "${BLUE}PM2 Config:${NC} $APP_DIR/ecosystem.config.js"
echo -e "${BLUE}SSL Sertifikası:${NC} /etc/letsencrypt/live/$FULL_DOMAIN/"
echo -e "${BLUE}Loglar:${NC} $APP_DIR/logs/"
echo -e "${BLUE}Backup Script:${NC} /home/$APP_USER/backup.sh"
echo ""

echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                      SONRAKI ADIMLAR                         ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo -e "${YELLOW}1.${NC} SKU mapping'ini yapılandırın:"
echo "   nano $APP_DIR/app/api/reviews/route.ts"
echo ""
echo -e "${YELLOW}2.${NC} API Base URL'ini kontrol edin:"
echo "   nano $APP_DIR/public/static/woocommerce-snippet.js"
echo ""
echo -e "${YELLOW}3.${NC} DNS ayarlarınızı kontrol edin:"
echo "   $FULL_DOMAIN A kaydı -> $(curl -s ifconfig.me)"
echo ""
echo -e "${YELLOW}4.${NC} Veritabanı tablolarını oluşturun (gerekirse)"
echo ""
echo -e "${YELLOW}5.${NC} WooCommerce sitenizde entegrasyonu test edin"
echo ""

echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                      SİSTEM BİLGİLERİ                        ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo -e "${BLUE}Sunucu IP:${NC} $(curl -s ifconfig.me)"
echo -e "${BLUE}Node.js:${NC} $NODE_VERSION"
echo -e "${BLUE}PM2 Durumu:${NC} $PM2_STATUS"
echo -e "${BLUE}Nginx Durumu:${NC} $NGINX_STATUS"
echo -e "${BLUE}SSL Durumu:${NC} $([ -f /etc/letsencrypt/live/$FULL_DOMAIN/fullchain.pem ] && echo "Aktif" || echo "Pasif")"
echo -e "${BLUE}Disk Kullanımı:${NC} $(df -h / | awk 'NR==2 {print $5}')"
echo -e "${BLUE}Bellek Kullanımı:${NC} $(free -h | awk '/^Mem:/ {print $3"/"$2}')"
echo ""

echo -e "${GREEN}🎉 Kurulum başarıyla tamamlandı!${NC}"
echo -e "${GREEN}🚀 Trendyol Yorumları sistemi artık https://$FULL_DOMAIN adresinde çalışıyor!${NC}"
echo ""
echo -e "${YELLOW}Destek için: https://github.com/mucahitergul/TrendYorum/issues${NC}"
echo -e "${CYAN}İyi çalışmalar! 💪${NC}"