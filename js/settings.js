const API_KEY = 'expense-viewer:api-key:v1';

export function getApiKey() {
  try {
    return localStorage.getItem(API_KEY) || '';
  } catch {
    return '';
  }
}

export function setApiKey(value) {
  const v = (value || '').trim();
  if (!v) {
    clearApiKey();
    return;
  }
  localStorage.setItem(API_KEY, v);
}

export function clearApiKey() {
  localStorage.removeItem(API_KEY);
}
