import * as dotenv from 'dotenv';

dotenv.config();
let path;
switch (process.env.NODE_ENV) {
  case 'test':
    path = '../.env.test';
    break;
  case 'production':
    path = '../.env.production';
    const longjohn = require('longjohn');
    break;
  default:
    path = '../.env';
}
dotenv.config({ path: path });

export const APIKEY = process.env.APIKEY;
export const GRAPHQL = process.env.GRAPHQL;
export const VAULT_SERVER = process.env.VAULT_SERVER;
export const VAULT_CLIENT_TOKEN = process.env.VAULT_TOKEN;
export const REDIS_PORT = process.env.REDIS_PORT;
export const REDIS_HOST = process.env.REDIS_HOST;


