export function classifyFailure(message: string, navigationStatus: number | null) {
  const text = message.toLowerCase();
  if ([429, 502, 503, 504].includes(navigationStatus ?? 0) || /queue full|environment_unavailable|heavy load|http 503/.test(text))
    return { category: 'ENVIRONMENT', confidence: 'high', evidence: `HTTP ${navigationStatus ?? 'unknown'} / overload signal` };
  if (/locator_unresolved|strict mode violation|element\(s\) not found/.test(text))
    return { category: 'LOCATOR', confidence: 'medium', evidence: message.slice(0, 350) };
  if (/api|responsecode|http \d{3}/.test(text))
    return { category: 'API', confidence: 'medium', evidence: message.slice(0, 350) };
  if (/expect|assert|timed out/.test(text))
    return { category: 'ASSERTION_OR_APP', confidence: 'low', evidence: message.slice(0, 350) };
  return { category: 'UNCLASSIFIED', confidence: 'low', evidence: message.slice(0, 350) };
}
