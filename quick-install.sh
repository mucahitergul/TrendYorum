#!/bin/bash

# Hızlı Kurulum Script'i - Trendyol Yorumları Subdomain
# Bu script otomatik kurulum script'ini indirir ve çalıştırır

set -e

# Renkli çıktı
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Banner
clear
echo -e "${CYAN}"
cat << "EOF"
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║  ████████╗██████╗ ███████╗███╗   ██╗██████╗ ██╗   ██╗ ██████╗ ██╗           ║
║  ╚══██╔══╝██╔══██╗██╔════╝████╗  ██║██╔══██╗╚██╗ ██╔╝██╔═══██╗██║           ║
║     ██║   ██████╔╝█████╗  ██╔██╗ ██║██║  ██║ ╚████╔╝ ██║   ██║██║           ║
║     ██║   ██╔══██╗██╔══╝  ██║╚██╗██║██║  ██║  ╚██╔╝  ██║   ██║██║           ║
║     ██║   ██║  ██║███████╗██║ ╚████║██████╔╝   ██║   ╚██████╔╝███████╗      ║
║     ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═══╝╚═════╝    ╚═╝    ╚═════╝ ╚══════╝      ║
║                                                                              ║
║                        YORUMLARI HIZLI KURULUM                              ║
║                         Subdomain Deployment                                ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo -e "${BLUE}Trendyol Yorumları Sistemi - Hızlı Kurulum${NC}"
echo -e "${YELLOW}Bu script, Hetzner Cloud sunucunuzda otomatik kurulum yapacaktır.${NC}"
echo ""

# Sistem kontrolü
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Bu script root kullanıcısı ile çalıştırılmalıdır!${NC}"
    echo "Kullanım: sudo ./quick-install.sh"
    exit 1
fi

# İşletim sistemi kontrolü
if ! command -v lsb_release &> /dev/null; then
    echo -e "${RED}❌ Bu script Ubuntu sistemler için tasarlanmıştır!${NC}"
    exit 1
fi

OS_INFO=$(lsb_release -d | cut -f2)
if [[ ! "$OS_INFO" =~ "Ubuntu" ]]; then
    echo -e "${RED}❌ Desteklenmeyen işletim sistemi: $OS_INFO${NC}"
    echo -e "${YELLOW}Bu script sadece Ubuntu 20.04+ için test edilmiştir.${NC}"
    read -p "Devam etmek istiyor musunuz? (y/n): " CONTINUE
    if [ "$CONTINUE" != "y" ] && [ "$CONTINUE" != "Y" ]; then
        exit 1
    fi
fi

echo -e "${GREEN}✅ Sistem uyumlu: $OS_INFO${NC}"

# Internet bağlantısı kontrolü
echo -e "${BLUE}Internet bağlantısı kontrol ediliyor...${NC}"
if ! ping -c 1 google.com &> /dev/null; then
    echo -e "${RED}❌ Internet bağlantısı bulunamadı!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Internet bağlantısı aktif${NC}"

# Gerekli araçları kontrol et ve yükle
echo -e "${BLUE}Gerekli araçlar kontrol ediliyor...${NC}"

# curl kontrolü
if ! command -v curl &> /dev/null; then
    echo -e "${YELLOW}curl yükleniyor...${NC}"
    apt update && apt install -y curl
fi

# wget kontrolü
if ! command -v wget &> /dev/null; then
    echo -e "${YELLOW}wget yükleniyor...${NC}"
    apt update && apt install -y wget
fi

echo -e "${GREEN}✅ Gerekli araçlar hazır${NC}"

# Kurulum seçenekleri
echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                    KURULUM SEÇENEKLERİ                       ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}1.${NC} GitHub'dan otomatik indir ve kur (Önerilen)"
echo -e "${YELLOW}2.${NC} Yerel dosyadan kur"
echo -e "${YELLOW}3.${NC} Manuel URL'den indir"
echo -e "${YELLOW}4.${NC} Kurulum öncesi sistem kontrolü yap"
echo ""

read -p "Seçiminizi yapın (1-4): " CHOICE

