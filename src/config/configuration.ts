export default (): any => ({
  app: {
    env: process.env.APP_ENV,
    host: process.env.APP_HOST || '0.0.0.0',
    port: process.env.APP_PORT,
    domain: process.env.APP_DOMAIN,
  },
  database: {
    type: process.env.DB_TYPE,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    pass: process.env.DB_PASS,
    prefix: process.env.DB_PREFIX,
    slaves: process.env.DB_SLAVES,
  },
  redis: {
    host: process.env.RD_HOST,
    port: process.env.RD_PORT,
    auth_pass: process.env.RD_AUTH_PASS,
    db: process.env.RD_DB || 0,
  },
  jwt: {
    secret_key: process.env.JWT_SECRET_KEY,
  },
  http: {
    timeout: process.env.HTTP_TIMEOUT,
  },
  dns: {
    key: process.env.DNS_KEY,
    secret: process.env.DNS_SECRET,
  },
  acme: {
    acme_path: process.env.ACME_PATH,
    account_path: process.env.ACME_ACCOUNT_PATH,
    challenge_path: process.env.ACME_CHALLENGE_PATH,
    certificate_path: process.env.ACME_CERTIFICATE_PATH,
    user_agent: process.env.ACME_USER_AGENT,
    process_timeout: process.env.ACME_PROCESS_TIMEOUT,
  },
  email: {
    host: process.env.EMAIL_HOST,
    account: process.env.EMAIL_ACCOUNT,
    passwd: process.env.EMAIL_PASSWD,
  },
  alipay: {
    appid: process.env.ALIPAY_APPID,
    pid: process.env.ALIPAY_PID,
    public_key: process.env.ALIPAY_PUBLIC_KEY,
    private_key: process.env.ALIPAY_PRAVITE_KEY,
    pub_key: process.env.ALIPAY_PUB_KEY,
    gateway: process.env.ALIPAY_GATEWAY,
    sign_type: process.env.ALIPAY_SIGN_TYPE,
    notify_url: process.env.ALIPAY_NOTIFY_URL,
    return_url: process.env.ALIPAY_RETURN_URL,
  },
  invitation: {
    normal_coins: process.env.INVITATION_NORMAL_COINS,
    activate_coins: process.env.INVITATION_ACTIVATE_COINS,
    recharge_reward_rate: process.env.INVITATION_RECHAREGE_REWARD_RATE,
  },
  captcha: {
    value_ttl: process.env.CAPTCHA_VALUE_TTL,
    frequency_ttl: process.env.CAPTCHA_FREQUENCY_TTL,
    resolve_valid: process.env.CAPTCHA_RESOLVE_VALID,
  },
  google: {
    account_key_path: process.env.GOOGLE_ACCOUNTL_KEY_PATH,
  },
  zerossl: {
    access_key: process.env.ZEROSSL_ACCESS_KEY,
  },
  third: {
    github_client_id: process.env.THIRD_GITHUB_CLIENT_ID,
    github_client_secret: process.env.THIRD_GITHUB_CLIENT_SECRET,
    qq_client_id: process.env.THIRD_QQ_CLIENT_ID,
    qq_client_secret: process.env.THIRD_QQ_CLIENT_SECRET,
    wx_appid: process.env.THIRD_WX_APPID,
    wx_secret: process.env.THIRD_WX_SECRET,
  },
});
