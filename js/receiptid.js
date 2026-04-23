export function newReceiptId(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `R-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}
