# Dividir Conta 💰

Uma aplicação moderna para dividir contas e gerenciar despesas compartilhadas.

## 🚀 Tecnologias

- **Backend**: Bun + Elysia
- **Frontend**: React + TypeScript + React Router
- **UI**: shadcn/ui + Tailwind CSS
- **Banco de dados**: SQLite (nativo do Bun)
- **Autenticação**: Sessões com cookies httpOnly + bcrypt

## 📦 Instalação

```bash
bun install
```

## 🛠️ Desenvolvimento

### Primeira vez (gerar arquivos CSS/JS):

```bash
# Gerar CSS do Tailwind
bun run build:css

# Gerar bundle React
bun run build:client
```

### Modo desenvolvimento:

```bash
# Inicia o servidor com hot reload
bun dev
```

**Importante:** O `bun dev` NÃO compila automaticamente:
- ❌ Tailwind CSS não é recompilado automaticamente
- ❌ React bundle não é reconstruído automaticamente

### Desenvolvimento com auto-rebuild:

```bash
# Terminal 1: Servidor
bun dev

# Terminal 2: Watch CSS (recompila ao salvar arquivos)
bun run watch:css

# Nota: Para mudanças no React, rode: bun run build:client
```

## 📜 Scripts Disponíveis

```bash
bun dev              # Servidor dev com hot reload
bun run build:css    # Compila Tailwind CSS
bun run build:client # Compila React bundle
bun run build:server # Compila servidor
bun run build        # Build completo (CSS + React + Server)
bun run watch:css    # Watch mode do CSS
bun start            # Produção
```

## 🌐 Acessar

Após rodar `bun dev`:
- **URL**: http://localhost:3000
- **Registro**: http://localhost:3000/registrar
- **Login**: http://localhost:3000/entrar

## ✅ Funcionalidades Atuais

- [x] Registro de usuário
- [x] Login de usuário
- [x] Autenticação com sessões
- [x] Dashboard protegido
- [x] Interface em português
- [x] UI moderna com shadcn/ui