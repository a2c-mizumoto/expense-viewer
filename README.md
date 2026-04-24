# Private Expense Viewer

プライベート支出を「商品単位」で記録・可視化する PWA。スマホ縦長最適化。

- バニラ HTML / CSS / JS（ビルド不要）
- Chart.js は CDN 経由で読み込み
- データはブラウザの `localStorage` に保存。リポジトリには何も残らない
- CSV インポート / エクスポートで端末間移行

## データ構造（CSV 1行 = 1商品）

列順: `日付,店舗,商品名,金額,カテゴリ,レシートID`

```csv
日付,店舗,商品名,金額,カテゴリ,レシートID
2026-04-22,ホクレン,豚もも肉,580,肉,R001
2026-04-22,ホクレン,キャベツ,180,野菜・植物性食品,R001
```

### カテゴリ（12個）

食品系（8）:
- 肉 / 魚 / お酒 / お酒以外の飲料 / 野菜・植物性食品 / 卵 / 調味料 / その他食品

食品以外（4）:
- 日用品・消耗品 / 交通・車両 / 息子関連 / その他・娯楽

CSV の「カテゴリ」列はこの日本語名と完全一致させる。未定義カテゴリはエラー行として除外される。

## ローカル確認手順

`localStorage` と Service Worker を使うため、ブラウザで `file://` 直接開きではなく HTTP サーバー経由で起動する。

```bash
cd ~/ai-management/expense-viewer
python3 -m http.server 8000
# ブラウザで http://localhost:8000
```

初回起動時は空データ。フッターの「CSVインポート」から `data/sample.csv` を読み込むと 8商品 / 4レシートが入る。

### 動作確認チェックリスト

1. 空状態で起動 → 総額 ¥0・「データがありません」が見える
2. `data/sample.csv` をインポート → `8 件追加` のトースト
3. 月セレクトで「2026年4月」を選ぶ → 8件表示
4. 「レシート別」タブ → R001/R002/R003/R004 のグループに分かれる
5. エクスポート → ダウンロードされた CSV を再インポート → `0 件追加 / 8 件スキップ`
6. 全削除 → 確認 → 空状態に戻る

## Cloudflare Pages 公開手順

本体リポジトリ (`ai-management`) は private。`expense-viewer/` 配下だけを公開リポジトリ (`a2c-mizumoto/expense-viewer`) の main ブランチに `git subtree split` で反映し、Cloudflare Pages が自動デプロイする構成。

### 初回セットアップ

1. 公開リポジトリを作成（1回のみ）
   ```bash
   gh repo create a2c-mizumoto/expense-viewer --public
   ```
2. Cloudflare Dashboard → Workers & Pages → Pages → Connect to Git → `a2c-mizumoto/expense-viewer` を選択
3. Build command 空欄 / Build output directory `/` / Production branch `main`
4. 環境変数を Production に登録（Encrypted 推奨）
   - `APP_SECRET`: `openssl rand -hex 24` の出力
   - `ANTHROPIC_API_KEY`: Anthropic Console で発行
   - `ANTHROPIC_MODEL`: `claude-sonnet-4-6`
   - `DAILY_LIMIT`: `30`
5. KV namespace `expense-viewer-ratelimit` を作成し、Pages Functions に `RATELIMIT` としてバインド

### 以降の公開フロー

本体リポで `expense-viewer/` を編集 → コミット後、下記 1 コマンドで公開:

```bash
./expense-viewer/scripts/publish.sh
```

`git subtree split` で `expense-viewer/` 配下の履歴だけを抽出し、`a2c-mizumoto/expense-viewer` の main に `--force-with-lease` で push する。Cloudflare Pages が push を検知して自動ビルド・自動デプロイ。

公開 URL: `https://expense-viewer-26j.pages.dev/`

### 注意点

