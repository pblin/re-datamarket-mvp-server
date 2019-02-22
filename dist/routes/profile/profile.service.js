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
class ProfileService {
    constructor() {
        this.client = Db_1.Db.getInstance().client;
    }
    getProfile(email) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `query customer ($email: String ) {
          marketplace_customer (where:{primary_email:{ _eq : $email }})
          {
              id
              primary_email
              secondary_email
              first_name
              last_name
              phone
              address
              is_org_admin
          }
        }`;
            const variables = {
                email
            };
            let result = yield this.client.request(query, variables);
            return result;
        });
    }
    createProfile(profile) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
            mutation insert_marketplace_customer ($objects:[marketplace_customer_insert_input!]!)
             {
              insert_marketplace_customer ( 
                objects:$objects,
                on_conflict: { 
                  constraint: customer_pkey, 
                  update_columns: [first_name,last_name,secondary_email,address,phone,is_org_admin] 
                }
              ) {
                returning {
                  id
                  primary_email
                  secondary_email
                  first_name
                  last_name
                  address
                  phone
                  is_org_admin
                }
              }
            }`;
            const variables = {
                objects: [
                    {
                        "primary_email": profile.primaryEmail,
                        "secondary_email": profile.secondaryEmail,
                        "first_name": profile.firstName,
                        "last_name": profile.lastName,
                        "address": profile.address,
                        "phone": profile.phone,
                        "is_org_admin": false
                    }
                ]
            };
            let result = yield this.client.request(query, variables);
            return result;
        });
    }
}
exports.ProfileService = ProfileService;
//# sourceMappingURL=profile.service.js.map