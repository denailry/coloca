var express = require("express");
var host = require('../scripts/host');
var utils = require('../scripts/utils');
var sql = require('../scripts/sql-builder/sql-builder');
var hash = require("password-hash");
var app = express.Router();
var logging = utils.logging;

app.use('/guide', require('./guide'));
app.use('/tourist', require('./tourist'));

module.exports = app;