export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  // Cloudflare R2 storage
  r2AccountId: process.env.R2_ACCOUNT_ID ?? process.env.CF_R2_ACCOUNT_ID ?? "",
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID ?? process.env.CF_R2_ACCESS_KEY_ID ?? "",
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? process.env.CF_R2_SECRET_ACCESS_KEY ?? "",
  r2BucketName: process.env.R2_BUCKET_NAME ?? process.env.CF_R2_BUCKET_NAME ?? "",
  r2Endpoint: process.env.R2_ENDPOINT ?? "",
  r2PublicUrl: process.env.R2_PUBLIC_URL ?? process.env.CF_R2_PUBLIC_URL ?? "",
};
