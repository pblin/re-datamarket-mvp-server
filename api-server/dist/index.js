"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
require("graphql-request");
const profile_controller_1 = require("./routes/profile/profile.controller");
const schema_controller_1 = require("./routes/schema/schema.controller");
const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.get('/health', (req, res) => {
    res.sendStatus(200);
});
//Routes
app.use('/profile', profile_controller_1.default);
app.use('/schema', schema_controller_1.default);
const PORT = 9000;
app.listen(PORT, () => {
    console.log(`Rebloc GraphQL server running on port ${PORT}.`);
});
//# sourceMappingURL=index.js.map