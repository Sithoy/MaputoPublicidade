import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const alt = 'Maputo Publicidade · Proposta comercial no BrandDesk';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
const logo = await readFile(join(process.cwd(), 'public', 'logo-tight.png'), 'base64');

/** Generic, cacheable card: never reads a token, client, price or proposal. */
export default function ProposalShareImage() {
  return new ImageResponse(
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: '#f6f4ed', padding: '48px 64px', color: '#163f30' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <img src={`data:image/png;base64,${logo}`} width={360} height={158} alt="Maputo Publicidade" style={{ objectFit: 'contain' }} />
        <div style={{ display: 'flex', border: '1px solid #c5ac68', borderRadius: 40, padding: '14px 24px', fontSize: 22 }}>BrandDesk by ETIOS</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 48 }}>
        <div style={{ display: 'flex', color: '#947333', fontSize: 22, letterSpacing: 5 }}>MAPUTO PUBLICIDADE</div>
        <div style={{ display: 'flex', fontSize: 76, fontWeight: 700, marginTop: 14, letterSpacing: -3 }}>Proposta comercial</div>
        <div style={{ display: 'flex', fontSize: 32, marginTop: 18, color: '#52675b' }}>Clareza para decidir. Confiança para avançar.</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 30, borderTop: '2px solid #d5c28c', fontSize: 24 }}>
        <div style={{ display: 'flex' }}>Rever · Aprovar · Pedir alterações</div>
        <div style={{ display: 'flex', color: '#65776c', fontSize: 22 }}>maputopublicidade.com</div>
      </div>
    </div>, size,
  );
}
