# Maputo Publicidade — Plataforma Digital (Fase 1)

Plataforma digital comercial inicial para a **Maputo Publicidade e Serviços Lda**, com:

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend:** Django 5 + Django REST Framework + JWT
- **Base de dados:** PostgreSQL
- **Infraestrutura local:** Docker Compose

## O que está incluído nesta Fase 1

### Área operacional por função

- `/admin/recepcao` mantém uma fila paginada de pedidos desde o atendimento até à entrega. A triagem, preparação da proposta, revisão interna, acompanhamento, mensagens contextualizadas, anexos e histórico abrem no mesmo espaço.
- A fila distingue acompanhamento, espera pelo Comercial/cliente e concluídos/cancelados, com filtros por responsável. A aprovação comercial continua separada da aceitação do cliente; a Recepção não ganha permissões financeiras nem de confirmação da produção.
- `/admin/producao` organiza o trabalho por briefing técnico, arte/apreciação quando necessária, produção/conferência e entrega/instalação. Mantém a API técnica sem valores comerciais. Os filtros desta lista aplicam-se às páginas já carregadas; utilize “Mais trabalhos” para consultar páginas adicionais.
- A etapa indicada é uma orientação derivada dos estados reais, não um novo estado persistido. Consultar outra etapa não avança o pedido nem contorna a aprovação. Há confirmação antes de descartar alterações dentro do espaço e aviso ao fechar/recarregar a página.
- Os formulários e ações reutilizam as permissões existentes: a Recepção pode consultar a entrega, mas só funções com `orders.manage_delivery` a podem alterar. Conversas gerais continuam disponíveis na caixa de mensagens; no pedido mostram-se apenas conversas ligadas à referência ou à encomenda correspondente.

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

### Funções da equipa MP

O acesso à Administração usa RBAC aplicado no backend. Ocultar opções no frontend é apenas uma conveniência; cada operação é também validada pela API.

| Função | Responsabilidade principal |
|--------|----------------------------|
| Proprietário | Acesso total, incluindo criação e alteração de funções da equipa |
| Administrador | Operação completa, excepto gestão das funções de outros membros da equipa |
| Comercial | Criação de propostas, orçamentos, conversão em encomenda e consulta de faturas/pagamentos |
| Produção | Consulta de propostas, provas de arte e avanço do estado de produção |
| Finanças | Emissão de faturas, exportações e gestão de pagamentos |
| Conteúdo | Produtos, categorias, pacotes, portfólio e parceiros |

Os utilizadores staff existentes são migrados para **Administrador**. Superutilizadores Django são tratados como **Proprietário**.

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
- Os links públicos `wa.me` continuam disponíveis. A integração de texto da Meta Cloud API pode ser configurada em **Admin → Definições → WhatsApp**, após onboarding do número.

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

## Propostas: preparação pela Receção e aprovação interna

O fluxo mantém a mesma referência, cliente, anexos e responsável: Receção prepara → Comercial/administração revê → Receção disponibiliza/regista o envio → cliente aceita. `quotes.manage` permite à Receção preparar artigos/preços/condições e registar a decisão do cliente; `quotes.review` é reservado ao Comercial e administração. Quem participou na preparação da versão não pode aprová-la. A Receção não pode criar uma encomenda confirmada pelo intake para contornar esta aprovação; a ação anterior de intake confirmado permanece reservada à administração com acesso ao intake e à revisão.

A migração `quotes.0020` preserva documentos existentes com `proposal_stage=legacy`. Rever preços ou condições de uma proposta antiga adota o novo fluxo. Novos pedidos recebidos pela aplicação aguardam preparação; os valores provisórios e histórico interno não são publicados no BrandDesk. O PDF para clientes e a aceitação/conversão exigem publicação da versão aprovada. Alterações nos artigos, valores, identificação/faturação ou condições retiram a aprovação e exigem nova submissão; documentos já aceites/convertidos não admitem essas alterações. O histórico guarda autor, submissão, snapshot das condições/artigos, aprovação/devolução e envio por versão. Não há custos por artigo registados neste fluxo, pelo que não se inventa margem.

