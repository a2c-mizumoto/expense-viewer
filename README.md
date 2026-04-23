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

## GitHub Pages 公開手順

このリポジトリ (`ai-management`) は private の可能性が高いので、**公開用の別リポジトリを作って `expense-viewer/` だけを push する** のが安全。

### 手順（別リポジトリ方式）

```bash
# 公開用リポジトリを GitHub 上で作成（例: expense-viewer）
gh repo create expense-viewer --public --confirm

# 作業コピーを一時ディレクトリで切り出す
cp -R ~/ai-management/expense-viewer /tmp/expense-viewer-pub
cd /tmp/expense-viewer-pub
git init -b main
git add .
git commit -m "feat: initial publish"
git remote add origin git@github.com:<your-account>/expense-viewer.git
git push -u origin main

# GitHub のリポジトリ Settings → Pages で
# Source: Deploy from a branch / Branch: main / Folder: / (root) を選択
```

公開 URL: `https://<your-account>.github.io/expense-viewer/`

### 注意点

- `.nojekyll` を同梱済み（GitHub Pages の Jekyll 処理を無効化）
- Service Worker の `scope` は `./` 相対なので、プロジェクトページ（サブパス配信）でも動く
- アプリにはサンプル CSV 以外のデータは含まれない。実データはユーザー各自の端末 `localStorage` に閉じる

## 実運用データの置き場

`~/ai-management/expense/private/` をリポジトリから除外する `.gitignore` を設定済み。CSV バックアップをここに手動で置く運用を想定（現状 `.gitkeep` のみ）。

## ディレクトリ構成

```
expense-viewer/
├── index.html
├── manifest.json
├── sw.js
├── .nojekyll
├── css/styles.css
├── js/
│   ├── app.js          # エントリ・イベント配線
│   ├── store.js        # localStorage 永続化
│   ├── csv.js          # CSV パース / 生成
│   ├── ui.js           # DOM レンダリング
│   └── charts.js       # Chart.js ラッパ
├── data/
│   ├── categories.js   # 12カテゴリ定義
│   └── sample.csv      # 動作確認用
└── assets/
    ├── favicon.svg
    ├── icon-192.png    # PWA アイコン（暫定・単色）
    └── icon-512.png
```

## Phase 2 拡張余地（未実装）

- カメラ撮影 → Claude API で商品単位 OCR + 分類 → フォーム自動入力
- 店舗 × 商品名から推定カテゴリを学習する辞書（同じ localStorage に相乗り）
- 食品カテゴリに四毒フラグを追加してハイライト
- データ層を IndexedDB へ移行（`store.js` のインターフェースはそのまま）

## アイコン差し替え

現状は単色の暫定 PNG。デザイン確定後に `assets/icon-192.png` / `assets/icon-512.png` を同じファイル名で差し替えれば反映される（Service Worker のキャッシュバージョンを上げるため `sw.js` 冒頭の `CACHE_VERSION` をインクリメント推奨）。
