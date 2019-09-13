"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = require("dotenv");
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
exports.APIKEY = process.env.APIKEY;
exports.GRAPHQL = process.env.GRAPHQL;
exports.VAULT_SERVER = process.env.VAULT_SERVER;
exports.VAULT_CLIENT_TOKEN = process.env.VAULT_TOKEN;
exports.REDIS_PORT = process.env.REDIS_PORT;
exports.REDIS_HOST = process.env.REDIS_HOST;
exports.CHAIN_IP = process.env.CHAIN_IP;
exports.OPERATOR_ADDR = process.env.OPERATOR_ADDR;
exports.CONTRACT_ADDR = process.env.CONTRACT_ADDR;
//# sourceMappingURL=Env.js.map