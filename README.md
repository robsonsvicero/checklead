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

Na primeira execução, o sistema exibirá automaticamente a tela para você **definir sua senha mestre**.

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

## 💾 Como Fazer Backup do Banco de Dados SQLite

O banco de dados SQLite armazena todos os seus dados em um único arquivo local. Nenhum dado é enviado para servidores de terceiros.

### Opção 1: Cópia Direta do Arquivo (Mais simples e seguro)
1. Pare o servidor (`Ctrl + C`).
2. Copie o arquivo `radar.sqlite` localizado na pasta raiz ou em `server/radar.sqlite`.
3. Guarde esse arquivo em um pendrive, Google Drive, Dropbox ou pasta segura.
4. Para restaurar, basta recolocar o arquivo `radar.sqlite` no mesmo local.

### Opção 2: Importação e Exportação via Interface (CSV e JSON)
1. Acesse o menu **Ajustes** (Configurações) no Radar de Leads.
2. Na seção **"Planilha de Leads & Backup"**:
   - Clique em **"📥 Baixar Planilha Modelo Vazia"** para obter o arquivo `.csv` já com os nomes e padrão das colunas (`Nome`, `WhatsApp`, `E-mail`, `Responsável`, `Serviço`, `Valor Estimado (R$)`, `Origem`, `Status`, `Motivo da Perda`).
   - Clique em **"📤 Fazer Upload de Planilha (.csv)"** para subir sua lista de leads pronta e importar tudo de uma só vez para o sistema.
3. Você também pode exportar os dados a qualquer momento em **"Baixar Planilha Atual (CSV)"** para abrir no Excel ou em **"Baixar Backup JSON Completo"**.

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
     - **Versão do Node.js**: Selecione **22.x** (obrigatório para o recurso `node:sqlite`).
     - **Modo da Aplicação**: `Produção`.
     - **Raiz do Aplicativo**: diretório onde você clonou o projeto (ex: `public_html` ou `radar`).
     - **Arquivo de Inicialização**: `app.js`.
3. **Instalar dependências e compilar**:
   - Pelo terminal SSH ou terminal do painel:
     ```bash
     npm install
     npm run build
     ```
4. **Iniciar o aplicativo**:
   - Clique em **Reiniciar / Iniciar Aplicativo** no hPanel.
   - O `app.js` iniciará o backend Express na porta designada e servirá automaticamente a interface compilada (`web/dist`). O banco de dados SQLite (`radar.sqlite`) ficará salvo localmente na hospedagem de forma permanente.

---

## 🔒 Segurança e Privacidade
- **Sessão segura**: Senha criptografada com `bcrypt` (10 rounds de salt) e sessão mantida via cookie HTTP-only ou token seguro.
- **Proteção contra força bruta**: Limitador de tentativas de login (rate limiting).
- **Proteção contra SQL Injection**: Todas as consultas ao SQLite utilizam *prepared statements* parametrizados.
- **Zero serviços de terceiros**: Não utiliza Firebase, Supabase ou Auth0.
