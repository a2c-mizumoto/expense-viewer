import { newReceiptId } from './receiptid.js';
import { getApiKey, setApiKey, clearApiKey } from './settings.js';
import { renderReview } from './review.js';
import { addMany } from './store.js';
import { showToast } from './ui.js';

const MAX_EDGE = 2000;
const MAX_BYTES = 10 * 1024 * 1024;

let captureRoot = null;
let settingsRoot = null;
let refreshCallback = () => {};

export function initCapture({ onRefresh } = {}) {
  captureRoot = document.getElementById('capture-modal');
  settingsRoot = document.getElementById('settings-modal');
  if (typeof onRefresh === 'function') refreshCallback = onRefresh;
}

export function openSettings() {
  if (!settingsRoot) return;
  const current = getApiKey();
  settingsRoot.innerHTML = `
    <div class="modal-overlay" data-close></div>
    <div class="modal-body">
      <h2 class="modal-title">設定</h2>
      <label class="modal-label">
        APIキー
        <input type="password" id="settings-api-key" autocomplete="off" spellcheck="false" value="${escapeAttr(current)}" />
      </label>
      <p class="modal-help">Cloudflare Pages の APP_SECRET を貼り付けてください。この端末の localStorage にのみ保存されます。</p>
      <div class="modal-footer">
        <button class="btn btn-danger" id="settings-clear" type="button">消去</button>
        <button class="btn" id="settings-cancel" type="button">キャンセル</button>
        <button class="btn btn-primary" id="settings-save" type="button">保存</button>
      </div>
    </div>
  `;
  settingsRoot.hidden = false;
  settingsRoot.querySelector('[data-close]').addEventListener('click', closeSettings);
  settingsRoot.querySelector('#settings-cancel').addEventListener('click', closeSettings);
  settingsRoot.querySelector('#settings-clear').addEventListener('click', () => {
    clearApiKey();
    showToast('APIキーを消去しました');
    closeSettings();
  });
  settingsRoot.querySelector('#settings-save').addEventListener('click', () => {
    const val = settingsRoot.querySelector('#settings-api-key').value;
    setApiKey(val);
    showToast('APIキーを保存しました');
    closeSettings();
  });
}

function closeSettings() {
  if (!settingsRoot) return;
  settingsRoot.hidden = true;
  settingsRoot.innerHTML = '';
}

export async function openCaptureFlow(file) {
  if (!captureRoot || !file) return;

  captureRoot.hidden = false;
  renderLoading('画像を処理中…');

  let dataUrl, blob;
  try {
    ({ dataUrl, blob } = await normalizeImage(file));
  } catch (err) {
    console.error(err);
    showToast('画像の読み込みに失敗しました');
    closeCapture();
    return;
  }

  renderPreview({ dataUrl, blob, receiptId: newReceiptId() });
}

function renderPreview({ dataUrl, blob, receiptId }) {
  captureRoot.innerHTML = `
    <div class="modal-overlay" data-close></div>
    <div class="modal-body">
      <h2 class="modal-title">撮影プレビュー</h2>
      <img src="${dataUrl}" alt="レシート" class="preview-image" />
      <p class="modal-help">receiptId: ${escapeHtml(receiptId)}</p>
      <div class="modal-footer">
        <button class="btn" id="capture-cancel" type="button">キャンセル</button>
        <button class="btn" id="capture-retake" type="button">撮り直し</button>
        <button class="btn btn-primary" id="capture-ocr" type="button">OCR 実行</button>
      </div>
    </div>
  `;
  captureRoot.querySelector('[data-close]').addEventListener('click', closeCapture);
  captureRoot.querySelector('#capture-cancel').addEventListener('click', closeCapture);
  captureRoot.querySelector('#capture-retake').addEventListener('click', () => {
    closeCapture();
    document.getElementById('camera-input')?.click();
  });
  captureRoot.querySelector('#capture-ocr').addEventListener('click', async () => {
    const apiKey = getApiKey();
    if (!apiKey) {
      showToast('APIキー未設定。⚙ から登録してください', 4000);
      closeCapture();
      openSettings();
      return;
    }
    renderLoading('OCR 処理中…最大 20 秒ほどかかります');
    try {
      const ocr = await callOcr(blob, receiptId, apiKey);
      renderReview(captureRoot, ocr, {
        onConfirm: (items) => confirmAndAdd(items, receiptId),
        onCancel: closeCapture,
      });
    } catch (err) {
      console.error(err);
      showToast(err.message || 'OCR 失敗', 4500);
      closeCapture();
    }
  });
}

function renderLoading(message) {
  captureRoot.innerHTML = `
    <div class="modal-overlay"></div>
    <div class="modal-body modal-loading">
      <div class="spinner" aria-hidden="true"></div>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

async function callOcr(blob, receiptId, apiKey) {
  const form = new FormData();
  form.append('image', blob, 'receipt.jpg');
  form.append('receiptId', receiptId);

  let res;
  try {
    res = await fetch(`/api/ocr?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      body: form,
    });
  } catch {
    throw new Error('ネットワークエラー。Wi-Fi を確認してください');
  }

  const body = await res.json().catch(() => ({}));
  if (res.status === 401) throw new Error('APIキーが不正です。設定を確認してください');
  if (res.status === 429) throw new Error('今日の上限に達しました');
  if (res.status === 400) throw new Error('画像が不正です');
  if (res.status === 422) throw new Error('レシートを読み取れませんでした');
  if (res.status === 502) throw new Error('OCRサーバーエラー。再試行してください');
  if (!res.ok) throw new Error(`エラー (${res.status})`);
  return body;
}

function confirmAndAdd(items, receiptId) {
  if (!items || items.length === 0) {
    showToast('登録する商品がありません');
    return;
  }
  const { added, skipped } = addMany(items);
  const parts = [`${added} 件追加`];
  if (skipped > 0) parts.push(`${skipped} 件スキップ`);
  showToast(parts.join(' / '));
  refreshCallback();
  closeCapture();
}

function closeCapture() {
  if (!captureRoot) return;
  captureRoot.hidden = true;
  captureRoot.innerHTML = '';
}

async function normalizeImage(file) {
  const dataUrl = await readAsDataURL(file);
  const img = await loadImage(dataUrl);
  const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.85);
  const blob = await dataUrlToBlob(jpegDataUrl);
  if (blob.size > MAX_BYTES) throw new Error('画像が大きすぎます');
  return { dataUrl: jpegDataUrl, blob };
}

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('画像のデコードに失敗しました'));
    img.src = src;
  });
}

async function dataUrlToBlob(url) {
  const res = await fetch(url);
  return await res.blob();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function escapeAttr(s) {
  return escapeHtml(s);
}
