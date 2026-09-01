# BrandDesk — Runbook do Piloto

Guia operacional para o piloto com clientes reais (Fase 4 do plano BrandDesk).

## 1. Verificação técnica antes do piloto

### Vercel (frontend) — variáveis de ambiente (Production)

- [ ] `NEXT_PUBLIC_ENABLE_TEST_CREDENTIALS` **ausente ou `false`** (o botão "Entrar com conta de teste" não pode aparecer em produção)
- [ ] `NEXT_PUBLIC_COMPANY_LEGAL_NAME`, `NEXT_PUBLIC_COMPANY_NUIT`, `NEXT_PUBLIC_COMPANY_ADDRESS`, `NEXT_PUBLIC_COMPANY_EMAIL`, `NEXT_PUBLIC_COMPANY_PHONE` preenchidos (usados nos documentos impressos no browser)
- [ ] `INTERNAL_API_URL` aponta para o backend no Render

### Render (backend) — variáveis de ambiente

- [ ] `SEED_TEST_USERS` = `False`
- [ ] `DEBUG` = `False`
- [ ] `COMPANY_LEGAL_NAME`, `COMPANY_NUIT`, `COMPANY_ADDRESS`, `COMPANY_EMAIL`, `COMPANY_PHONE` preenchidos (usados nos PDFs gerados no servidor)
- [ ] `EMAIL_HOST`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD` configurados (notificações por e-mail)
- [ ] `PAYMENT_PROVIDER` = `mock` até termos credenciais M-Pesa/E-Mola; quando chegarem: definir `PAYMENT_WEBHOOK_SECRET` (obrigatório) e as chaves `MPESA_*`
- [ ] `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS` incluem os domínios de produção

### Verificação funcional (10 minutos)

- [ ] `https://maputo-publicidade-backend-4ppp.onrender.com/health/` responde `{"status":"ok","db":true}`
- [ ] Criar conta de teste de piloto, submeter pedido via `/area-cliente/novo-pedido`
- [ ] Staff: definir preço → cliente vê proposta → cliente aprova → staff converte em encomenda
- [ ] Staff: enviar prova de arte → cliente aprova ou pede alteração → versão fica registada
- [ ] Staff: descarregar PDF da proposta e de uma fatura em rascunho
- [ ] Staff: agendar entrega → cliente confirma recepção
- [ ] Login na área admin com cada função (comercial, produção, finanças, conteúdo) e confirmar que cada um vê apenas o que deve

## 2. Configuração do piloto

### Equipa MP (admin → Utilizadores)

| Pessoa | Função na plataforma |
|---|---|
| Dono/gerente | Proprietário (superuser) |
| Comercial | Comercial |
| Designer | Produção (inclui gestão de arte) |
| Produção | Produção |
| Financeiro | Finanças |

### Clientes piloto (3–5 empresas de confiança)

- [ ] Criar conta de cliente por empresa (admin → Utilizadores → Novo)
- [ ] Preencher perfil: empresa, NUIT, telefone, morada
- [ ] Pedir a cada cliente que guarde o logótipo em **Biblioteca da marca**
- [ ] Enviar credenciais + guia rápido (ver secção 5)

## 3. Guião das 2 semanas

**Dias 1–2 — arranque**
- Sessão de 30 min com cada cliente piloto (presencial ou videochamada): login, novo pedido, aprovar proposta
- Regra de ouro: **todos os pedidos novos entram pelo portal**, não por WhatsApp

**Dias 3–10 — operação normal**
- Staff actualiza estados todos os dias (o Quadro de produção é a ferramenta diária)
- Clientes aprovam propostas e artes no portal
- Registar qualquer passo em que alguém "volta ao WhatsApp"

**Dias 11–14 — recolha**
- Questionário de 5 perguntas (secção 4)
- Reunião interna: o que funcionou, o que faltou
- Lista de correcções priorizada

## 4. Medição (comparar antes vs. durante o piloto)

| KPI | Antes | Piloto |
|---|---|---|
| Pedidos de orçamento por semana | | |
| Tempo médio pedido → proposta | | |
| Tempo médio proposta → aprovação | | |
| Revisões de arte por trabalho | | |
| Mensagens WhatsApp por trabalho | | |
| Trabalhos entregues no prazo | | |
| Clientes que usaram "Repetir pedido" | | |

**Perguntas ao cliente (fim do piloto):**
1. Conseguiu acompanhar o seu pedido sem nos contactar?
2. A aprovação da proposta/arte foi clara?
3. O que faltou ou confundiu?
4. Voltaria a usar para o próximo trabalho?
5. Recomendaria a outra empresa?

## 5. Guia rápido para o cliente (enviar por e-mail/WhatsApp)

> **Bem-vindo ao BrandDesk — a forma mais simples de gerir os materiais da sua marca.**
>
> 1. Aceda a www.maputopublicidade.com/area-cliente e entre com o seu e-mail e palavra-passe.
> 2. Para um novo trabalho: **Novo pedido** — escolha o que precisa e envie. Não precisa de saber termos técnicos.
> 3. Quando a proposta estiver pronta, recebe um e-mail. Em **Propostas**, reveja o valor, descarregue o PDF e aprove com um clique.
> 4. Se o trabalho tiver arte, aprova a prova digital em **Aprovações** antes de irmos para produção.
> 5. Em **Projetos** acompanha cada etapa até à entrega — e confirma a recepção no fim.
> 6. Em **Biblioteca da marca** guarde o seu logótipo uma única vez.
>
> Dúvidas? Responda a este e-mail ou fale connosco no WhatsApp.

## 6. Processo durante o piloto

- **Canal de bugs**: registar no quadro (ou folha partilhada) com: página, o que aconteceu, o que devia acontecer, captura de ecrã
- **Triagem diária** (10 min): crítico (bloqueia trabalho real) → corrigir no dia; resto → backlog
- **Não adicionar funcionalidades durante o piloto** — só correcções
- Critério de saída: 3+ trabalhos reais completos por via do portal sem intervenção manual

## 7. Depois do piloto → lançamento público

- [ ] Correcções do piloto aplicadas
- [ ] CTA na homepage: "Gerir a minha marca"
- [ ] Guia de onboarding actualizado com o que se aprendeu
- [ ] Migração dos clientes actuais (convite por e-mail)
