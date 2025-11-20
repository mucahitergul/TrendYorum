"use client";
import { useEffect, useState } from "react";

type ProductRow = {
  sku: string;
  domain: string;
  content_id: string | null;
  merchant_id: string | null;
  listing_id: string | null;
  average_score: number | null;
  total_comment_count: number | null;
  updated_at: string;
};

export default function AdminPage() {
  const [domain, setDomain] = useState("");
  const [contentId, setContentId] = useState("");
  const [merchantId, setMerchantId] = useState("");
  const [listingId, setListingId] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [items, setItems] = useState<ProductRow[]>([]);
  const [runs, setRuns] = useState<any[]>([]);

  async function loadItems(){
    const res = await fetch('/api/products');
    if (res.ok) {
      const data = await res.json();
      setItems(data.rows || []);
    }
  }
  async function loadRuns(){
    const res = await fetch('/api/import-runs');
    if (res.ok) {
      const data = await res.json();
      setRuns(data.rows || []);
    }
  }
  useEffect(()=>{ loadItems(); loadRuns(); },[]);
  useEffect(()=>{
    if (!document.querySelector('link[href="/static/trendyol.css"]')){
      const l = document.createElement('link'); l.rel='stylesheet'; l.href='/static/trendyol.css'; document.head.appendChild(l);
    }
  },[]);

  async function handleImport(useSample = false) {
    setStatus("İçe aktarma başlatıldı...");
    const sku = contentId; // Woo SKU ≡ Trendyol contentId
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain, contentId, merchantId, listingId, useSample, sku })
    });
    const data = await res.json();
    setStatus(data.message || "Tamamlandı");
    loadItems();
    loadRuns();
  }

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold">TrendYorum Admin</h1>
      <p className="text-sm text-gray-600">Eşleşme kuralı: WooCommerce SKU ≡ Trendyol contentId</p>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <h2 className="font-medium mb-3">Ürün Eşleme ve İçe Aktarma</h2>
          <div className="space-y-3">
            <label className="grid gap-1">
              <span className="text-sm text-gray-700">Domain</span>
              <input className="border rounded px-3 py-2" value={domain} onChange={e => setDomain(e.target.value)} placeholder="ornek.com" />
            </label>
            <label className="grid gap-1">
              <span className="text-sm text-gray-700">Trendyol contentId</span>
              <input className="border rounded px-3 py-2" value={contentId} onChange={e => setContentId(e.target.value)} placeholder="857162242" />
            </label>
            <label className="grid gap-1">
              <span className="text-sm text-gray-700">merchantId</span>
              <input className="border rounded px-3 py-2" value={merchantId} onChange={e => setMerchantId(e.target.value)} placeholder="955182" />
            </label>
            <label className="grid gap-1">
              <span className="text-sm text-gray-700">listingId (opsiyonel)</span>
              <input className="border rounded px-3 py-2" value={listingId} onChange={e => setListingId(e.target.value)} placeholder="7d102773..." />
            </label>
            <div className="flex gap-2">
              <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={() => handleImport(false)}>Yorumları Çek</button>
              <button className="px-3 py-2 bg-gray-800 text-white rounded" onClick={() => handleImport(true)}>Örnek Dosyadan Yükle</button>
            </div>
            {status && <p className="text-sm text-green-700">{status}</p>}
            {domain && contentId && (
              <p className="text-sm">JSON URL: <code className="bg-gray-100 px-2 py-1 rounded">{`/trendyol/${domain}/${contentId}.json`}</code></p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <h2 className="font-medium mb-3">WooCommerce Entegrasyon</h2>
          <p className="text-sm text-gray-700">Tema veya Snippet yöneticisine ekleyin:</p>
          <pre className="mt-2 bg-gray-100 p-3 rounded text-xs overflow-auto">{'<script src="/static/woocommerce-snippet.js" defer></script>'}</pre>
          <p className="text-sm text-gray-600 mt-2">Ürün sayfasındaki SKU, Trendyol contentId ile eşit olmalıdır.</p>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-lg border overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-medium">Ürünler</h2>
        </div>
        <table className="min-w-full text-sm data-table">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2">Domain</th>
              <th className="text-left px-4 py-2">SKU/ContentId</th>
              <th className="text-left px-4 py-2">merchantId</th>
              <th className="text-left px-4 py-2">listingId</th>
              <th className="text-left px-4 py-2">Ortalama</th>
              <th className="text-left px-4 py-2">Toplam</th>
              <th className="text-left px-4 py-2">Güncelleme</th>
              <th className="text-left px-4 py-2">JSON</th>
              <th className="text-left px-4 py-2">Sil</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it,idx)=> (
              <tr key={idx} className="border-t">
                <td className="px-4 py-2">{it.domain}</td>
                <td className="px-4 py-2">{it.sku}</td>
                <td className="px-4 py-2">{it.merchant_id || '-'}</td>
                <td className="px-4 py-2">{it.listing_id || '-'}</td>
                <td className="px-4 py-2">{it.average_score ?? '-'}</td>
                <td className="px-4 py-2">{it.total_comment_count ?? '-'}</td>
                <td className="px-4 py-2">{new Date(it.updated_at).toLocaleString()}</td>
                <td className="px-4 py-2">
                  <a className="text-blue-700" href={`/trendyol/${it.domain}/${it.sku}.json`} target="_blank">JSON</a>
                </td>
                <td className="px-4 py-2">
                  <button className="px-2 py-1 bg-red-600 text-white rounded"
                    onClick={async ()=>{
                      if (!confirm(`Silinsin mi? ${it.domain} / ${it.sku}`)) return;
                      const res = await fetch('/api/products', { method: 'DELETE', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ domain: it.domain, sku: it.sku }) });
                      if (res.ok) { loadItems(); loadRuns(); }
                    }}>Sil</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 bg-white rounded-lg border overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-medium">İçe Aktarma Logları</h2>
          <button className="px-3 py-1 bg-gray-200 rounded" onClick={loadRuns}>Yenile</button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm data-table">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2">ID</th>
                <th className="text-left px-4 py-2">Domain</th>
                <th className="text-left px-4 py-2">SKU/ContentId</th>
                <th className="text-left px-4 py-2">Durum</th>
                <th className="text-left px-4 py-2">Sayfalar</th>
                <th className="text-left px-4 py-2">Toplam</th>
                <th className="text-left px-4 py-2">Başladı</th>
                <th className="text-left px-4 py-2">Bitti</th>
                <th className="text-left px-4 py-2">Hata</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r:any)=>(
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2">{r.id}</td>
                  <td className="px-4 py-2">{r.domain}</td>
                  <td className="px-4 py-2">{r.sku}</td>
                  <td className="px-4 py-2">{r.status}</td>
                  <td className="px-4 py-2">{r.total_pages ?? '-'}</td>
                  <td className="px-4 py-2">{r.total_elements ?? '-'}</td>
                  <td className="px-4 py-2">{new Date(r.started_at).toLocaleString()}</td>
                  <td className="px-4 py-2">{r.ended_at ? new Date(r.ended_at).toLocaleString() : '-'}</td>
                  <td className="px-4 py-2 max-w-[360px] truncate" title={r.error || ''}>{r.error || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}