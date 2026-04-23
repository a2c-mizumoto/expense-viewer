// data/categories.js とカテゴリ定義を揃える。カテゴリ変更時は両方を更新する。

export const CATEGORIES = [
  { id: 'meat',       name: '肉',                 group: 'food' },
  { id: 'fish',       name: '魚',                 group: 'food' },
  { id: 'alcohol',    name: 'お酒',               group: 'food' },
  { id: 'drink',      name: 'お酒以外の飲料',     group: 'food' },
  { id: 'plant',      name: '野菜・植物性食品',   group: 'food' },
  { id: 'egg',        name: '卵',                 group: 'food' },
  { id: 'seasoning',  name: '調味料',             group: 'food' },
  { id: 'food_other', name: 'その他食品',         group: 'food' },
  { id: 'daily',      name: '日用品・消耗品',     group: 'nonfood' },
  { id: 'transport',  name: '交通・車両',         group: 'nonfood' },
  { id: 'son',        name: '息子関連',           group: 'nonfood' },
  { id: 'leisure',    name: 'その他・娯楽',       group: 'nonfood' },
];

export const VALID_IDS = new Set(CATEGORIES.map((c) => c.id));
