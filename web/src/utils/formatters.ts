import type { LeadStatus } from '@radar/shared';

const rotulosStatus: Record<LeadStatus, string> = {
  novo: 'Novo',
  orcamento_enviado: 'Orçado',
  fechado: 'Fechado',
  perdido: 'Perdido',
  standby: 'Standby'
};

export function formatarStatusLead(status: LeadStatus): string {
  return rotulosStatus[status];
}

export function formatarMoeda(centavos: number | null | undefined): string {
  const valor = (centavos || 0) / 100;
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

export function parseMoedaParaCentavos(input: string | number): number {
  if (typeof input === 'number') {
    return Math.round(input * 100);
  }
  if (!input) return 0;

  // Remove caracteres que não sejam dígitos, vírgula ou ponto
  const limpo = input.replace(/[^\d.,]/g, '').trim();
  if (!limpo) return 0;

  // Substitui vírgula por ponto se houver
  const normalizado = limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo;
  const num = parseFloat(normalizado);
  return isNaN(num) ? 0 : Math.round(num * 100);
}

export function formatarData(isoStr: string | null | undefined): string {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return '—';
  }
}

export function formatarDataHora(isoStr: string | null | undefined): string {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '—';
  }
}

export function gerarLinkContato(contato: string): { tipo: 'whatsapp' | 'email' | 'telefone' | 'outro'; href: string; label: string } {
  const limpo = contato.trim();
  if (limpo.includes('@')) {
    return {
      tipo: 'email',
      href: `mailto:${limpo}`,
      label: limpo
    };
  }

  // Apenas números
  const digitos = limpo.replace(/\D/g, '');
  if (digitos.length >= 8) {
    const ddi = digitos.length <= 11 ? `55${digitos}` : digitos;
    return {
      tipo: 'whatsapp',
      href: `https://wa.me/${ddi}`,
      label: limpo
    };
  }

  return {
    tipo: 'outro',
    href: `tel:${limpo}`,
    label: limpo
  };
}
