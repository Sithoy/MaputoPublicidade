# Maputo Publicidade — Plataforma Digital (Fase 1)

Plataforma digital comercial inicial para a **Maputo Publicidade e Serviços Lda**, com:

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend:** Django 5 + Django REST Framework + JWT
- **Base de dados:** PostgreSQL
- **Infraestrutura local:** Docker Compose

## O que está incluído nesta Fase 1

- Website institucional/comercial com homepage, serviços, catálogo, portfólio, orçamento, área de cliente, contactos e sobre.
- Catálogo digital com produtos, materiais, tamanhos e prazos.
- Formulário de orçamento com upload de ficheiro e geração automática de referência (`MP-AAAA-XXXX`).
- Estimativa de preço automática para produtos simples (baseado no `base_price` e quantidade).
- Área do cliente com login JWT, histórico de orçamentos e reencomenda.
- Workflow simples de aprovação de arte.
- Painel administrativo Django para gerir produtos, pedidos, clientes e orçamentos.
- Integração WhatsApp (`wa.me`) e notificações por e-mail (console em dev).
- Dados de demonstração (seed) com 6 categorias, 14 produtos, 5 pacotes e portfólio.

## Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop) (ou Docker Engine + Compose) a correr.
- ~2 GB de espaço em disco para as imagens.

## Quick start

1. **Clone/copie o projecto** e certifique-se de que tem um ficheiro `.env` na raiz:

   ```bash
   cp .env.example .env
   ```

   O ficheiro `.env` já contém valores de desenvolvimento. Altere `SECRET_KEY` e as credenciais de e-mail antes de usar em produção.

2. **Inicie os containers:**

   ```bash
   docker compose up --build -d
   ```

   O backend irá automaticamente:
   - aplicar as migrações;
   - garantir os dados iniciais com `seed_initial_data`;
   - iniciar o servidor de desenvolvimento.

3. **Aceda à aplicação:**

   | Serviço | URL |
   |---------|-----|
   | Website (Next.js) | http://localhost:3000 |
   | API / Backend | http://localhost:8000 |
   | Admin Django | http://localhost:8000/admin |
   | API docs (DRF) | http://localhost:8000/api/ |

4. **Credenciais de teste** (criadas automaticamente pelo Docker quando `SEED_TEST_USERS=True`):

   | Página | E-mail | Palavra-passe |
   |--------|--------|---------------|
   | Admin | `testadmin@maputopublicidade.co.mz` | `admin12345` |
   | Área do cliente | `cliente@maputopublicidade.co.mz` | `cliente12345` |

   No frontend, também podes usar o botão **"Entrar com conta de teste"**.

5. **Crie um superutilizador** (opcional, para aceder ao admin com outro e-mail):

   ```bash
   docker compose exec backend python manage.py createsuperuser
   ```

## Estrutura do projecto

```
MautoPublicidade/
├── docker-compose.yml
├── .env.example
├── README.md
├── backend/              # Django + DRF
│   ├── config/
│   ├── apps/
│   │   ├── accounts/     # Clientes e autenticação JWT
│   │   ├── catalog/      # Categorias, produtos e pacotes
│   │   ├── portfolio/    # Galeria de portfólio
│   │   └── quotes/       # Orçamentos e aprovação de arte
│   └── fixtures/seed.json
└── frontend/             # Next.js
    ├── app/              # App Router (páginas)
    ├── components/       # Componentes reutilizáveis
    ├── lib/              # API client + helpers
    └── public/           # Imagens e assets
```

## Principais endpoints da API

| Endpoint | Descrição |
|----------|-----------|
| `POST /api/auth/register/` | Registo de cliente |
| `POST /api/auth/login/` | Login (e-mail + password) → JWT |
| `POST /api/auth/refresh/` | Renovar token de acesso |
| `GET /api/auth/me/` | Perfil do utilizador autenticado |
| `GET /api/categories/` | Categorias de serviço |
| `GET /api/products/` | Produtos (filtros: `category`, `featured`) |
| `GET /api/products/<slug>/` | Detalhe de produto |
| `GET /api/packages/` | Pacotes comerciais |
| `GET /api/portfolio/` | Portfólio (filtro: `category`) |
| `POST /api/quotes/` | Criar pedido de orçamento |
| `GET /api/quotes/` | Listar orçamentos do cliente |
| `POST /api/quotes/<ref>/approve/` | Aprovar arte |
| `POST /api/quotes/<ref>/request_change/` | Solicitar alteração |

## Comandos úteis

```bash
# Ver logs
docker compose logs -f

# Parar tudo
docker compose down

# Reconstruir após alterações no código
docker compose up --build -d

# Shell no backend
docker compose exec backend bash

# Shell no frontend
docker compose exec frontend sh

# Garantir seed inicial manualmente
docker compose exec backend python manage.py seed_initial_data

# Criar utilizadores de teste (desenvolvimento)
docker compose exec backend python manage.py seed_test_users
```

## Variáveis de ambiente

Ver `.env.example`. As mais importantes:

- `SECRET_KEY` — chave secreta do Django (alterar em produção).
- `DEBUG` — `True` em desenvolvimento.
- `ALLOWED_HOSTS` e `CORS_ALLOWED_ORIGINS` — domínios permitidos.
- `POSTGRES_*` — credenciais da base de dados.
- `EMAIL_*` — configuração de e-mail.
- `INTERNAL_API_URL` — URL interna usada pelo Next.js server para falar com o backend dentro do Docker (`http://backend:8000`).
- `NEXT_PUBLIC_WHATSAPP_NUMBER` — número de WhatsApp para os botões.

## Notas importantes

- O ambiente Docker local usa o servidor de desenvolvimento do Django e o `npm run dev` do Next.js, ambos com hot-reload.
- Os ficheiros de orçamento (logótipos, artes) são guardados no volume `media/` do backend.
- Os produtos do catálogo já têm imagens de exemplo carregadas a partir do seed (`backend/media/products/`).
- As fotografias do site são de uso livre (Unsplash). Recomenda-se substituí-las por fotos reais do portfólio da Maputo Publicidade assim que estiverem disponíveis.
- Os preços mostrados no simulador são valores de exemplo/tabela base. Devem ser ajustados no admin Django (`base_price` de cada produto) antes de colocar a plataforma em produção.
- O WhatsApp é integrado via links `wa.me`. A automatização via WhatsApp Business API fica para uma fase posterior.

## Próximas fases (fora do âmbito actual)

- Pagamento online (M-Pesa / e-Mola / transferência).
- WhatsApp Business API com confirmações automáticas.
- Editor online de artes e templates.
- CRM, relatórios de vendas e painel de produção por departamento.
- Marketplace de designers parceiros.

---

**Maputo Publicidade e Serviços Lda** — Publicidade, Gráfica e Impressão Digital em Maputo.

## Deploy: GitHub + Vercel + Render + Neon

Fluxo recomendado para producao:

1. Criar uma base de dados PostgreSQL no Neon e copiar a connection string com `sslmode=require`.
2. Importar o repositorio no Render usando o Blueprint `render.yaml`.
3. No Render, preencher:
   - `DATABASE_URL`: connection string do Neon.
4. Importar o mesmo repositorio na Vercel com Root Directory `frontend`.
5. Na Vercel, configurar:
   - `INTERNAL_API_URL`: URL do backend no Render, por exemplo `https://maputo-publicidade-backend.onrender.com`.
6. O backend executa automaticamente `migrate` e `seed_initial_data` no arranque do Render.

O backend tambem aceita as variaveis `POSTGRES_*` para Docker local, mas em producao deve usar `DATABASE_URL` do Neon.
