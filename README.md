# 📡 Radar de Leads

> **Detector de vazamento de vendas para autônomos e MEIs que atendem sozinhos.**
> Não é um CRM inchado e burocrático: mostra apenas o que está vazando e qual ação tomar agora.

---

## 🎯 Por que o Radar de Leads?

Quem atende sozinho e faz tudo no negócio não tem tempo para atualizar dezenas de campos em CRMs complexos. O maior problema não é a falta de leads, mas o **vazamento de vendas**:
- O cliente pede um orçamento no WhatsApp e você esquece de responder por 2 dias.
- Você envia a proposta e nunca mais faz o acompanhamento (*follow-up*).
- O lead esfria e você perde dinheiro na mesa sem perceber.

O **Radar de Leads** calcula automaticamente os pontos de fuga com base em regras configuráveis e destaca o que você precisa fazer **agora**.

---

## 🚀 Como Rodar o Projeto

### Pré-requisitos
- **Node.js**: v22 ou superior (testado na v24)
- **npm**: v10 ou superior

### 1. Instalação das dependências
Na raiz do projeto:
```bash
npm install
```

### 2. Rodar em modo de desenvolvimento (Front + Back com um único comando)
```bash
npm run dev
```
- **Backend (API)**: `http://localhost:3001`
- **Frontend (Web)**: `http://localhost:5173`

No modo local, a primeira execução exibe a tela para definir uma senha mestre. O SQLite local continua sendo uma instalação de usuário único.

---

## 📱 Como Acessar de Outro Dispositivo (Celular na Mesma Rede Wi-Fi)

Tanto o frontend (Vite) quanto o backend (Express) já estão configurados para escutar no host `0.0.0.0`.

1. Descubra o IP local do seu computador na rede Wi-Fi:
   - **Windows**: Abra o PowerShell ou Prompt de Comando e digite `ipconfig` (procure por *Endereço IPv4*, ex: `192.168.1.15`).
   - **Linux / macOS**: Digite `ifconfig` ou `ip a`.
2. No navegador do seu celular (conectado ao mesmo Wi-Fi), acesse:
   ```text
   http://<SEU_IP_LOCAL>:5173
   ```
   *(Exemplo: `http://192.168.1.15:5173`)*

---

## 💾 Persistência e Backup

Em desenvolvimento, o backend usa SQLite em `server/radar.sqlite`. O antigo caminho dependia do diretório de inicialização: a Hostinger iniciava `app.js` pela raiz e acabava usando outro arquivo SQLite, que também não é garantido entre deploys. Em produção, use Supabase para manter os dados fora dos arquivos do deploy. O servidor recusa iniciar em produção sem `DATABASE_PROVIDER=supabase`, evitando voltar silenciosamente a um banco local efêmero.

### Configurar o Supabase
1. Crie um projeto Supabase.
2. No **SQL Editor**, execute [`supabase/migrations/202611140001_initial_schema.sql`](./supabase/migrations/202611140001_initial_schema.sql) e, em seguida, [`supabase/migrations/202611150001_multi_user_auth.sql`](./supabase/migrations/202611150001_multi_user_auth.sql).
3. Antes de criar qualquer conta, desative o cadastro público em **Authentication > Settings > User Signups**.
4. Crie a conta administradora pelo painel em **Authentication > Users > Add user**. Se já existirem contas Auth, escolha explicitamente qual delas será administradora.
5. No SQL Editor, substitua `admin@exemplo.com` pelo e-mail escolhido e execute este bloco. Ele promove a conta e atribui a ela os leads, interações e configurações existentes:

   ```sql
   DO $$
   DECLARE
     admin_id uuid;
   BEGIN
     SELECT id INTO admin_id
     FROM public.perfis
     WHERE lower(email) = lower('admin@exemplo.com');

     IF admin_id IS NULL THEN
       RAISE EXCEPTION 'O e-mail informado não possui uma conta Supabase Auth.';
     END IF;

     UPDATE public.perfis SET role = 'admin' WHERE id = admin_id;
     UPDATE public.leads SET user_id = admin_id WHERE user_id IS NULL;
     UPDATE public.interacoes AS i
     SET user_id = l.user_id
     FROM public.leads AS l
     WHERE i.lead_id = l.id AND i.user_id IS NULL AND l.user_id = admin_id;

     IF EXISTS (
       SELECT 1 FROM public.configuracoes WHERE id = 1 AND user_id IS NULL
     ) THEN
       DELETE FROM public.configuracoes
       WHERE user_id = admin_id AND id <> 1;
       UPDATE public.configuracoes SET user_id = admin_id
       WHERE id = 1 AND user_id IS NULL;
     END IF;

     IF EXISTS (SELECT 1 FROM public.configuracoes WHERE user_id IS NULL) THEN
       RAISE EXCEPTION 'Há configurações sem proprietário além da configuração legada (id = 1). Verifique public.configuracoes antes de continuar.';
     END IF;

     ALTER TABLE public.leads ALTER COLUMN user_id SET NOT NULL;
     ALTER TABLE public.interacoes ALTER COLUMN user_id SET NOT NULL;
     ALTER TABLE public.configuracoes ALTER COLUMN user_id SET NOT NULL;
   END
   $$;
   ```

6. Configure estas variáveis no ambiente do backend (na Hostinger, em **Avançado > Node.js > Variáveis de ambiente**):
   - `NODE_ENV=production`
   - `DATABASE_PROVIDER=supabase`
   - `SUPABASE_URL` — URL do projeto
   - `SUPABASE_SECRET_KEY` — a nova chave **Secret** do backend (`sb_secret_...`); nunca a coloque no frontend, em variáveis `VITE_*` ou no Git
   - `APP_URL` — URL pública do app, por exemplo `https://checklead.robsonsvicero.com.br`; usada para direcionar os convites
