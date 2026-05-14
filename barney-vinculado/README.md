# Barney Backend

Backend profissional para a plataforma **Barney AI Finance**.

Ele substitui o uso inseguro de `localStorage` como “banco de dados” e cria uma API real com:

- Cadastro e login de alunos
- Senhas criptografadas com bcrypt
- JWT de acesso e refresh token
- Controle de permissões: aluno e administrador
- Planos Standard e Pro
- Pagamentos Pix com payload e QR Code
- Aprovação manual de pagamento pelo admin
- Assinaturas com validade automática
- Controle financeiro por usuário
- Simulador de investimentos
- Análise básica de arquivos XLSX/CSV
- Rotas para IA/chat local e mockup criativo
- WhatsApp com link manual de teste
- Painel administrativo por API
- Helmet, CORS, rate limit, hpp e validação com Zod
- Prisma ORM com SQLite para desenvolvimento

---

## 1. Como instalar

Entre na pasta do backend:

```bash
cd barney-backend
```

Instale as dependências:

```bash
npm install
```

Copie o arquivo de ambiente:

```bash
cp .env.example .env
```

No Windows, você pode duplicar o arquivo `.env.example` e renomear para `.env`.

---

## 2. Configure o `.env`

Altere principalmente:

```env
JWT_SECRET="uma-chave-grande-e-secreta-com-mais-de-32-caracteres"
DATA_ENCRYPTION_KEY="sua-chave-base64-de-32-bytes"
ADMIN_EMAIL="seu-email-admin@dominio.com"
ADMIN_PASSWORD="uma-senha-forte"
PIX_KEY="sua-chave-pix"
PIX_MERCHANT_NAME="SEU NOME OU EMPRESA"
PIX_MERCHANT_CITY="SUA CIDADE"
```

Para gerar uma chave segura para `DATA_ENCRYPTION_KEY`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## 3. Criar banco de dados

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

O seed cria:

- Plano Standard: R$20,90 / 1 mês
- Plano Pro: R$32,90 / 3 meses
- Administrador inicial do `.env`

---

## 4. Rodar o servidor

```bash
npm run dev
```

A API ficará em:

```txt
http://localhost:3333
```

Teste:

```txt
GET http://localhost:3333/api/health
```

---

## 5. Rotas principais

### Autenticação

```txt
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
GET  /api/auth/me
```

### Planos

```txt
GET  /api/plans
POST /api/plans                 somente admin
PATCH /api/plans/:id            somente admin
```

### Pagamentos e assinatura

```txt
POST /api/payments/pix
GET  /api/payments/mine
POST /api/payments/:id/approve  somente admin
GET  /api/subscriptions/mine
```

### Financeiro

```txt
GET    /api/transactions
POST   /api/transactions
PATCH  /api/transactions/:id
DELETE /api/transactions/:id
```

### Ferramentas premium

```txt
GET  /api/investments
POST /api/investments/simulate
POST /api/files/analyze
POST /api/ai/chat
POST /api/ai/image-mockup
POST /api/whatsapp/test-message
```

### Administrador

```txt
GET   /api/admin/dashboard
GET   /api/admin/students
POST  /api/admin/students
PATCH /api/admin/students/:id/status
POST  /api/admin/students/:id/subscriptions
GET   /api/admin/payments
GET   /api/admin/audit-logs
```

---

## 6. Como vincular com o front-end

No seu JavaScript do front-end, defina a URL da API:

```js
const API_URL = 'http://localhost:3333/api';
```

Exemplo de cadastro:

```js
async function cadastrarAluno(payload) {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao cadastrar');

  localStorage.setItem('barneyAccessToken', data.accessToken);
  localStorage.setItem('barneyRefreshToken', data.refreshToken);
  return data;
}
```

Exemplo de login:

```js
async function loginBarney(email, password) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao fazer login');

  localStorage.setItem('barneyAccessToken', data.accessToken);
  localStorage.setItem('barneyRefreshToken', data.refreshToken);
  return data;
}
```

Exemplo de rota protegida:

```js
async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('barneyAccessToken');
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || 'Erro na requisição');
  return data;
}
```

---

## 7. Importante sobre segurança

Este backend já é uma base muito mais segura do que fazer tudo no navegador. Mesmo assim, antes de vender para clientes reais, configure obrigatoriamente:

- HTTPS no domínio
- Banco PostgreSQL em produção
- Senhas fortes no `.env`
- Gateway real de pagamento com webhook
- Backup do banco
- Logs e monitoramento
- Política de privacidade e termos de uso
- LGPD para dados como CPF, telefone e pagamentos

Não coloque senhas, chave Pix, token de IA ou credenciais dentro do HTML/JS do front-end.
