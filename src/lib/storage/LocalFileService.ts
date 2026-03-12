import { StorageProvider } from './StorageProvider';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

export class LocalFileService implements StorageProvider {
  private readonly uploadDir: string;

  constructor(uploadDir = 'storage/uploads') {
    this.uploadDir = uploadDir;
  }

  async save(file: File): Promise<string> {
    await mkdir(this.uploadDir, { recursive: true });

    const ext = file.name.split('.').pop() || 'pdf';
    const filename = `${uuidv4()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const relativePath = join(this.uploadDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(relativePath, buffer);

    return relativePath;
  }

  async getPath(storedPath: string): Promise<string> {
    return join(process.cwd(), storedPath);
  }
}
