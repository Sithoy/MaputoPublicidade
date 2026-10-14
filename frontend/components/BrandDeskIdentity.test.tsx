import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BrandDeskIdentity } from './BrandDeskIdentity';
describe('BrandDesk attribution', () => {
  it('attributes the product to ETIOS without changing the service company', () => {
    render(<BrandDeskIdentity dark />);
    expect(screen.getByLabelText('BrandDesk by ETIOS')).toBeInTheDocument();
    expect(screen.getByText('by ETIOS')).toBeInTheDocument();
    expect(screen.queryByText('by Maputo Publicidade')).not.toBeInTheDocument();
  });
});
