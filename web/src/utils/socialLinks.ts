export interface LinksSociaisLead {
  instagramHandle: string | null;
  instagramUrl: string | null;
  googleMeuNegocioUrl: string | null;
}

export function gerarLinksSociaisLead(
  instagram: string | null,
  googleMeuNegocio: string | null
): LinksSociaisLead {
  const instagramHandle = instagram?.replace(/^@/, '') || null;
  const instagramUrl = instagramHandle
    ? `https://www.instagram.com/${encodeURIComponent(instagramHandle)}/`
    : null;

  return {
    instagramHandle,
    instagramUrl,
    googleMeuNegocioUrl: getHttpUrl(googleMeuNegocio)
  };
}

function getHttpUrl(value: string | null): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}
