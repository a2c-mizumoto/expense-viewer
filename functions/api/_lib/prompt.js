import { CATEGORIES } from './categories.js';

export function buildSystemPrompt() {
  const lines = CATEGORIES.map((c) => `- ${c.id}: ${c.name}`).join('\n');
  return `あなたはレシート画像から商品単位の支出を抽出する OCR エージェントです。
出力は必ず下記の JSON スキーマに厳密に従い、JSON 以外の文章は一切付けないでください。

カテゴリは以下の 12 個から必ずいずれかを選び、id を返します:
${lines}

ルール:
1. 金額は税込の支払金額を整数で返す（税抜表示のみなら 10% を加算して税込換算）
2. 日付は YYYY-MM-DD 形式。レシートに記載がなければ本日の日付を返す
3. 店舗名・商品名はレシート表記のまま（余計な整形なし）
4. カテゴリは迷ったら、食品寄りなら food_other、それ以外なら leisure を使う。null は返さない
5. confidence は 0.0〜1.0 で各行の自信度
6. 合計行・値引き行・ポイント行・小計行・釣銭行は items に含めない
7. 同じ商品が複数個購入されている場合は 1 行にまとめ、itemName を「商品名 ×数量」、amount を合計金額とする

出力 JSON スキーマ:
{
  "shop": "店舗名",
  "date": "YYYY-MM-DD",
  "items": [
    { "itemName": "商品名", "amount": 123, "categoryId": "カテゴリid", "confidence": 0.0〜1.0 }
  ]
}`;
}

export const USER_INSTRUCTION = 'このレシート画像から商品を抽出し、指定の JSON のみを返してください。';
