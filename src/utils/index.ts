// bcrypt
import * as bcrypt from 'bcryptjs';
// crypto
import * as crypto from 'crypto';
import { BadRequestException, Logger } from '@nestjs/common';
// dayjs
import * as dayjs from 'dayjs';
// node-forge
import * as forge from 'node-forge';
import * as https from 'https';
// archiver
import * as archiver from 'archiver';
import * as fs from 'fs';
import * as path from 'path';
import { DATE_FORMAT } from '@app/common';

/**
 * base64ToUrlSafe
 * @param v
 */
export function base64ToUrlSafe(v: string) {
  return v.replace(/\//g, '_').replace(/\+/g, '-');
}

/**
 * urlSafeBase64Encode
 * @param jsonFlags
 */
export function urlSafeBase64Encode(jsonFlags: string) {
  const encoded = Buffer.from(jsonFlags).toString('base64');
  return this.base64ToUrlSafe(encoded);
}

/**
 * hmacSha1
 * @param encodedFlags
 * @param secretKey
 */
export function hmacSha1(encodedFlags: string, secretKey: string) {
  const hmac = crypto.createHmac('sha1', secretKey);
  hmac.update(encodedFlags);
  return hmac.digest('base64');
}

/**
 * randomNum
 * @param {number} min
 * @param {number} max
 */
export function randomNum(min: number, max: number): number {
  return min + Math.round(Math.random() * (max - min));
}

/**
 * randomString
 * @param {number} len
 * @param {string} str
 */
export function randomString(
  len = 16,
  str: string = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
): string {
  //定义返回值
  let result = '';
  //遍历
  for (let i = 0; i < len; i++) {
    // 取随机下标
    const index = Math.floor(Math.random() * str.length);
    //拼接在result后面
    result += str[index];
  }
  //返回
  return result;
}

/**
 * bcryptHash
 * @param {string} password
 */
export function bcryptHash(password: string): string {
  return bcrypt.hashSync(password, 10);
}

/**
 * bcryptHash
 * @param {string} password
 * @param {string} hash
 */
export function bcryptCompare(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

/**
 * cryptoMd5
 * @param str
 * @param upperCase
 */
export function cryptoMd5(str: string, upperCase = false): string {
  const hash = crypto.createHash('md5').update(str, 'utf8');
  const hashDigest = hash.digest('hex');
  return upperCase ? hashDigest.toUpperCase() : hashDigest;
}

/**
 * cryptoEncrypt
 * @param str
 * @param key
 * @param iv
 */
export function cryptoEncrypt(str: string, key?: string, iv?: string): string {
  try {
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(key || process.env.CRYPTO_KEY),
      Buffer.from(iv || process.env.CRYPTO_IV),
    );
    let encrypted = cipher.update(str, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return encrypted;
  } catch (err) {
    Logger.error('cryptoEncrypt', err);
    throw new BadRequestException();
  }
}

/**
 * cryptoDecrypt
 * @param str
 * @param key
 * @param iv
 */
export function cryptoDecrypt(str: string, key?: string, iv?: string): string {
  try {
    const cipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(key || process.env.CRYPTO_KEY),
      Buffer.from(iv || process.env.CRYPTO_IV),
    );
    let decrypted = cipher.update(str, 'base64', 'utf8');
    decrypted += cipher.final('utf8');
    return decrypted.toString();
  } catch (err) {
    Logger.error('cryptoDecrypt', err);
    throw new BadRequestException();
  }
}

/**
 * extractDomainPrefix
 * @param domain
 * @param onlyDomain
 * @return string
 */
export function extractDomainPrefix(
  domain: string,
  onlyDomain: boolean = false,
): string {
  if (!domain) return '';
  // 分割
  const domainSpiltDot = domain.split('.');
  if (onlyDomain) return domainSpiltDot.slice(-2).join('.');
  // 过滤
  const prefix = domainSpiltDot.filter(
    (_, idx) => idx < domainSpiltDot.length - 2,
  );
  // 拼接 - 忽略泛解析 *
  return prefix.filter((pre) => pre != '*').join('.');
}

/**
 * extractDomainWithPrefix
 * @param domain
 * @param ignoreWildcard
 */
export function extractDomainWithPrefix(
  domain: string,
  ignoreWildcard: boolean = false,
) {
  if (!domain) return { domain: '', prefix: '' };
  // 分割
  const domainSpiltDot = domain.split('.');
  const domainRoot = domainSpiltDot.slice(-2).join('.');
  // 过滤
  const prefix = domainSpiltDot
    .filter((_, idx) => idx < domainSpiltDot.length - 2)
    .filter((pre) => {
      if (ignoreWildcard) {
        return pre != '*';
      }
      return pre;
    });
  return { domain: domainRoot, prefix: prefix.join('.') };
}

/**
 * asleep
 * @param ms
 */
export async function asleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * calculateMaxRetries
 * @param retryDelay
 * @param totalTime ms
 */
export function calculateMaxRetries(
  retryDelay: number,
  totalTime: number,
): number {
  let currentTime = 0;
  let maxRetries = 0;

  while (currentTime < totalTime) {
    maxRetries++;
    currentTime += maxRetries * retryDelay;
    if (currentTime >= totalTime) {
      break;
    }
  }

  return maxRetries;
}
//
// const totalTime = 10 * 60 * 1e3; // 10 minutes in milliseconds
// const defaultRetryDelay = 5e3; // 5 seconds
//
// const maxRetries = calculateMaxRetries(defaultRetryDelay, totalTime);

/**
 * retryFuncWithDelay
 * @param retryFunc
 * @param maxRetries
 * @param defaultRetryDelay
 * @param consecutiveSuccessesRequired
 */
export async function retryFuncWithDelay<T>(
  retryFunc: () => Promise<T> | Awaited<T>,
  maxRetries: number = 10,
  defaultRetryDelay: number = 5e3,
  consecutiveSuccessesRequired: number = 1,
): Promise<T> {
  let attempt = 1;
  let consecutiveSuccesses = 0;

  while (attempt < maxRetries) {
    try {
      const retryResult = await retryFunc();
      Logger.debug(`retryFunc completes processing on attempt ${attempt}.`);

      consecutiveSuccesses++;
      if (consecutiveSuccesses >= consecutiveSuccessesRequired) {
        return retryResult;
      }

      Logger.debug(
        `Attempt ${attempt} succeeded, but only ${consecutiveSuccesses} consecutive successes so far. Continuing...`,
      );
    } catch (error) {
      attempt++;
      if (attempt >= maxRetries) {
        Logger.error(`Failed after ${maxRetries} attempts: ${error}`);
        return error;
      }
      const delayTime = attempt * defaultRetryDelay; // attempt * 5s
      Logger.debug(
        `Attempt ${attempt} failed. Retrying in ${delayTime / 1e3} seconds...`,
      );
      await asleep(delayTime);
    }
  }
}

/**
 * loadDomainCertificate
 * @param hostname
 * @param options
 * @param detailed
 */
export function loadDomainCertificate(
  hostname: string,
  options?: https.RequestOptions,
  detailed?: boolean,
): Promise<PeerCertificate> {
  return new Promise((resolve, reject) => {
    const defaultOptions = {
      hostname,
      port: 443,
      method: 'GET',
      agent: false,
      rejectUnauthorized: false,
      ...options,
    };

    const req = https.request(defaultOptions, (res) => {
      const socket = res.socket as unknown as {
        getPeerCertificate: (detailed: boolean) => PeerCertificate;
      };
      // 证书信息
      const certificate = socket.getPeerCertificate(detailed);
      if (certificate) {
        resolve(certificate);
      } else {
        reject(new Error('No certificate found'));
      }
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}

/**
 * 读取证书信息
 * @param {string} certificate
 */
export function readCertificateInfo(certificate: string) {
  // 解析 PEM 证书
  const cert = forge.pki.certificateFromPem(certificate);

  // 获取证书的 DER 编码
  const der = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
  // 计算指纹
  const fingerprint = forge.md.sha1
    .create()
    .update(der)
    .digest()
    .toHex()
    .match(/.{2}/g)
    .join(':');
  const fingerprint256 = forge.md.sha256
    .create()
    .update(der)
    .digest()
    .toHex()
    .match(/.{2}/g)
    .join(':');
  const fingerprint512 = forge.md.sha512
    .create()
    .update(der)
    .digest()
    .toHex()
    .match(/.{2}/g)
    .join(':');

  // 提取公钥信息
  const publicKey: any = cert.publicKey;
  let modulus, pubKeyExponent;

  if (publicKey?.n) {
    modulus = publicKey?.n.toString(16); // Modulus in hex
  }

  if (publicKey.e) {
    pubKeyExponent = `0x${publicKey.e.toString(16)}`; // Exponent in hex
  }

  // 将公钥转换为 PEM 格式并获取其 Buffer
  // const publicKeyPem = forge.pki.publicKeyToPem(publicKey);
  // pubkeyBuffer = Buffer.from(publicKeyPem, 'utf8'); // Convert PEM to Buffer
  // pubkeyBuffer = forge.pki.publicKeyToPem(cert.publicKey)

  // 提取证书的字段信息
  const extractFields = (field: any) => {
    return Object.fromEntries(
      Object.entries({
        C: field.getField('C') ? field.getField('C').value : undefined,
        ST: field.getField('ST') ? field.getField('ST').value : undefined,
        L: field.getField('L') ? field.getField('L').value : undefined,
        O: field.getField('O') ? field.getField('O').value : undefined,
        OU: field.getField('OU') ? field.getField('OU').value : undefined,
        CN: field.getField('CN') ? field.getField('CN').value : undefined,
      }).filter(
        ([key, value]) => value !== null && value !== undefined && value !== '',
      ),
    );
  };

  const extractSubjectAltName = (cert: any) => {
    const sanExt = cert.getExtension('subjectAltName');
    if (!sanExt) return undefined;

    const names = sanExt.altNames.map((entry) => {
      if (entry.type === 2) {
        // type 2 means DNS name
        return `DNS:${entry.value}`;
      }
      return `${entry.value}`;
    });

    return names.join(', ');
  };

  const notBefore = dayjs(cert.validity.notBefore);
  const notAfter = dayjs(cert.validity.notAfter);

  return {
    subject: extractFields(cert.subject),
    issuer: extractFields(cert.issuer),
    valid_from: notBefore.format(DATE_FORMAT),
    valid_to: notAfter.format(DATE_FORMAT),
    serialNumber: cert.serialNumber.toUpperCase(),
    modulus: modulus.toUpperCase(),
    exponent: pubKeyExponent,
    fingerprint: fingerprint.toUpperCase(),
    fingerprint256: fingerprint256.toUpperCase(),
    fingerprint512: fingerprint512.toUpperCase(),
    subjectaltname: extractSubjectAltName(cert),
  };
}

/**
 * 证书输出
 * @param certificate
 */
export function convertCertificateToPem(certificate: string | Buffer): string {
  if (Buffer.isBuffer(certificate)) {
    certificate = certificate.toString('base64');
  }
  return `-----BEGIN CERTIFICATE-----\n${certificate.match(/.{1,64}/g)?.join('\n')}\n-----END CERTIFICATE-----\n`;
}

/**
 *构建SnID
 * @param uid
 * @param prefix
 */
export function genSnId(uid: number | string, prefix?: string): string {
  return (
    (prefix ? prefix + '_' : '') +
    dayjs().format('YYYYMMDDHHmmss') +
    uid.toString().padStart(5, '0') +
    Math.floor(100 + Math.random() * 900).toString() +
    randomNum(1000, 9999)
  );
}

/**
 * 压缩内容到指定目录文件
 * @param data 压缩文件内容 { content: '', name: '' }
 * @param oPath 输出目录
 * @param oName 输出名称
 */
export async function archiverContent(
  data: any,
  oPath: string,
  oName = 'unknown.zip',
) {
  // 没有内容数据
  if (data.length <= 0) return;
  // 创建压缩流
  const archive = archiver('zip', {
    zlib: { level: 9 }, // 设置压缩级别
  });

  // 监听压缩错误事件
  archive.on('error', (err: any) => {
    console.error('Archiver error:', err);
    throw new BadRequestException('压缩文件失败:' + err.message);
  });

  // 输出目录
  const outputPath = path.join(path.dirname(__dirname), oPath);
  console.error('outputPath:', outputPath);

  // 创建输出流，将压缩文件存储到指定目录
  const outputFilePath = path.resolve(outputPath, oName);
  console.error('outputFilePath:', outputFilePath);
  // 创建存在性检查
  if (!fs.existsSync(outputPath)) {
    fs.writeFileSync(outputFilePath, '', { encoding: 'utf8' });
  }
  const outputStream = fs.createWriteStream(outputFilePath);

  // 将压缩流连接到输出流
  archive.pipe(outputStream);

  // 写入文件
  await Promise.all(
    data.map(async (ctx: any) => {
      const { content, name } = ctx;
      archive.append(content, { name });
    }),
  );

  // 完成压缩
  return await archive.finalize();
}

/**
 * 检查数据组重复
 * @param array
 */
export function checkForDuplicates(array: any[]) {
  const seenElements = new Set(); // 使用 Set 来跟踪已看到的元素
  const duplicates = [];

  for (const element of array) {
    if (seenElements.has(element)) {
      duplicates.push(element); // 如果元素已经存在于 Set 中，说明是重复元素
    } else {
      seenElements.add(element); // 否则将元素添加到 Set 中
    }
  }

  if (duplicates.length > 0) {
    return {
      error: `Duplicate elements found: ${duplicates.join(', ')}`,
      duplicates,
    };
  }
  return { error: null, duplicates };
}
