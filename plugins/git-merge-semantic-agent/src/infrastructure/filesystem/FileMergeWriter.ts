import { access, writeFile } from 'node:fs/promises';
import path from 'node:path';

/** Writes an approved merge only to an existing file inside the selected repository. */
export class FileMergeWriter {
  async write(repositoryPath: string, filePath: string, mergedCode: string): Promise<void> {
    const repositoryRoot = path.resolve(repositoryPath);
    const absolutePath = path.resolve(repositoryRoot, filePath);
    const relativePath = path.relative(repositoryRoot, absolutePath);

    if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      throw new Error(`Refusing to write outside the repository: "${filePath}".`);
    }

    await access(absolutePath);
    await writeFile(absolutePath, mergedCode, 'utf8');
  }
}