case $CHOICE in
    1)
        echo -e "${BLUE}GitHub'dan otomatik kurulum başlatılıyor...${NC}"
        SCRIPT_URL="https://raw.githubusercontent.com/YOUR_REPO/main/auto-deploy-subdomain.sh"
        ;;
    2)
        echo -e "${BLUE}Yerel dosya kurulumu...${NC}"
        if [ -f "./auto-deploy-subdomain.sh" ]; then
            SCRIPT_PATH="./auto-deploy-subdomain.sh"
        else
            echo -e "${RED}❌ auto-deploy-subdomain.sh dosyası bulunamadı!${NC}"
            exit 1
        fi
        ;;
    3)
        echo -e "${BLUE}Manuel URL girişi...${NC}"
        read -p "Script URL'ini girin: " SCRIPT_URL
        ;;
    4)
        echo -e "${BLUE}Sistem kontrolü yapılıyor...${NC}"
        # Sistem kontrolü fonksiyonu
        system_check
        exit 0
        ;;
    *)
        echo -e "${RED}❌ Geçersiz seçim!${NC}"
        exit 1
        ;;
esac

# Sistem kontrolü fonksiyonu
system_check() {
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                      SİSTEM KONTROLÜ                         ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    
    # Sistem bilgileri
    echo -e "${BLUE}İşletim Sistemi:${NC} $(lsb_release -d | cut -f2)"
    echo -e "${BLUE}Kernel:${NC} $(uname -r)"
    echo -e "${BLUE}Mimari:${NC} $(uname -m)"
    
    # Bellek kontrolü
    TOTAL_MEM=$(free -m | awk '/^Mem:/ {print $2}')
    echo -e "${BLUE}Toplam Bellek:${NC} ${TOTAL_MEM}MB"
    if [ $TOTAL_MEM -lt 1800 ]; then
        echo -e "${RED}⚠️ Düşük bellek! Minimum 2GB önerilir.${NC}"
    else
        echo -e "${GREEN}✅ Bellek yeterli${NC}"
    fi
    
    # Disk kontrolü
    AVAILABLE_DISK=$(df -BG / | awk 'NR==2 {print $4}' | sed 's/G//')
    echo -e "${BLUE}Kullanılabilir Disk:${NC} ${AVAILABLE_DISK}GB"
    if [ $AVAILABLE_DISK -lt 15 ]; then
        echo -e "${RED}⚠️ Düşük disk alanı! Minimum 20GB önerilir.${NC}"
    else
        echo -e "${GREEN}✅ Disk alanı yeterli${NC}"
    fi
    
    # Port kontrolü
    echo -e "${BLUE}Port Kontrolü:${NC}"
    for port in 22 80 443 3000; do
        if ss -tlnp | grep -q ":$port "; then
            echo -e "${YELLOW}⚠️ Port $port kullanımda${NC}"
        else
            echo -e "${GREEN}✅ Port $port müsait${NC}"
        fi
    done
    
    # Servis kontrolü
    echo -e "${BLUE}Mevcut Servisler:${NC}"
    for service in nginx apache2 mysql postgresql; do
        if systemctl is-active --quiet $service 2>/dev/null; then
            echo -e "${YELLOW}⚠️ $service çalışıyor${NC}"
        else
            echo -e "${GREEN}✅ $service çalışmıyor${NC}"
        fi
    done
    
    echo ""
}

# Kurulum öncesi kontrol
if [ "$CHOICE" != "4" ]; then
    echo -e "${BLUE}Kurulum öncesi sistem kontrolü...${NC}"
    system_check
    
    echo -e "${YELLOW}Kuruluma devam edilsin mi?${NC}"
    read -p "(y/n): " PROCEED
    if [ "$PROCEED" != "y" ] && [ "$PROCEED" != "Y" ]; then
        echo -e "${RED}Kurulum iptal edildi.${NC}"
        exit 1
    fi
fi

