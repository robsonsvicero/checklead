export interface LinksSociaisLead {
  instagramHandle: string | null;
  instagramUrl: string | null;
  googleMeuNegocioUrl: string | null;
  siteUrl: string | null;
}

export function gerarLinksSociaisLead(
  instagram: string | null,
  googleMeuNegocio: string | null,
  site?: string | null
): LinksSociaisLead {
  const instagramHandle = instagram?.replace(/^@/, '') || null;
  const instagramUrl = instagramHandle
    ? `https://www.instagram.com/${encodeURIComponent(instagramHandle)}/`
    : null;

  let siteHttp: string | null = null;
  if (site && site.trim()) {
    const s = site.trim();
    siteHttp = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  }

  return {
    instagramHandle,
    instagramUrl,
    googleMeuNegocioUrl: getHttpUrl(googleMeuNegocio),
    siteUrl: getHttpUrl(siteHttp)
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
