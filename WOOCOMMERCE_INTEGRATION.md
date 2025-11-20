# WooCommerce Trendyol Yorumları Entegrasyonu

Bu entegrasyon, WooCommerce ürün sayfalarında Trendyol yorumlarını göstermek için geliştirilmiştir.

## Kurulum

### 1. Dosyaları Sunucunuza Yükleyin

Aşağıdaki dosyaları web sitenizin root dizinine yükleyin:

```
/static/woocommerce-snippet.js
/static/trendyol.css
```

### 2. API Endpoint'ini Kurun

`/api/reviews/route.ts` dosyasını Next.js projenize ekleyin veya kendi API endpoint'inizi oluşturun.

### 3. SKU Mapping'ini Yapılandırın

`app/api/reviews/route.ts` dosyasındaki `skuMapping` objesini kendi ürünlerinize göre güncelleyin:

```typescript
const skuMapping: { [key: string]: { contentId: string; merchantId: string } } = {
  'WOOCOMMERCE-SKU-1': { contentId: 'TRENDYOL-CONTENT-ID', merchantId: 'TRENDYOL-MERCHANT-ID' },
  'WOOCOMMERCE-SKU-2': { contentId: 'TRENDYOL-CONTENT-ID-2', merchantId: 'TRENDYOL-MERCHANT-ID' },
  // Daha fazla mapping ekleyin...
};
```

### 4. WooCommerce Temasına Script Ekleyin

WooCommerce temanızın `functions.php` dosyasına aşağıdaki kodu ekleyin:

```php
// Trendyol yorumları script'ini ürün sayfalarına ekle
function add_trendyol_reviews_script() {
    if (is_product()) {
        wp_enqueue_script(
            'trendyol-reviews', 
            get_site_url() . '/static/woocommerce-snippet.js', 
            array(), 
            '1.0.0', 
            true
        );
    }
}
add_action('wp_enqueue_scripts', 'add_trendyol_reviews_script');
```

### 5. Alternatif Kurulum (Manuel)

Eğer functions.php'ye kod eklemek istemiyorsanız, doğrudan tema dosyalarınıza ekleyebilirsiniz.

**single-product.php** veya **woocommerce/single-product/tabs/tabs.php** dosyasına ekleyin:

```html
<script src="/static/woocommerce-snippet.js" defer></script>
```

## Yapılandırma

### API URL'ini Güncelleyin

`woocommerce-snippet.js` dosyasındaki `CONFIG` objesini güncelleyin:

```javascript
const CONFIG = {
  API_BASE_URL: 'https://your-domain.com/api', // Kendi domain'inizi yazın
  CONTAINER_ID: 'trendyol-reviews-container',
  CSS_URL: '/static/trendyol.css'
};
```

### Mağaza Adını Özelleştirin

Varsayılan mağaza adı "Madetoll by TazeKrem" olarak ayarlanmıştır. Bunu değiştirmek için:

1. `app/api/reviews/route.ts` dosyasında `seller: 'Madetoll by TazeKrem'` satırlarını güncelleyin
2. `woocommerce-snippet.js` dosyasında `'Madetoll by TazeKrem'` değerlerini güncelleyin

## SKU Eşleştirme

Script otomatik olarak WooCommerce ürün SKU'sunu algılar. Aşağıdaki yöntemleri dener:

1. `.sku` class'ına sahip element
2. `[data-sku]` attribute'una sahip element  
3. `[data-product_id]` attribute'una sahip element
4. URL parametrelerinden `product` veya `p`

### Manuel SKU Belirleme

Eğer otomatik algılama çalışmıyorsa, manuel olarak SKU belirleyebilirsiniz:

```html
<div data-sku="YOUR-PRODUCT-SKU"></div>
<script src="/static/woocommerce-snippet.js" defer></script>
```

## Özelleştirme

### CSS Stilleri

`/static/trendyol.css` dosyasını düzenleyerek görünümü özelleştirebilirsiniz.

### Container Konumu

Yorumların görüneceği yeri değiştirmek için:

```javascript
// woocommerce-snippet.js içinde init() fonksiyonunu düzenleyin
const productTabs = document.querySelector('.woocommerce-tabs');
// Farklı bir selector kullanın
```

### Yorum Sayısı

Sayfa başına gösterilecek yorum sayısını değiştirmek için:

```javascript
// loadComments fonksiyonundaki limit değerini değiştirin
const limit = 10; // Varsayılan: 5
```

## Sorun Giderme

### Yorumlar Görünmüyor

1. **SKU Kontrolü**: Tarayıcı konsolunda SKU'nun doğru algılandığını kontrol edin
2. **API Kontrolü**: Network sekmesinde API çağrısının başarılı olduğunu kontrol edin
3. **Mapping Kontrolü**: SKU'nun `skuMapping` objesinde tanımlı olduğunu kontrol edin

### Console Hataları

```javascript
// Tarayıcı konsolunda debug için:
console.log('TrendyolReviews State:', window.TrendyolReviews.state);
```

### API Hataları

API endpoint'inizin çalıştığını test edin:
```
https://your-domain.com/api/reviews?sku=YOUR-SKU
```

## Güvenlik

- API endpoint'iniz için rate limiting ekleyin
- CORS ayarlarını kontrol edin
- Trendyol API çağrılarını cache'leyin

## Performans

- CSS ve JS dosyalarını minify edin
- CDN kullanın
- Görseller için lazy loading aktif
- API yanıtlarını cache'leyin

## Destek

Sorunlar için:
1. Tarayıcı konsolunu kontrol edin
2. Network sekmesinde API çağrılarını kontrol edin
3. SKU mapping'ini doğrulayın

## Örnek Kullanım

```html
<!-- WooCommerce ürün sayfasında -->
<div class="product-summary">
  <!-- Mevcut ürün bilgileri -->
</div>

<!-- Script otomatik olarak buraya yorumları ekleyecek -->
<div id="trendyol-reviews-container"></div>

<script src="/static/woocommerce-snippet.js" defer></script>
```

## Lisans

Bu kod MIT lisansı altında sunulmaktadır.