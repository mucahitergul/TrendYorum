#!/bin/bash

# Hetzner Sunucusunda Trendyol Yorumları Projesi Otomatik Kurulum Script'i
# Kullanım: chmod +x deploy.sh && ./deploy.sh

set -e

# Renkli çıktı için
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logo
echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                 Trendyol Yorumları Projesi                  ║"
echo "║                   Hetzner Deployment                        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Kullanıcı bilgilerini al
echo -e "${YELLOW}Kurulum bilgilerini girin:${NC}"
read -p "Domain adınız (opsiyonel, Enter'a basın): " DOMAIN
read -p "Sunucu IP adresiniz: " SERVER_IP

if [ -z "$DOMAIN" ]; then
    DOMAIN=$SERVER_IP
    echo -e "${YELLOW}Domain belirtilmedi, IP adresi kullanılacak: $SERVER_IP${NC}"
fi

echo -e "${GREEN}Kurulum başlıyor...${NC}"

# 1. Sistem güncellemesi
echo -e "${BLUE}[1/12] Sistem güncelleniyor...${NC}"
apt update && apt upgrade -y

# 2. Gerekli paketleri yükle
echo -e "${BLUE}[2/12] Gerekli paketler yükleniyor...${NC}"
apt install -y curl wget git unzip software-properties-common nginx certbot python3-certbot-nginx ufw htop

# 3. Firewall ayarları
echo -e "${BLUE}[3/12] Firewall ayarlanıyor...${NC}"
ufw --force enable
ufw allow ssh
ufw allow 'Nginx Full'

# 4. Node.js kurulumu
echo -e "${BLUE}[4/12] Node.js 20.x kuruluyor...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs

# 5. PM2 kurulumu
echo -e "${BLUE}[5/12] PM2 kuruluyor...${NC}"
npm install -g pm2

# 6. Uygulama kullanıcısı oluştur
echo -e "${BLUE}[6/12] Uygulama kullanıcısı oluşturuluyor...${NC}"
if ! id "trendyol-app" &>/dev/null; then
    adduser --disabled-password --gecos "" trendyol-app
    usermod -aG sudo trendyol-app
    
    # SSH anahtarını kopyala
    mkdir -p /home/trendyol-app/.ssh
    if [ -f /root/.ssh/authorized_keys ]; then
        cp /root/.ssh/authorized_keys /home/trendyol-app/.ssh/
        chown -R trendyol-app:trendyol-app /home/trendyol-app/.ssh
        chmod 700 /home/trendyol-app/.ssh
        chmod 600 /home/trendyol-app/.ssh/authorized_keys
    fi
fi

# 7. Proje dizini oluştur
echo -e "${BLUE}[7/12] Proje dizini hazırlanıyor...${NC}"
sudo -u trendyol-app mkdir -p /home/trendyol-app/apps/trendyol-reviews
cd /home/trendyol-app/apps/trendyol-reviews

# 8. Package.json oluştur
echo -e "${BLUE}[8/12] Package.json oluşturuluyor...${NC}"
sudo -u trendyol-app cat > package.json << 'EOF'
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

# 9. Next.js konfigürasyon dosyaları oluştur
echo -e "${BLUE}[9/12] Next.js konfigürasyon dosyaları oluşturuluyor...${NC}"

# next.config.js
sudo -u trendyol-app cat > next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
}

module.exports = nextConfig
EOF

# tailwind.config.ts
sudo -u trendyol-app cat > tailwind.config.ts << 'EOF'
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
sudo -u trendyol-app cat > tsconfig.json << 'EOF'
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
sudo -u trendyol-app cat > postcss.config.js << 'EOF'
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF

# 10. Proje dosya yapısını oluştur
echo -e "${BLUE}[10/12] Proje dosya yapısı oluşturuluyor...${NC}"

# Ana dizinleri oluştur
sudo -u trendyol-app mkdir -p app/{api/reviews,demo} public/static

# Ana layout dosyası
sudo -u trendyol-app cat > app/layout.tsx << 'EOF'
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
sudo -u trendyol-app cat > app/globals.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;
EOF

# Ana sayfa
sudo -u trendyol-app cat > app/page.tsx << 'EOF'
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
      </div>
    </div>
  )
}
EOF

