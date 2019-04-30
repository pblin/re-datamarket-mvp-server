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
        require('longjohn');
        break;
    default:
        path = '../.env';
}
dotenv.config({ path: path });
exports.APIKEY = process.env.REACT_APP_APIKEY;
exports.GRAPHQL = process.env.REACT_APP_GRAPHQL;
//# sourceMappingURL=ConfigEnv.js.map