- `_headers` で `/sw.js` と `/index.html` に `Cache-Control: no-cache` を付けて SW 更新詰まりを予防
- Service Worker の `scope` は `./` 相対。Cloudflare Pages のルート配信に対応
- `functions/api/ocr.js` は Claude OCR 中継エンドポイント。APIキーは環境変数にのみ格納し、コードには一切含めない
- アプリには実データは含まれない。OCR 結果とマニュアル入力はユーザー各自の端末 `localStorage` に閉じる

## 実運用データの置き場

`~/ai-management/expense/private/` をリポジトリから除外する `.gitignore` を設定済み。CSV バックアップをここに手動で置く運用を想定（現状 `.gitkeep` のみ）。

## ディレクトリ構成

```
expense-viewer/
├── index.html
├── manifest.json
├── sw.js                       # v2: /api/ 除外 + キャッシュバージョン
├── _headers                    # Cloudflare Pages: /sw.js, /index.html を no-cache
├── .nojekyll
├── css/styles.css
├── js/
│   ├── app.js                  # エントリ・イベント配線
│   ├── store.js                # localStorage 永続化
│   ├── csv.js                  # CSV パース / 生成
│   ├── ui.js                   # DOM レンダリング
│   ├── charts.js               # Chart.js ラッパ
│   ├── capture.js              # 撮影 → リサイズ → OCR 呼出 → 確認UIディスパッチ
│   ├── review.js               # OCR 結果の確認・編集UI
│   ├── settings.js             # APP_SECRET を localStorage に保持
│   └── receiptid.js            # R-YYYYMMDD-HHMMSS 採番
├── functions/api/
│   ├── ocr.js                  # Pages Functions: Claude OCR 中継
│   └── _lib/
│       ├── prompt.js           # system prompt
│       ├── categories.js       # 12カテゴリ定義（data/categories.js と手動同期）
│       └── ratelimit.js        # Workers KV による日次レート制限
├── scripts/
│   └── publish.sh              # git subtree split + 公開リポ push
├── data/
│   ├── categories.js           # 12カテゴリ定義
│   └── sample.csv              # 動作確認用
└── assets/
    ├── favicon.svg
    ├── icon-192.png            # PWA アイコン（暫定・単色）
    └── icon-512.png
```

## Phase 2a 完了（2026-04-24）

iPhone PWA から「撮影 → Claude OCR → 確認編集 → 自動登録」までがワンフローで動く。

- カメラ起動: `<input capture="environment">` で iPhone Safari ネイティブカメラ起動
- OCR: Cloudflare Pages Functions `/api/ocr` 経由で Claude Sonnet 4.6 (`claude-sonnet-4-6`) を呼び出し
- 認証: URL secret 方式（`/api/ocr?key=...`）。`APP_SECRET` は Cloudflare Pages 環境変数にのみ存在し、端末側は localStorage 保持
- レート制限: Workers KV `RATELIMIT` で日次カウント（デフォルト 30 req/日）
- データ構造: 1 レシート = 複数商品で同一 `receiptId` (`R-YYYYMMDD-HHMMSS`) を共有

### iPhone 初回セットアップ

1. Safari で `https://expense-viewer-26j.pages.dev/` を開き「ホーム画面に追加」
2. アプリ起動 → ヘッダの ⚙ ボタンで設定モーダルを開く
3. `APP_SECRET` を貼り付けて保存（以降は端末 localStorage に保持）
4. フッター「📷 撮影」でレシート撮影 → OCR 待ち（5〜15 秒） → 確認画面で修正 → 登録

## Phase 2b〜2d 拡張余地（未実装）

- **2b**: 店舗 × 商品名から推定カテゴリを学習する辞書（localStorage 相乗り）
- **2c**: 食品カテゴリに四毒フラグを追加してハイライト
- **2d**: データ層を IndexedDB へ移行（画像保存が必要になったとき。`store.js` のインターフェースはそのまま差し替え可能）

## アイコン差し替え

現状は単色の暫定 PNG。デザイン確定後に `assets/icon-192.png` / `assets/icon-512.png` を同じファイル名で差し替えれば反映される（Service Worker のキャッシュバージョンを上げるため `sw.js` 冒頭の `CACHE_VERSION` をインクリメント推奨）。
