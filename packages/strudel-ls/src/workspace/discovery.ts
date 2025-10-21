import fg from 'fast-glob';

export async function discoverStrudelFiles(root: string): Promise<string[]> {
  const patterns = ['**/*.str', '**/*.strdl'];
  const ignore = ['**/node_modules/**', '**/.git/**'];
  const entries = await fg(patterns, { cwd: root, ignore, onlyFiles: true, dot: false, absolute: true });
  return entries.sort();
}