import * as dotenv from 'dotenv';

dotenv.config();
let path;
switch (process.env.NODE_ENV) {
  case 'test':
    path = '../.env.test';
    break;
  case 'production':
    path = '../.env.production';
    require('longjohn');
    break;
  default:
    path = '../.env';
}
dotenv.config({ path: path });

export const APIKEY = process.env.APIKEY;
export const GRAPHQL = process.env.GRAPHQL;
export const VAULT_SERVER = process.env.VAULT_SERVER;
export const VAULT_CLIENT_TOKEN = process.env.VAULT_TOKEN;
export const VAULT_SERVER_TOKEN = process.env.VAULT_SERVER_TOKEN;
export const SSL_PFX = process.env.SSL_PFX;

export const SSL_KEY = process.env.SSL_KEY;
export const SSL_CERT = process.env.SSL_CERT;

export const KEY_PASS = process.env.KEY_PASS;
export const HTTPS_ON = process.env.HTTPS_ON;
export const SMTP_HOST = process.env.SMTP_HOST;
export const SMTP_PORT = process.env.SMTP_PORT;
export const REDIS_PORT = process.env.REDIS_PORT;
export const REDIS_HOST = process.env.REDIS_HOST;
export const DATA_HOST_URL = process.env.DATA_HOST_URL
export const AZURE_TEXT_ANALYTICS = process.env.AZURE_TEXT_ANALYTICS
export const AZURE_TEXT_ANAL_KEY =  process.env.AZURE_TEXT_ANALY_KEY

