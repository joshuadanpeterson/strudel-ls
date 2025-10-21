import { URI } from 'vscode-uri';

export function isSupportedLanguageId(id?: string | null): boolean {
  if (!id) return false;
  return new Set(['strudel', 'strdl', 'str', 'std']).has(id.toLowerCase());
}

export function isSupportedUri(uri: string): boolean {
  try {
    const fsPath = URI.parse(uri).fsPath.toLowerCase();
    for (const ext of ['.strudel', '.strdl', '.str', '.std']) {
      if (fsPath.endsWith(ext)) return true;
    }
    return false;
  } catch {
    return false;
  }
}