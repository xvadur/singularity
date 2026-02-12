const DEFAULT_ALFRED_BASE_URL = "http://localhost:3031";

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function getAlfredBaseUrl(): string {
  const configured = process.env.ALFRED_BASE_URL?.trim();
  return trimTrailingSlash(configured || DEFAULT_ALFRED_BASE_URL);
}

export function toAlfredUrl(pathname: string): string {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${getAlfredBaseUrl()}${normalizedPath}`;
}

