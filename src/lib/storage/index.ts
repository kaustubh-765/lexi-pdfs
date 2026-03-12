import { StorageProvider } from './StorageProvider';
import { LocalFileService } from './LocalFileService';
import { S3Provider } from './S3Provider';

export function getStorageProvider(): StorageProvider {
  const provider = process.env.STORAGE_PROVIDER ?? 'local';

  switch (provider) {
    case 'local':
      return new LocalFileService();
    case 's3':
      return new S3Provider();
    default:
      console.warn(`Unknown STORAGE_PROVIDER "${provider}", falling back to local`);
      return new LocalFileService();
  }
}

export type { StorageProvider };
