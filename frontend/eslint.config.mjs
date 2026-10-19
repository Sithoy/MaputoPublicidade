import nextVitals from 'eslint-config-next/core-web-vitals';

const config = [
  ...nextVitals,
  {
    ignores: ['.next/**', 'out/**', 'next-env.d.ts'],
  },
  {
    rules: {
      '@next/next/no-img-element': 'off',
      // Existing hook lint coverage is retained; compiler migration is a separate task.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/purity': 'off',
    },
  },
];

export default config;
