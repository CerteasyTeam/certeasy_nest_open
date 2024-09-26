import { SetMetadata } from '@nestjs/common';

export enum ROLE {
  ADMIN = 1, // 管理
  USER, // 用户
  VISITOR, // 访客
}

// 忽略数据转换
export const IS_IGNORE_TRANSFORM = 'isIgnoreTransform';
export const IgnoreTransform = () => SetMetadata(IS_IGNORE_TRANSFORM, true);

// 忽略日志
export const IS_IGNORE_LOGGING = 'isIgnoreLogging';
export const IgnoreLogging = () => SetMetadata(IS_IGNORE_LOGGING, true);

// 忽略权限验证
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// 日期格式
export const DATE_FORMAT = 'YYYY-MM-DD HH:mm:ss';

// 缓存前缀
export const CAPTCHA_CACHE_PREFIX = 'captcha:';
export const USER_CACHE_PREFIX = 'user:';
export const GLOBAL_CACHE_PREFIX = 'global:';
export const CERTIFICATE_CACHE_PREFIX = 'certificate:';
export const NOTIFICATION_CACHE_PREFIX = 'notification:';

// 证书类型
export const CERTIFICATE_TYPE = {
  SINGLE: 1,
  MULTI: 2,
  WILDCARD: 3,
};

export const CERTIFICATE_AUTH_MODE = {
  HTTP_AUTH_MODE: 1,
  HTTP_ALIAS_AUTH_MODE: 2,
  DNS_AUTH_MODE: 3,
  DNS_ALIAS_AUTH_MODE: 4,
};

// BT_PROJECT_TYPE
export const BT_PROJECT_TYPE = {
  php: 0,
  java: 1,
  nodejs: 3,
  go: 4,
  python: 5,
  other: 6,
};
