"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ConfigEnv_1 = require("../config/ConfigEnv");
const graphql_request_1 = require("graphql-request");
class Db {
    constructor() {
        this.initialize();
    }
    static getInstance() {
        if (!Db.instance) {
            Db.instance = new Db();
        }
        return Db.instance;
    }
    initialize() {
        this.client = new graphql_request_1.GraphQLClient(ConfigEnv_1.GRAPHQL, {
            headers: {
                'X-Hasura-Access-Key': ConfigEnv_1.APIKEY,
            },
        });
    }
}
exports.Db = Db;
//# sourceMappingURL=Db.js.map