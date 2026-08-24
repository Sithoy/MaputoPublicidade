const FIELD_LABELS: Record<string, string> = {
  email: 'E-mail',
  password: 'Palavra-passe',
  password_confirm: 'Confirmação da palavra-passe',
  new_password: 'Nova palavra-passe',
  confirm_password: 'Confirmação da palavra-passe',
  non_field_errors: '',
  detail: '',
};

function firstApiMessage(value: unknown, field?: string): string | null {
  if (typeof value === 'string') {
    const label = field ? FIELD_LABELS[field] : '';
    return label ? `${label}: ${value}` : value;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const message = firstApiMessage(item, field);
      if (message) return message;
    }
    return null;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    const preferred = ['detail', 'non_field_errors'];
    entries.sort(([a], [b]) => preferred.indexOf(b) - preferred.indexOf(a));

    for (const [key, item] of entries) {
      const message = firstApiMessage(item, key);
      if (message) return message;
    }
  }

  return null;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;

  const jsonStart = error.message.indexOf('{');
  if (jsonStart >= 0) {
    try {
      const payload = JSON.parse(error.message.slice(jsonStart));
      return firstApiMessage(payload) || fallback;
    } catch {
      // Keep the friendly fallback when the response is not valid JSON.
    }
  }

  if (error.name === 'AbortError') return 'O pedido demorou demasiado. Tente novamente.';
  return fallback;
}