# Script'i indir (URL'den)
if [ ! -z "$SCRIPT_URL" ]; then
    echo -e "${BLUE}Kurulum script'i indiriliyor...${NC}"
    echo "URL: $SCRIPT_URL"
    
    # Geçici dizin oluştur
    TEMP_DIR=$(mktemp -d)
    cd $TEMP_DIR
    
    # Script'i indir
    if wget -q --show-progress "$SCRIPT_URL" -O auto-deploy-subdomain.sh; then
        echo -e "${GREEN}✅ Script başarıyla indirildi${NC}"
    else
        echo -e "${RED}❌ Script indirilemedi!${NC}"
        echo "URL'yi kontrol edin: $SCRIPT_URL"
        exit 1
    fi
    
    SCRIPT_PATH="./auto-deploy-subdomain.sh"
fi

# Script'i çalıştırılabilir yap
chmod +x "$SCRIPT_PATH"

# Script boyutunu kontrol et
SCRIPT_SIZE=$(stat -c%s "$SCRIPT_PATH")
if [ $SCRIPT_SIZE -lt 1000 ]; then
    echo -e "${RED}❌ Script dosyası çok küçük, bozuk olabilir!${NC}"
    echo "Boyut: $SCRIPT_SIZE bytes"
    exit 1
fi

echo -e "${GREEN}✅ Script hazır (${SCRIPT_SIZE} bytes)${NC}"

# Son onay
echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                        SON ONAY                              ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Kurulum şunları yapacak:${NC}"
echo "• Sistem güncellemesi"
echo "• Node.js, Nginx, PM2 kurulumu"
echo "• Uygulama kullanıcısı oluşturma"
echo "• Proje dosyalarını hazırlama"
echo "• SSL sertifikası kurulumu"
echo "• Firewall ayarları"
echo ""
echo -e "${RED}DİKKAT:${NC} Bu işlem 10-15 dakika sürebilir ve sistem ayarlarını değiştirecektir."
echo ""

read -p "Kuruluma başlamak istiyor musunuz? (y/n): " FINAL_CONFIRM
if [ "$FINAL_CONFIRM" != "y" ] && [ "$FINAL_CONFIRM" != "Y" ]; then
    echo -e "${RED}Kurulum iptal edildi.${NC}"
    exit 1
fi

# Kurulum logunu başlat
LOG_FILE="/tmp/trendyol-install-$(date +%Y%m%d_%H%M%S).log"
echo -e "${BLUE}Kurulum logu: $LOG_FILE${NC}"

# Kurulum başlat
echo ""
echo -e "${GREEN}🚀 Kurulum başlıyor...${NC}"
echo -e "${BLUE}Lütfen bekleyin, bu işlem biraz zaman alabilir.${NC}"
echo ""

# Script'i çalıştır ve logla
if "$SCRIPT_PATH" 2>&1 | tee "$LOG_FILE"; then
    echo ""
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════════════════════════╗"
    echo "║                          KURULUM BAŞARILI! 🎉                               ║"
    echo "╚══════════════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    echo -e "${CYAN}Kurulum logu kaydedildi: $LOG_FILE${NC}"
    echo -e "${YELLOW}Bu dosyayı sorun giderme için saklayın.${NC}"
    
else
    echo ""
    echo -e "${RED}"
    echo "╔══════════════════════════════════════════════════════════════════════════════╗"
    echo "║                           KURULUM BAŞARISIZ! ❌                              ║"
    echo "╚══════════════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    echo -e "${RED}Kurulum sırasında hata oluştu!${NC}"
    echo -e "${YELLOW}Hata logu: $LOG_FILE${NC}"
    echo ""
    echo -e "${BLUE}Son 20 satır hata logu:${NC}"
    tail -20 "$LOG_FILE"
    echo ""
    echo -e "${YELLOW}Tam log için: cat $LOG_FILE${NC}"
    
    exit 1
fi

# Temizlik
if [ ! -z "$TEMP_DIR" ] && [ -d "$TEMP_DIR" ]; then
    rm -rf "$TEMP_DIR"
fi

echo ""
echo -e "${GREEN}✨ Kurulum tamamlandı! Sisteminiz hazır.${NC}"
echo -e "${CYAN}Destek için: https://github.com/YOUR_REPO/issues${NC}"