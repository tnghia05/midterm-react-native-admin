import { createHash, createHmac, randomUUID } from 'node:crypto';

const DEFAULT_R2_BUCKET_URL = 'https://2a9139b01c2879a36145249ccf9a63b6.r2.cloudflarestorage.com/nghianeegki';

function sha256Hex(data: Buffer | string): string {
  return createHash('sha256').update(data).digest('hex');
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac('sha256', key).update(data).digest();
}

function getSigningKey(secretAccessKey: string, dateStamp: string, region: string, service: string): Buffer {
  const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, 'aws4_request');
}

export function isR2Configured(): boolean {
  return Boolean(process.env.R2_ACCESS_KEY_ID?.trim() && process.env.R2_SECRET_ACCESS_KEY?.trim());
}

export async function uploadDataImageToR2(image: string): Promise<string> {
  const match = image.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
  if (!match) return image;
  if (!isR2Configured()) return image;

  const mimeType = match[1].toLowerCase();
  const base64Data = match[2];
  const buffer = Buffer.from(base64Data, 'base64');
  const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : mimeType.includes('gif') ? 'gif' : 'jpg';
  const key = `products/${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;

  const bucketUrl = new URL(process.env.R2_BUCKET_URL ?? DEFAULT_R2_BUCKET_URL);
  const host = bucketUrl.host;
  const bucketPath = bucketUrl.pathname.replace(/\/$/, '');
  const canonicalUri = `${bucketPath}/${key}`;
  const objectUrl = `${bucketUrl.origin}${canonicalUri}`;

  const accessKeyId = process.env.R2_ACCESS_KEY_ID!.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY!.trim();
  const region = 'auto';
  const service = 's3';

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(buffer);
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

  const canonicalHeaders = `content-type:${mimeType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = ['PUT', canonicalUri, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, sha256Hex(canonicalRequest)].join('\n');
  const signingKey = getSigningKey(secretAccessKey, dateStamp, region, service);
  const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(objectUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': mimeType,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
      Authorization: authorization,
    },
    body: buffer,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Không tải được ảnh lên Cloudflare R2 (${response.status}): ${detail.slice(0, 120)}`);
  }

  const publicBase = process.env.R2_PUBLIC_URL?.trim().replace(/\/$/, '');
  if (publicBase) {
    return `${publicBase}/${key}`;
  }

  // Fallback: presigned GET URL valid for 7 days (604800 seconds) if public r2.dev domain is not set
  const queryParams = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${accessKeyId}/${credentialScope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': '604800',
    'X-Amz-SignedHeaders': 'host',
  });
  queryParams.sort();
  const presignCanonical = ['GET', canonicalUri, queryParams.toString(), `host:${host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n');
  const presignStringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, sha256Hex(presignCanonical)].join('\n');
  const presignSig = createHmac('sha256', signingKey).update(presignStringToSign).digest('hex');
  queryParams.set('X-Amz-Signature', presignSig);
  return `${objectUrl}?${queryParams.toString()}`;
}
