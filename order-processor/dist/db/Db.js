"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Env_1 = require("../config/Env");
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
        this.client = new graphql_request_1.GraphQLClient(Env_1.GRAPHQL, {
            headers: {
                'X-Hasura-Access-Key': Env_1.APIKEY,
            },
        });
    }
}
exports.Db = Db;
//# sourceMappingURL=Db.js.map