“Disponibilizar / registar envio” publica a versão aprovada no BrandDesk e usa a notificação existente; para clientes sem conta, a Receção deve enviar o PDF pelo canal acordado e registar esse envio. Não representa envio automático por WhatsApp ou garantia de entrega por email. A criação de orçamentos não notifica o cliente como proposta pronta antes da aprovação interna. As filas “As minhas propostas” e “Aguardam aprovação” usam filtros do backend; não criam uma segunda cópia do pedido.

## Produção e Artes: separação de informação

A função Produção entra em `/admin/producao` e não tem `quotes.view`, `payments.view`, gestão comercial ou faturação. A API de encomendas devolve uma lista explícita de campos operacionais, sem preços, valores pagos/em dívida, referências de faturas, perfis de faturação, notas comerciais ou histórico financeiro. Propostas/PDFs comerciais, pagamentos e faturas continuam protegidos no backend. As notas técnicas passam a um campo próprio no trabalho; notas internas antigas não são copiadas automaticamente porque podem conter informação comercial.

A migração `quotes.0021` conserva versões de arte anteriores como publicadas. Novas artes no espaço Produção são rascunhos privados (PNG/JPEG/WebP/PDF, até 3 MB), guardados na base de dados sem URL pública de storage. Publicar uma versão cria a apreciação no BrandDesk e uma notificação interna; não altera aprovação de preço, proposta comercial ou pagamento. A Produção pode acompanhar estados operacionais, e uma ordem com nova arte privada pendente não avança para produção antes da aprovação da versão atual. Ficheiros históricos mantêm o storage anterior; a nova privacidade de conteúdo aplica-se aos uploads novos.

WhatsApp e email usam mensagens preparadas com um link assinado de revisão da arte, válido por sete dias; o envio é manual na aplicação do operador, sem garantir entrega nem depender da ativação da Cloud API. Quem recebe/obtém o link pode consultar e responder sobre essa versão. Não representa autenticação da identidade: a resposta guarda a origem `shared_link` e o nome declarado. No BrandDesk a resposta é autenticada, ligada à conta e à versão publicada. Nenhuma das duas decisões aceita preços ou condições comerciais.

Os links podem ser revogados ou renovados (renovar invalida links anteriores). Versões substituídas ficam disponíveis para consulta enquanto o link for válido, mas não aceitam novas decisões. Revogar um link não retira acesso ao ficheiro do cliente autenticado no BrandDesk. Os endpoints de ficheiros privados verificam propriedade/permissões e usam `private, no-store`; a página pública usa `no-referrer` e `noindex`. Não inclua propostas, preços ou condições financeiras em ficheiros, descrições ou notas destinados à Produção/cliente. Estes controlos não fazem análise de conteúdo ou malware de PDFs/imagens.

## WhatsApp: configuração e mensagens

O proprietário/administrador configura `/admin/definicoes`; a recepção utiliza `/admin/apoio` sem acesso às credenciais. A integração começa desativada e não faz migração nem onboarding do número.

1. Para manter o mesmo número no telefone, conclua o onboarding **Coexistence** com a Meta/fornecedor elegível. Não apague a conta Business existente para testar. A opção “apenas API” não oferece esta utilização conjunta.
2. Preencha número internacional, WABA ID, Phone Number ID, Meta App ID, versão Graph API e credenciais. O ID do portefólio e fornecedor são informação auxiliar opcional. Use um token de sistema adequado a produção com permissões `whatsapp_business_messaging` e `whatsapp_business_management`, acesso aos ativos e aplicação autorizada. Não coloque tokens em Git ou chat.
3. Guarde e teste a ligação. Cada teste desativa temporariamente a integração; confirme o resultado e volte a ativar no final.
4. Na aplicação Meta, configure a Callback URL mostrada no formulário e o mesmo verify token. Subscreva `messages` e a aplicação à WABA. Para mensagens enviadas pelo telefone, subscreva também `smb_message_echoes` quando suportado pelo onboarding Coexistence. Use a URL HTTPS pública do backend, sem autenticação de staging/redirects, preservando o corpo e o cabeçalho `X-Hub-Signature-256`.
5. Atualize o estado, selecione ativar e guarde. Confirme com uma mensagem real de um cliente e uma resposta no inbox antes de considerar a ligação operacional. A verificação GET do webhook não comprova, sozinha, a entrega de eventos ou a assinatura App Secret.