echo -e "${YELLOW}Proje dosyalarını manuel olarak yüklemeniz gerekiyor:${NC}"
echo "1. app/demo/page.tsx"
echo "2. app/api/reviews/route.ts"
echo "3. public/static/woocommerce-snippet.js"
echo "4. public/static/trendyol.css"
echo ""
echo -e "${YELLOW}Bu dosyaları SCP ile yüklemek için:${NC}"
echo "scp app/demo/page.tsx trendyol-app@$SERVER_IP:/home/trendyol-app/apps/trendyol-reviews/app/demo/"
echo "scp app/api/reviews/route.ts trendyol-app@$SERVER_IP:/home/trendyol-app/apps/trendyol-reviews/app/api/reviews/"
echo "scp public/static/* trendyol-app@$SERVER_IP:/home/trendyol-app/apps/trendyol-reviews/public/static/"
echo ""
read -p "Dosyaları yükledikten sonra Enter'a basın..."

# 11. Bağımlılıkları yükle ve build et
echo -e "${BLUE}[11/12] Bağımlılıklar yükleniyor ve proje build ediliyor...${NC}"
sudo -u trendyol-app npm install
sudo -u trendyol-app npm run build

# PM2 ecosystem dosyası
sudo -u trendyol-app cat > ecosystem.config.js << 'EOF'
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

# PM2 ile başlat
sudo -u trendyol-app pm2 start ecosystem.config.js
sudo -u trendyol-app pm2 save

# PM2 startup
sudo -u trendyol-app pm2 startup | grep "sudo env" | bash

# 12. Nginx konfigürasyonu
echo -e "${BLUE}[12/12] Nginx konfigürasyonu yapılıyor...${NC}"

cat > /etc/nginx/sites-available/trendyol-reviews << EOF
server {
    listen 80;
    server_name $DOMAIN;

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
    }

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

# Varsayılan site'ı devre dışı bırak
rm -f /etc/nginx/sites-enabled/default

# Yeni site'ı aktifleştir
ln -s /etc/nginx/sites-available/trendyol-reviews /etc/nginx/sites-enabled/

# Nginx test et ve yeniden başlat
nginx -t
systemctl restart nginx

# SSL sertifikası (sadece domain varsa)
if [ "$DOMAIN" != "$SERVER_IP" ]; then
    echo -e "${YELLOW}SSL sertifikası kuruluyor...${NC}"
    certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN || echo -e "${RED}SSL kurulumu başarısız, manuel olarak yapın${NC}"
fi

# Swap dosyası oluştur
echo -e "${BLUE}Swap dosyası oluşturuluyor...${NC}"
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# Backup script'i oluştur
sudo -u trendyol-app cat > /home/trendyol-app/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/trendyol-app/backups"
APP_DIR="/home/trendyol-app/apps/trendyol-reviews"

mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz -C $APP_DIR .
find $BACKUP_DIR -name "app_backup_*.tar.gz" -mtime +7 -delete
echo "Backup completed: app_backup_$DATE.tar.gz"
EOF

chmod +x /home/trendyol-app/backup.sh

echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    KURULUM TAMAMLANDI!                      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${GREEN}✅ Kurulum başarıyla tamamlandı!${NC}"
echo ""
echo -e "${YELLOW}Erişim Bilgileri:${NC}"
echo "🌐 Ana Sayfa: http://$DOMAIN"
echo "🧪 Demo Sayfası: http://$DOMAIN/demo"
echo "🔗 API Endpoint: http://$DOMAIN/api/reviews?sku=sample-sku"
echo ""
echo -e "${YELLOW}WooCommerce Entegrasyonu:${NC}"
echo "<script src=\"http://$DOMAIN/static/woocommerce-snippet.js\" defer></script>"
echo ""
echo -e "${YELLOW}Yönetim Komutları:${NC}"
echo "📊 PM2 Durumu: sudo -u trendyol-app pm2 status"
echo "📋 PM2 Logları: sudo -u trendyol-app pm2 logs"
echo "🔄 Yeniden Başlat: sudo -u trendyol-app pm2 restart trendyol-reviews"
echo "🔧 Nginx Test: nginx -t"
echo "📈 Sistem Durumu: htop"
echo ""
echo -e "${YELLOW}Önemli Dosyalar:${NC}"
echo "📁 Proje Dizini: /home/trendyol-app/apps/trendyol-reviews"
echo "⚙️ Nginx Config: /etc/nginx/sites-available/trendyol-reviews"
echo "🔐 SSL Sertifikası: certbot certificates"
echo ""
echo -e "${RED}Unutmayın:${NC}"
echo "1. API Base URL'ini güncelleyin: public/static/woocommerce-snippet.js"
echo "2. SKU mapping'ini yapılandırın: app/api/reviews/route.ts"
echo "3. Backup script'ini crontab'a ekleyin: crontab -e"
echo ""
echo -e "${GREEN}İyi çalışmalar! 🚀${NC}"