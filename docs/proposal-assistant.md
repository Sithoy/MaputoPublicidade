# Assistente de preparação de propostas

Em Administração → Orçamentos → Novo orçamento, a equipa comercial pode colar
mensagens de e-mail/WhatsApp ou anexar PDF, imagens, CSV/TXT e Excel XLSX.
O assistente produz um rascunho com itens, especificações, fontes e perguntas.
Não cria nem envia um orçamento nessa etapa. Não inventa preços: a equipa define
preços no editor existente, podendo escolher produtos do catálogo.

## Activação

- Executar `python manage.py migrate` no backend (migração `quotes.0013`).
- Configurar `AI_GATEWAY_API_KEY` apenas no backend/Render. Não colocar a chave
  em código, no frontend ou em variáveis `NEXT_PUBLIC_*`.
- `AI_GATEWAY_MODEL` é opcional; o padrão é `openai/gpt-4.1-mini`, confirmado no
  catálogo do Gateway durante a implementação. Ao mudar, escolher um modelo com
  suporte a imagens, PDFs e structured outputs.
- Verificar saldo/orçamento da conta Gateway antes de activar. Cada preparação
  faz uma chamada paga; há limite de 5 tentativas/minuto por utilizador.
- Testar com um pedido não confidencial e confirmar no Gateway Logs o modelo,
  resultado, consumo e custo. Sem chave, o formulário manual continua disponível.

## Revisão e rastreabilidade

Aplicar o rascunho substitui os campos do formulário. Quantidades desconhecidas,
preços e prazo comercial ficam vazios. A equipa deve resolver dúvidas, confirmar
especificações e marcar a revisão antes de criar. Alterações nos campos invalidam
a confirmação. O prazo solicitado não é uma promessa de entrega automática.
Especificações seguem nas notas de cada item; fontes e questões seguem nas notas
internas, nunca nas observações públicas sem intervenção da equipa.

Mensagem, anexos originais e interpretação inicial são conservados no banco de
dados num registo privado, ligado ao orçamento após a criação. Na página do
orçamento, ‘Fontes do pedido’ permite consultar a mensagem e descarregar originais,
apenas com a permissão `quotes.manage`. Não se usam URLs públicas de media.
Repetir a criação com o mesmo rascunho devolve o orçamento existente, sem duplicar
o documento nem repetir a notificação. A criação normal mantém o envio existente
de notificação ao cliente — a equipa deve estar pronta para isso ao confirmar.

Os dados são enviados a um fornecedor externo via AI Gateway. Rever a política
de privacidade, termos do fornecedor e retenção antes de uso com documentos
sensíveis. Não há limpeza automática de rascunhos não utilizados nesta versão;
definir retenção operacional antes de activar amplamente.

## Limites e próximos passos

- Até 5 anexos, 2 MB por ficheiro, 3 MB total; texto colado até 20.000 caracteres.
- CSV/XLSX: até 500 linhas, 30 colunas; até 60.000 caracteres extraídos no total.
  CSV/TXT requer UTF-8. XLSX lê valores guardados, não executa fórmulas; regravar
  no Excel antes de anexar quando as células calculadas não tenham resultados.
- Até 50 itens por pedido. Dividir pedidos maiores; não se faz truncagem silenciosa.
- OCR/interpretação pode falhar: a comparação com os originais é obrigatória.
- Integração automática com caixas de correio ou WhatsApp, retomada de rascunhos,
  sugestões de preços por regras comerciais e política automática de retenção
  ficam para uma segunda fase. Esta versão não acede a mensagens externas.
