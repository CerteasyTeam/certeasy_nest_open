// 申明 数组
declare type EmptyArrayType<T = any> = T[];

// 申明 对象
declare type EmptyObjectType<T = any> = {
  [key: string]: T;
};

// 声明 ref
declare type RefType<T = any> = T | null;

// 校验错误声明
declare type ValidationErrorType = {
  field?: string;
  error?: string;
};

declare type IUserPayload = {
  id: number;
  email?: string;
  username?: string;
  userCode?: string;
};

declare type CertificateSubject = {
  C: string;
  ST: string;
  L: string;
  O: string;
  OU: string;
  CN: string;
};

declare type CertificateIssuer = {
  C: string;
  ST: string;
  L: string;
  O: string;
  OU: string;
  CN: string;
};

declare type PeerCertificate = {
  subject: CertificateSubject;
  issuer: CertificateIssuer;
  valid_from: string;
  valid_to: string;
  fingerprint: string;
  serialNumber: string;
  issuerCertificate?: PeerCertificate;
  raw: any;
} & EmptyObjectType;
