import { describe, expect, it } from 'vitest';
import { proposalWhatsAppMessage } from './proposal-whatsapp';

describe('WhatsApp proposal copy', () => {
  it('uses short paragraphs, native emphasis and one isolated approval link', () => {
    const link = 'https://maputopublicidade.com/proposta#token=synthetic';
    const message = proposalWhatsAppMessage('Empresa ABC', 'MP-0008-2026', link);
    expect(message).toContain('*A sua proposta está pronta.*');
    expect(message).toContain('Referência: *MP-0008-2026*');
    expect(message.split('\n')).toContain(link);
    expect(message.match(/https:\/\//g)).toHaveLength(1);
    expect(message).not.toContain('NB:');
    expect(message).not.toContain('segue em anexo');
    expect(message).not.toContain('não confirma automaticamente');
  });
  it('does not allow the client name to inject WhatsApp formatting or paragraphs', () => {
    expect(proposalWhatsAppMessage('Empresa\n*texto*', 'MP-0001-2026', 'link').startsWith('Olá Empresa texto,')).toBe(true);
  });
});
