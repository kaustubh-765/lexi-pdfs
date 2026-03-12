import { StorageProvider } from './StorageProvider';

/**
 * S3 Storage Provider — Production Implementation Roadmap
 *
 * To implement S3 support:
 * 1. Install: npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
 * 2. Add env vars: AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET_NAME
 * 3. Replace save() stub:
 *    - const s3 = new S3Client({ region: process.env.AWS_REGION })
 *    - const key = `uploads/${uuidv4()}/${file.name}`
 *    - await s3.send(new PutObjectCommand({ Bucket, Key: key, Body: buffer, ContentType: 'application/pdf' }))
 *    - return key
 * 4. Replace getPath() stub:
 *    - For server-side reading: use GetObjectCommand and stream to temp file or buffer directly
 *      (avoid writing to disk; stream directly to pdf-parse)
 *    - For signed URLs: use getSignedUrl(s3, new GetObjectCommand(...), { expiresIn: 3600 })
 * 5. IAM Policy needed:
 *    - s3:PutObject, s3:GetObject, s3:DeleteObject on arn:aws:s3:::your-bucket/uploads/*
 * 6. Consider multipart upload for files > 5MB using createMultipartUpload
 */
export class S3Provider implements StorageProvider {
  async save(_file: File): Promise<string> {
    throw new Error(
      'S3Provider not implemented. See JSDoc for implementation roadmap. ' +
      'Set STORAGE_PROVIDER=local to use local file storage.'
    );
  }

  async getPath(_storedPath: string): Promise<string> {
    throw new Error(
      'S3Provider not implemented. See JSDoc for implementation roadmap.'
    );
  }
}
