/** Plain text with WhatsApp's native emphasis; no Markdown-style link labels. */
export function proposalWhatsAppMessage(client: string, reference: string, link: string) {
  const name = client.replace(/[\r\n*_~`]/g, ' ').replace(/\s+/g, ' ').trim();
  return `Olá ${name},\n\n*A sua proposta está pronta.*\nReferência: *${reference}*\n\nReveja os detalhes e indique a sua decisão:\n${link}\n\nPode *aprovar*, *pedir alterações* ou *recusar*.\nSe tiver dúvidas, responda a esta mensagem.\n\n_Maputo Publicidade · BrandDesk_`;
}
