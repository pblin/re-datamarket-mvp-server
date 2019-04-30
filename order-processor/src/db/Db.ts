import { APIKEY, GRAPHQL } from '../config/Env';
import {GraphQLClient} from 'graphql-request';

export class Db {
    private static instance: Db;
    client: GraphQLClient;

    constructor(){
        this.initialize();
    }

    static getInstance() {
        if(!Db.instance) {
            Db.instance = new Db();
        }
        return Db.instance;
    }

    initialize() {
        this.client = new GraphQLClient (GRAPHQL, {
            headers: {
                'X-Hasura-Access-Key': APIKEY,
            },
        });
    }
}

