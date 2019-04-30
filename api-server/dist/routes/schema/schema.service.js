"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const Db_1 = require("../../db/Db");
class SchemaService {
    constructor() {
        this.client = Db_1.Db.getInstance().client;
    }
    saveDataset(ds) {
        return __awaiter(this, void 0, void 0, function* () {
            const mut = `
        mutation upsert_marketplace_data_source_detail 
        ($objects:[marketplace_data_source_detail_insert_input!]!) { 
            insert_marketplace_data_source_detail ( 
            objects:$objects,
            on_conflict: { 
            constraint: data_source_detail_pkey
            update_columns: [ 
                id,
                name,
                description,
                delivery_method,
                access_url,
                api_key,
                enc_data_key,
                num_of_records,
                search_terms,
                parameters,
                country,
                state_province,
                dataset_owner_id,
                price_low,
                price_high,
                json_schema,
                stage,
                date_created,
                date_modified
            ] 
            }
            ) {
            affected_rows
            }
        }`;
            const variables = {
                objects: [
                    {
                        id: ds.id,
                        name: ds.name,
                        description: ds.description,
                        delivery_method: ds.delivery_method,
                        access_url: ds.access_url,
                        api_key: ds.api_key,
                        enc_data_key: ds.enc_data_key,
                        num_of_records: ds.num_of_records,
                        search_terms: ds.search_terms,
                        parameters: ds.parameters,
                        country: ds.country,
                        state_province: ds.state_province,
                        dataset_owner_id: ds.dataset_owner_id,
                        price_low: ds.price_low,
                        price_high: ds.price_high,
                        stage: ds.stage,
                        date_created: ds.date_created,
                        date_modified: ds.date_modified,
                        json_schema: ds.json_schema,
                    }
                ]
            };
            let data = yield this.client.request(mut, variables);
            // @ts-ignore
            if (data !== undefined) {
                return data['insert_marketplace_data_source_detail'].affected_rows;
            }
            else
                return -1;
        });
    }
    extractAndSaveDataFields(schemaItems, dsId) {
        return __awaiter(this, void 0, void 0, function* () {
            const mut = `
            mutation insert_marketplace_source_of_field($objects:[marketplace_source_of_field_insert_input!]!)
            {
            insert_marketplace_source_of_field ( 
                objects:$objects,
                on_conflict: { 
                    constraint: source_of_field_pkey
                    update_columns: [ 
                        field_name
                        description
                        field_type
                        source_id
                    ] 
            } ) {
                affected_rows
                }
            }`;
            let variables = {
                objects: []
            };
            for (var i = 0; i < schemaItems.length; i++) {
                const item = {
                    field_name: schemaItems[i].name,
                    description: schemaItems[i].description,
                    field_type: schemaItems[i].type,
                    source_id: dsId,
                };
                variables.objects.push(item);
            }
            let data = yield this.client.request(mut, variables);
            if (data !== undefined) {
                return data['insert_marketplace_source_of_field'].affected_rows;
            }
            else {
                return -1;
            }
        });
    }
    deletePriorSavedFields(dataset_id) {
        return __awaiter(this, void 0, void 0, function* () {
            const mut = `mutation delete_data_fields ($dataset_id: String ) {
            delete_marketplace_source_of_field (
            where: {source_id: { _eq: $dataset_id} }
            ) {
            affected_rows
            }
        }`;
            let variables = {
                dataset_id
            };
            let data = yield this.client.request(mut, variables);
            if (data !== undefined) {
                return data['delete_marketplace_source_of_field'].affected_rows;
            }
            else {
                return -1;
            }
        });
    }
}
exports.SchemaService = SchemaService;
//# sourceMappingURL=schema.service.js.map