As credenciais são encriptadas na base de dados com uma chave derivada da `SECRET_KEY` do Django. Esta deve ser forte, privada e estável entre deploys; a sua rotação exige re-encriptação das credenciais com a chave anterior. Mantenha acesso restrito aos backups e ao backend. As migrações `core.0008` e `core.0009` são obrigatórias antes de servir esta funcionalidade. Nunca exponha o backend com `DEBUG=True` em produção.

Mensagens recebidas criam conversas WhatsApp separadas das contas BrandDesk: não são associadas automaticamente a um utilizador apenas pelo telefone. Eventos repetidos são deduplicados pelo ID da Meta. Mensagens de texto podem ser respondidas na janela de 24 horas após a última mensagem recebida do cliente; respostas do telefone e recibos não prolongam essa janela. Fora dela, o inbox bloqueia texto livre e oferece o editor de templates e acesso ao telefone em Coexistence. O botão Atualizar procura novas mensagens; esta versão não oferece atualização em tempo real, importação de histórico, criação automática de pedidos ou IA.

**Anexos:** imagens JPEG/PNG/WebP e documentos PDF recebidos podem ser consultados por membros com `support.manage`, dentro da conversa, sem expor URLs temporárias ou tokens da Meta. Só são pedidos à Meta ao clicar Visualizar; o proxy autentica, limita a 20 MB, verifica o formato/assinatura do ficheiro e o hash quando disponível, e rejeita URLs externas e redirects. O conteúdo não é guardado em disco nem colocado em cache público. URLs blob no navegador são libertadas ao fechar/desmontar a pré-visualização. PDF é apresentado num iframe com sandbox e pode ser descarregado explicitamente se o navegador não suportar a visualização. Audio, vídeo e outros formatos ficam identificados para consulta na aplicação Business quando disponível. Anexos anteriores à migração, sem media ID guardado, não são recuperados automaticamente; ficheiros expirados na Meta exigem reenvio pelo cliente.

**Templates:** no inbox WhatsApp, “Enviar template aprovado” consulta os templates da WABA com paginação, mostra variáveis e pré-visualização, e exige registo/confirmacão da autorização do cliente e do envio. Esta etapa suporta templates `UTILITY` aprovados com cabeçalho/corpo/rodapé de texto e variáveis posicionais ou nomeadas; templates com botões, media, autenticação ou marketing não são enviados por este editor. Criação/submissão à aprovação continua no WhatsApp Manager. O backend verifica novamente pertença à WABA, idioma, estado, categoria, versão do conteúdo e variáveis antes de enviar. Uma versão alterada desde a pré-visualização é rejeitada para nova revisão. O registo da mensagem guarda o remetente, identificação do template e declaração de autorização (não é validação automática do consentimento). Não há envio automático ou em massa; tarifas da Meta podem aplicar-se. O template não reabre a janela de texto livre: é necessário o cliente responder.

Um envio sem confirmação é guardado como `unconfirmed`, sem repetição automática: confirme no telefone antes de reenviar para evitar duplicações. Assinaturas inválidas são rejeitadas; eventos válidos durante a desativação recebem HTTP 503 para permitir retries da Meta. Um backend suspenso/indisponível pode atrasar a receção; para atendimento operacional, mantenha-o disponível e monitorizado. Testes automatizados usam payloads assinados e chamadas Meta simuladas, não credenciais reais.
