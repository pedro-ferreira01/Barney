/*
  Adaptador simples para ligar o front-end Barney ao backend.
  Use este arquivo como referência para substituir as funções antigas que salvavam tudo no localStorage.
*/

const BARNEY_API_URL = 'http://localhost:3333/api';

function getAccessToken() {
  return localStorage.getItem('barneyAccessToken');
}

function saveTokens(data) {
  if (data.accessToken) localStorage.setItem('barneyAccessToken', data.accessToken);
  if (data.refreshToken) localStorage.setItem('barneyRefreshToken', data.refreshToken);
}

async function barneyRequest(path, options = {}) {
  const headers = options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' };
  const token = getAccessToken();

  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${BARNEY_API_URL}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) }
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || 'Erro na API Barney');
  return data;
}

async function barneyRegister({ name, email, password, phone, cpf }) {
  const data = await barneyRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, phone, cpf })
  });
  saveTokens(data);
  return data;
}

async function barneyLogin(email, password) {
  const data = await barneyRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  saveTokens(data);
  return data;
}

async function barneyCreatePix(planCode) {
  return barneyRequest('/payments/pix', {
    method: 'POST',
    body: JSON.stringify({ planCode })
  });
}

async function barneyAddTransaction(transaction) {
  return barneyRequest('/transactions', {
    method: 'POST',
    body: JSON.stringify(transaction)
  });
}

async function barneyListTransactions() {
  return barneyRequest('/transactions');
}

async function barneyAskAI(message) {
  return barneyRequest('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ message })
  });
}

async function barneyAnalyzeFiles(files) {
  const formData = new FormData();
  [...files].forEach((file) => formData.append('files', file));
  return barneyRequest('/files/analyze', {
    method: 'POST',
    body: formData
  });
}
