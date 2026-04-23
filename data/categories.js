export const CATEGORIES = [
  { id: 'meat',       name: '肉',                 group: 'food',    color: '#e57373' },
  { id: 'fish',       name: '魚',                 group: 'food',    color: '#64b5f6' },
  { id: 'alcohol',    name: 'お酒',               group: 'food',    color: '#ba68c8' },
  { id: 'drink',      name: 'お酒以外の飲料',     group: 'food',    color: '#4fc3f7' },
  { id: 'plant',      name: '野菜・植物性食品',   group: 'food',    color: '#81c784' },
  { id: 'egg',        name: '卵',                 group: 'food',    color: '#fff176' },
  { id: 'seasoning',  name: '調味料',             group: 'food',    color: '#ffb74d' },
  { id: 'food_other', name: 'その他食品',         group: 'food',    color: '#a1887f' },
  { id: 'daily',      name: '日用品・消耗品',     group: 'nonfood', color: '#4db6ac' },
  { id: 'transport',  name: '交通・車両',         group: 'nonfood', color: '#7986cb' },
  { id: 'son',        name: '息子関連',           group: 'nonfood', color: '#f06292' },
  { id: 'leisure',    name: 'その他・娯楽',       group: 'nonfood', color: '#90a4ae' },
];

const BY_NAME = new Map(CATEGORIES.map((c) => [c.name, c]));
const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

export function findByName(name) {
  return BY_NAME.get(name) ?? null;
}

export function findById(id) {
  return BY_ID.get(id) ?? null;
}

export function foodCategories() {
  return CATEGORIES.filter((c) => c.group === 'food');
}

export function nonfoodCategories() {
  return CATEGORIES.filter((c) => c.group === 'nonfood');
}
