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

### Modo desenvolvimento com hot reload completo:

```bash
bun dev
```

Este único comando inicia **3 processos em paralelo** com watch mode:
- 🔵 **SERVER** (cyan): Backend com hot reload na porta 3000
- 🟣 **CSS** (magenta): Tailwind CSS com auto-rebuild
- 🟢 **CLIENT** (verde): React bundle com auto-rebuild

**Agora tudo atualiza automaticamente!** ✨
- Edite arquivos `.ts/.tsx` do backend → servidor reinicia
- Edite arquivos `.tsx` do React → bundle recompila
- Edite `styles.css` ou classes Tailwind → CSS recompila

Para parar todos os processos: `Ctrl+C`

### Build para produção:

```bash
bun run build
```

Gera todos os arquivos otimizados (CSS + React + Server)

## 📜 Scripts Disponíveis

```bash
# Desenvolvimento
bun dev              # Hot reload completo (backend + CSS + React)
bun run dev:server   # Apenas backend com hot reload
bun run dev:css      # Apenas CSS watch mode
bun run dev:client   # Apenas React watch mode

# Build
bun run build        # Build completo (CSS + React + Server)
bun run build:css    # Build apenas CSS
bun run build:client # Build apenas React bundle
bun run build:server # Build apenas servidor

# Produção
bun start            # Roda versão de produção
```

## 🌐 Acessar

Após rodar `bun dev`:
- **Início**: http://localhost:3000
- **Registro**: http://localhost:3000/registrar
- **Login**: http://localhost:3000/entrar
- **Grupos**: http://localhost:3000/grupos
- **Dashboard**: http://localhost:3000/painel


### Autenticação
- [x] Registro de usuário
- [x] Login de usuário
- [x] Autenticação com sessões seguras
- [x] Dashboard protegido

### Despesas
- [x] Adicionar despesas
- [x] Dividir despesas entre membros
- [x] Divisão customizada ou igual
- [x] Selecionar quais membros participam da despesa
- [x] Remover membros da divisão (checkbox)
- [x] Categorização de despesas
- [x] Visualizar histórico de despesas
- [x] Expandir despesas para ver divisão detalhada
- [x] Ver quanto cada pessoa deve/recebeu em cada despesa
- [x] Editar despesas existentes
- [x] Histórico de mudanças em despesas (audit log)
- [x] Ver quem alterou, quando e o que foi modificado

### Cálculos
- [x] Calcular balanços (quem deve/recebe)
- [x] Algoritmo de simplificação de dívidas
- [x] Mostrar quem deve pagar para quem

### Liquidações
- [x] Registrar pagamentos entre membros
- [x] Atualizar balanços automaticamente
- [x] Histórico de transações completo

### Auditoria
- [x] Sistema de histórico de mudanças
- [x] Registro automático de todas as edições
- [x] Rastreamento de:
  - Quem fez a alteração
  - Quando foi alterado
  - Valor anterior e novo
  - Mudanças na divisão entre membros

### Interface
- [x] Interface em português
- [x] UI moderna com shadcn/ui
- [x] Responsivo e acessível
- [x] Busca de usuários com normalização de texto
- [x] Gradientes e animações suaves