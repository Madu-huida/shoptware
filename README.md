# Shoptware — BigShop Importados

Sistema completo de monitoramento de estoque, fluxo de caixa, PDV Mobile em tempo real e gestão financeira, desenvolvido com **Node.js + Express + Prisma (SQLite) + Socket.io** no Backend e **React + Vite + TailwindCSS + PWA** no Frontend.

## Como Executar na Loja (PC Servidor Local)

### 1. Iniciar o Backend (Porta 3001)
```bash
cd backend
npm install
npm run dev
```

### 2. Iniciar o Frontend PWA (Porta 5173)
Em outro terminal:
```bash
cd frontend
npm install
npm run dev
```

* No **PC da loja**, acesse: `http://localhost:5173`
* No **Celular via Wi-Fi da loja**, descubra o IP local do PC (ex: `ipconfig` no Windows -> `192.168.1.X`) e acesse no navegador do celular: `http://192.168.1.X:5173/pdv` (você pode instalar na tela inicial como aplicativo PWA).
* Para uso **no 4G na rua (Cloudflare Tunnel ou Tailscale)**:
  * **Tailscale**: Instale o Tailscale no PC e no celular e acesse pelo IP Tailscale do PC (`http://100.x.y.z:5173/pdv`).
  * **Cloudflare Tunnel**: Execute `cloudflared tunnel --url http://localhost:5173` no PC; como o Vite já faz o proxy automático de `/api` e `/socket.io` para a porta `3001`, um único túnel na porta `5173` expõe todo o sistema (Frontend + API + WebSockets) com HTTPS.
