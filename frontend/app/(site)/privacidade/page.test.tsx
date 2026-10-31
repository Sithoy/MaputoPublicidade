import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import PrivacyPage from './page';
import CookiesPage from '../politica-cookies/page';

it('distinguishes essential security monitoring from optional visitor statistics', () => {
  render(<PrivacyPage />);
  expect(screen.getByRole('heading', { name: '7. Monitorização técnica de segurança e funcionamento' })).toBeInTheDocument();
  expect(screen.getByText(/não depende da aceitação da análise de visitas/)).toBeInTheDocument();
  expect(screen.getByText(/Não criamos perfis de navegação/)).toBeInTheDocument();
  expect(screen.getByText(/sem atividade, os dados aguardam/)).toBeInTheDocument();
});

it('scopes rejection to visitor statistics and explains the independent security layer', () => {
  render(<CookiesPage />);
  expect(screen.getByText(/interrompe toda a medição de visitas descrita nesta política/)).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Segurança e funcionamento do serviço' })).toBeInTheDocument();
  expect(screen.getByText(/Não é desativada pelos botões de análise/)).toBeInTheDocument();
});
