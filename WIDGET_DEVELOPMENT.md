# Widget Geliştirme Rehberi

## 🎨 Local Test Ortamı

### Demo Sayfasını Açma

```bash
# 1. Proje dizininde local server başlat
npx serve public

# 2. Tarayıcıda aç
http://localhost:3000/widget-demo.html
```

### Alternatif: Python ile

```bash
# Python 3
cd public
python -m http.server 8000

# Tarayıcıda aç
http://localhost:8000/widget-demo.html
```

### Alternatif: VS Code Live Server

1. VS Code'da `public/widget-demo.html` dosyasını aç
2. Sağ tık → "Open with Live Server"
3. Otomatik olarak tarayıcıda açılır

## 📁 Dosya Yapısı

```
public/
├── widget-demo.html          # Local test sayfası
└── static/
    ├── woocommerce-snippet.js  # Widget JavaScript
    ├── trendyol.css            # Widget CSS
    └── trendyol.svg            # Logo
```

## 🔧 Geliştirme Akışı

### 1. Local Test

```bash
# Demo sayfasını aç
npx serve public

# Tarayıcıda: http://localhost:3000/widget-demo.html
```

### 2. Değişiklik Yap

```bash
# CSS değişikliği
code public/static/trendyol.css

# JavaScript değişikliği
code public/static/woocommerce-snippet.js
```

### 3. Test Et

- Tarayıcıda sayfayı yenile (F5)
- Console'u kontrol et (F12)
- Modal'ı test et

### 4. Sunucuya Yükle

```bash
# Sadece değişen dosyaları yükle
scp public/static/trendyol.css root@yorum.isletmemdijitalde.com:/home/trendyol/app/public/static/
scp public/static/woocommerce-snippet.js root@yorum.isletmemdijitalde.com:/home/trendyol/app/public/static/

# PM2 restart
ssh root@yorum.isletmemdijitalde.com "pm2 restart trendyol-reviews"
```

## 🎯 Test Senaryoları

### Modal Testi

1. ✅ Görsele tıkla → Modal açılmalı
2. ✅ Kapat butonuna tıkla → Modal kapanmalı
3. ✅ İleri/Geri butonları → Görseller değişmeli
4. ✅ Backdrop'a tıkla → Modal kapanmalı
5. ✅ ESC tuşu → Modal kapanmalı

### Responsive Test

1. ✅ Desktop (1920x1080)
2. ✅ Tablet (768x1024)
3. ✅ Mobile (375x667)

### Browser Test

1. ✅ Chrome
2. ✅ Firefox
3. ✅ Safari
4. ✅ Edge

## 🐛 Debug İpuçları

### Console Logları

```javascript
// Widget yükleme durumu
console.log('Widget yükleniyor...');

// Modal açılma
console.log('Modal açıldı:', photoUrl);

// Hata durumu
console.error('Hata:', error);
```

### Network Tab

1. F12 → Network
2. XHR filtresi
3. API çağrılarını kontrol et

### Elements Tab

1. F12 → Elements
2. `#reviewModal` elementini bul
3. CSS kurallarını kontrol et

## 📝 Sık Kullanılan Komutlar

```bash
# Local server başlat
npx serve public

# Dosya yükle (tek dosya)
scp public/static/trendyol.css root@yorum.isletmemdijitalde.com:/home/trendyol/app/public/static/

# Tüm static dosyaları yükle
scp public/static/* root@yorum.isletmemdijitalde.com:/home/trendyol/app/public/static/

# PM2 restart
ssh root@yorum.isletmemdijitalde.com "pm2 restart trendyol-reviews"

# PM2 logs
ssh root@yorum.isletmemdijitalde.com "pm2 logs trendyol-reviews --lines 50"
```

## 🎨 CSS Değişiklikleri

### Modal Stilleri

```css
/* public/static/trendyol.css */

#reviewModal {
  /* Modal overlay stilleri */
}

#reviewModal .modal-container {
  /* Modal container stilleri */
}

#reviewModal .close-btn {
  /* Kapat butonu stilleri */
}
```

### Test Etme

1. CSS dosyasını düzenle
2. Tarayıcıda F5 (hard refresh: Ctrl+Shift+F5)
3. Değişiklikleri kontrol et
4. Sunucuya yükle

## 🚀 Production'a Alma

### Checklist

- [ ] Local'de test edildi
- [ ] Console'da hata yok
- [ ] Modal düzgün çalışıyor
- [ ] Responsive tasarım OK
- [ ] Cross-browser test yapıldı
- [ ] Dosyalar sunucuya yüklendi
- [ ] PM2 restart yapıldı
- [ ] Production'da test edildi

### Deployment

```bash
# 1. Dosyaları yükle
scp public/static/woocommerce-snippet.js root@yorum.isletmemdijitalde.com:/home/trendyol/app/public/static/
scp public/static/trendyol.css root@yorum.isletmemdijitalde.com:/home/trendyol/app/public/static/

# 2. Restart
ssh root@yorum.isletmemdijitalde.com "pm2 restart trendyol-reviews"

# 3. Test
# https://yorum.isletmemdijitalde.com
```

## 💡 İpuçları

1. **Hard Refresh**: Ctrl+Shift+F5 (cache'i temizler)
2. **Console Temizle**: Ctrl+L veya console.clear()
3. **Network Throttling**: Chrome DevTools → Network → Slow 3G
4. **Mobile Emulation**: Chrome DevTools → Toggle Device Toolbar (Ctrl+Shift+M)
5. **CSS Debugging**: Elements → Computed → Filter

## 🔗 Faydalı Linkler

- **Demo Sayfası**: http://localhost:3000/widget-demo.html
- **Production**: https://yorum.isletmemdijitalde.com
- **API**: https://yorum.isletmemdijitalde.com/api/reviews?sku=40970378

## 📞 Sorun Giderme

### Widget Yüklenmiyor

1. Console'u kontrol et
2. Network tab'ı kontrol et
3. SKU kodunu kontrol et
4. API yanıtını kontrol et

### Modal Açılmıyor

1. Console'da hata var mı?
2. Event listener'lar çalışıyor mu?
3. CSS yüklendi mi?
4. Z-index sorunları var mı?

### Stiller Uygulanmıyor

1. Hard refresh yap (Ctrl+Shift+F5)
2. CSS dosyası yüklendi mi?
3. Selector doğru mu?
4. !important gerekli mi?

---

**Happy Coding! 🚀**
