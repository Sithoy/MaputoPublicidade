// @vitest-environment node
import { describe, expect, it } from 'vitest';
import ProposalShareImage from './opengraph-image';

describe('Proposal sharing preview', () => {
  it('renders a real landscape PNG without needing any client or proposal token', async () => {
    const response = ProposalShareImage();
    expect(response.headers.get('content-type')).toBe('image/png');
    const png = Buffer.from(await response.arrayBuffer());
    expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
  });
});
