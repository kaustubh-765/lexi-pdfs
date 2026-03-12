export interface StorageProvider {
  /**
   * Saves a file and returns its stored path/key.
   * @param file - The File object to save
   * @returns The stored path or key (used to retrieve later)
   */
  save(file: File): Promise<string>;

  /**
   * Resolves a stored path/key to an absolute filesystem path or URL.
   * @param storedPath - The path/key returned by save()
   * @returns Absolute path (local) or URL (S3)
   */
  getPath(storedPath: string): Promise<string>;
}
