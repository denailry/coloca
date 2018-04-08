const GUIDE_IMAGE_DIR = "img/guide";

var express = require("express");
var host = require('../scripts/host');
var utils = require('../scripts/utils');
var sql = require('../scripts/sql-builder/sql-builder');
var exception = require('../scripts/exception');
var hash = require("password-hash");
var app = express.Router();
var logging = utils.logging;

app.get("/", (req, res) => {
	var name = req.query.name;
	var city = req.query.city;
	var limit = req.query.limit;
	var offset = req.query.offset;
	var cityCount = 0;

	var selectByCities = sql.make_sql(sql.SELECT, 'guide_cities')
		.addFields('id_guide, city');
	if (city != null) {
		if (typeof(city) == "string") {
			selectByCities.setCondition(sql.make_cond('city', sql.EqualTo, city));
			cityCount = 1;
		} else {
			city.forEach((c, index) => {
				selectByCities.addCondition(sql.OR, sql.make_cond('city', sql.EqualTo, c));
			});
			cityCount = city.length;
		}
	}
	var countId = sql.make_sql(sql.SELECT, sql.wrap(sql.alias(selectByCities.build(), 'T')))
		.addFields('id_guide, COUNT(*) as count')
		.setGroup('id_guide');
	var selectedGuide = sql.make_sql(sql.SELECT, sql.alias(countId.build(), 'R'))
		.addFields('id_guide');
	
	if (cityCount != 0) {
		selectedGuide.setCondition(sql.make_cond('R.count', sql.EqualTo, cityCount));
	}
	if (name == null) {
		name = "";
	}

	var query = sql.make_sql(sql.SELECT, 'account_guide natural join ' + sql.wrap(sql.alias(selectedGuide.build(), 'V')))
		.addFields('id_guide, name, rating, img_type')
		.setCondition('name', sql.LIKE, utils.wrap('%', name))
		.setLimit(limit, offset)
		.setOrder('rating', sql.DESC);

	host.con.query(query.build(), (err, result) => {
		if(!err) {
			result.forEach((item, index) => {
				if (item.img_type.length != 0) {
					item.img_url = utils.build_scheme(
						'http://dirdomain/dir/file_name.extension', 
						['http', host.DIR, GUIDE_IMAGE_DIR, item.id_guide, item.name.replace(/ /g, '_'), item.img_type]
					);
				} else {
					item.img_url = null;
				}
				delete item.img_type;
			});
			res.send(utils.send(result));
		} else {
			res.send(utils.throw('failed to retrieve place data', exception.sql('place', err.code, query.build())));
		}
	});
});	

app.get("/id/:id_guide", (req, res) => {
	var idGuide = req.params.id_guide;

	var query = sql.make_sql(sql.SELECT, 'account_guide')
		.addFields('id_guide, name, email, phone, rating, img_type')
		.setCondition('id_guide', sql.EqualTo, idGuide);

	host.con.query(query.build(), (err, result) => {
		if(!err) {
			result.forEach((item, index) => {
				if (item.img_type.length != 0) {
					item.img_url = utils.build_scheme(
						'http://dirdomain/dir/file_name.extension', 
						['http', host.DIR, GUIDE_IMAGE_DIR, item.id_guide, item.name.replace(/ /g, '_'), item.img_type]
					);
				} else {
					item.img_url = null;
				}
				delete item.img_type;
			});
			res.send(utils.send(result));
		} else {
			res.send(utils.throw('failed to retrieve place data', exception.sql('place', err.code, query.build())));
		}
	});
});

module.exports = app;