7. Configure o SMTP em **Authentication > SMTP Settings** e permita a URL `https://checklead.robsonsvicero.com.br/login?convite=1` em **Authentication > URL Configuration**. Para desenvolvimento local, permita também `http://localhost:5173/login?convite=1`.
8. Coloque o app em manutenção durante a aplicação da migração e a publicação do código atualizado: a nova versão exige o schema multiusuário. Depois, reinicie o aplicativo. Sem essas configurações, o backend falha explicitamente em vez de gravar em SQLite temporário.

`JWT_SECRET` só é usado pelo login local em SQLite; o modo Supabase usa os tokens de sessão do Supabase Auth em cookies HTTP-only.

Para desenvolvimento local, copie `server/.env.example` para `server/.env`. Mantenha `DATABASE_PROVIDER=sqlite` até configurar o Supabase. Se já tiver `SUPABASE_SERVICE_ROLE_KEY` no `.env`, ela ainda é aceita temporariamente, mas prefira migrar para a nova variável `SUPABASE_SECRET_KEY`.

### Migrar os dados locais
O banco SQLite local não é enviado automaticamente. Depois de criar a conta destino no Supabase Auth e aplicar as duas migrações SQL, configure `DATABASE_PROVIDER=supabase`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY` e `SUPABASE_MIGRATION_USER_ID` (UUID da conta destino) no ambiente usado pelo comando. Faça primeiro uma prévia:

```bash
npm run migrate:supabase --workspace=server -- --dry-run
```

Se os totais estiverem corretos, execute a migração:

```bash
npm run migrate:supabase --workspace=server
```

A migração copia leads, interações e configurações para a conta informada e não apaga dados do SQLite nem envia o antigo hash da senha. Os IDs podem ser regenerados para evitar colisões entre usuários. A execução é recusada se a conta destino já tiver leads ou interações. O comando de prévia só mostra contagens e não envia dados.

Se os leads estiverem apenas no servidor antigo, exporte o **Backup JSON Completo** antes do próximo deploy. Depois de conectar o Supabase, restaure esse arquivo pela interface em **Ajustes**; a restauração substitui apenas os leads e interações da conta autenticada. O backup não inclui senhas.

### Backup manual
Na interface, acesse **Ajustes > Planilha de Leads & Backup** para exportar CSV ou um backup JSON completo. Guarde os arquivos em local seguro.

---

## ✨ Funcionalidades e Design System
- **Cadastro Rápido & Flexível**: Campos dedicados para **WhatsApp**, **E-mail**, **Responsável** pelo lead, Serviço, Valor Estimado (R$) e Origem.
- **Edição e Exclusão**: É possível editar qualquer dado do lead ou removê-lo diretamente no card.
- **Ações em 1 Clique**: Registre "Falei com ele", "Enviei orçamento", "Fechou", "Perdeu" (com motivo) ou "Adicionar nota".
- **Design System Dark Radar**: Interface escura de alto contraste inspirada em radares táticos (`#080d17`, acentos ciano elétrico `#1fe6d6`, alertas em laranja quente `#f95738`), tipografia clara e ícone no header com efeito de **varredura de radar (radar-sweep)** e anel pulsante (**pulse-ring**).

---

## 🧪 Rodando os Testes e Compilação

### Executar os Testes Unitários (Vitest)
Cobre casos de borda: lead sem interações, datas no limite exato, lista vazia e cálculos de métricas:
```bash
npm run test
```

### Compilar para Produção
```bash
npm run build
```

### Iniciar em Produção
```bash
npm start
```

---

## 🌐 Deploy na Hostinger (Hospedagem Compartilhada / Cloud com hPanel)

1. **Suba o projeto para o GitHub**:
   - Inicialize o repositório (`git init`), faça o commit e suba para o GitHub.
2. **No hPanel da Hostinger**:
   - Acesse **Avançado > Git** e conecte seu repositório.
   - Acesse a seção **Avançado > Node.js**:
     - **Versão do Node.js**: Selecione **22.x** ou superior.
     - **Modo da Aplicação**: `Produção`.
     - **Raiz do Aplicativo**: diretório onde você clonou o projeto (ex: `public_html` ou `radar`).
     - **Arquivo de Inicialização**: `app.js`.
3. **Instalar dependências e compilar**:
   - Pelo terminal SSH ou terminal do painel:
     ```bash
     npm install
     npm run build
     ```
4. **Configure as variáveis de ambiente do backend** conforme a seção **Configurar o Supabase** antes de iniciar.
5. **Iniciar o aplicativo**:
   - Clique em **Reiniciar / Iniciar Aplicativo** no hPanel.
   - O `app.js` iniciará o backend Express na porta designada e servirá automaticamente a interface compilada (`web/dist`). Os leads serão armazenados no Supabase, não no diretório do deploy.

---

## 🔒 Segurança e Privacidade
- **Contas individuais**: Supabase Auth com e-mail e senha; não há cadastro público. Administradores enviam convites pelo app.
- **Sessão segura**: tokens do Supabase Auth são mantidos em cookies HTTP-only, `Secure` em produção.
- **Isolamento de dados**: cada consulta, importação, exportação, backup e alteração é limitada ao usuário autenticado. As tabelas também usam RLS e políticas por proprietário.
- **Modo local**: SQLite continua usando a senha mestre única, protegida por `bcrypt`.
- **Proteção contra força bruta**: Limitador de tentativas de login (rate limiting).
- **Proteção contra SQL Injection**: SQLite usa *prepared statements*; o Supabase é acessado somente pelo backend.
- **Chaves protegidas**: A chave `service_role` fica somente no ambiente do servidor; as tabelas Supabase têm RLS habilitado e sem acesso público.
