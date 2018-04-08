const GUIDE_IMAGE_DIR = "img/guide";
const ENDPOINT = 'account/guide';

var express = require("express");
var host = require('../scripts/host');
var utils = require('../scripts/utils');
var sql = require('../scripts/sql-builder/sql-builder');
var exception = require('../scripts/exception');
var hash = require("password-hash");
var app = express.Router();
var logging = utils.logging;

var sqlQuery = function(query, endpoint="") {
	return new Promise((resolve, reject) => {
		host.con.query(query.build(), (err, result) => {
			if (err) {
				new Promise(resolve => {
					logging("SQL_ERR/toko: " + err.code + " " + query.build());
					resolve(exception.sql(endpoint, err.code, query.build()));
				}).then(() => {
					reject(err);
				});
			} else {
				resolve(result);
			}
		});
	});
}

app.get("/", (req, res) => {
	var endpoint = ENDPOINT;

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
		.setLimit(offset, limit)
		.setOrder('rating', sql.DESC);

	host.con.query(query.build(), (err, result) => {
		if(!err) {
			var languagePromises = [];
			var cityPromises = [];
			result.forEach((item, index) => {
				item.city = [];
				item.language = [];
				if (item.img_type.length != 0) {
					item.img_url = utils.build_scheme(
						'http://dirdomain/dir/file_name.extension', 
						['http', host.DIR, GUIDE_IMAGE_DIR, item.id_guide, item.name.replace(/ /g, '_'), item.img_type]
					);
				} else {
					item.img_url = null;
				}
				var langQuery = sql.make_sql(sql.SELECT, 'guide_languages')
					.addFields('id_guide, language')
					.setCondition('id_guide', sql.EqualTo, item.id_guide);
				var cityQUery = sql.make_sql(sql.SELECT, 'guide_cities')
					.addFields('id_guide, city')
					.setCondition('id_guide', sql.EqualTo, item.id_guide);
				var language = sqlQuery(langQuery, endpoint).catch(err => res.send({error: {msg: 'failed to retrieve languages'}, result: null}));
				var city = sqlQuery(cityQUery, endpoint).catch(err => res.send({error: {msg: 'failed to cities'}, result: null}));
				languagePromises.push(language);
				cityPromises.push(city);
				delete item.img_type;
			});

			var completeResult = async () => {
				await Promise.all(cityPromises).then((values) => {
					values.forEach((value, index) => {
						value.forEach((item, idx) => {
							if (item.city.length != 0) {
								result[item.id_guide].city.push(item.city);
							}
						});
					});
				}).catch((err) => {
					res.send(utils.throw('failed to retrieve cities data', err));
					return;
				});
				await Promise.all(languagePromises).then((values) => {
					values.forEach((value, index) => {
						value.forEach((item, idx) => {
							if (item.language.length != 0) {
								result[item.id_guide].language.push(item.language);
							}
						});
					});
				}).catch((err) => {
					res.send(utils.throw('failed to retieve languages data', err));
					return;
				});
			}
			completeResult().then(() => {
				res.send(utils.send(result));
			}).catch((err) => {
				return;
			})
		} else {
			res.send(utils.throw('failed to retrieve place data', exception.sql('place', err.code, query.build())));
		}
	});
});	

app.get("/id/:id_guide", (req, res) => {
	var endpoint = ENDPOINT+'/id/:id_guide';

	var idGuide = req.params.id_guide;

	var query = sql.make_sql(sql.SELECT, 'account_guide')
		.addFields('id_guide, name, email, phone, rating, img_type')
		.setCondition('id_guide', sql.EqualTo, idGuide);

	host.con.query(query.build(), (err, result) => {
		if(!err) {
			var languagePromises = [];
			var cityPromises = [];
			result.forEach((item, index) => {
				if (item.img_type.length != 0) {
					item.img_url = utils.build_scheme(
						'http://dirdomain/dir/file_name.extension', 
						['http', host.DIR, GUIDE_IMAGE_DIR, item.id_guide, item.name.replace(/ /g, '_'), item.img_type]
					);
				} else {
					item.img_url = null;
				}
				var langQuery = sql.make_sql(sql.SELECT, 'guide_languages')
					.addFields('language')
					.setCondition('id_guide', sql.EqualTo, item.id_guide);
				var cityQUery = sql.make_sql(sql.SELECT, 'guide_cities')
					.addFields('city')
					.setCondition('id_guide', sql.EqualTo, item.id_guide);
				var language = sqlQuery(langQuery, endpoint).catch(err => res.send({error: {msg: 'failed to retrieve languages'}, result: null}));
				var city = sqlQuery(cityQUery, endpoint).catch(err => res.send({error: {msg: 'failed to cities'}, result: null}));
				languagePromises.push(language);
				cityPromises.push(city);

				delete item.img_type;
			});

			var completeResult = async () => {
				result[0].city = [];
				await Promise.all(cityPromises).then((values) => {
					values.forEach((value, index) => {
						value.forEach((item, idx) => {
							result[0].city.push(item.city);
						});
					});
				}).catch((err) => {
					res.send(utils.throw('failed to retrieve cities data', err));
					return;
				});
				result[0].language = [];
				await Promise.all(languagePromises).then((values) => {
					values.forEach((value, index) => {
						value.forEach((item, idx) => {
							result[0].language.push(item.language);
						});
					});
				}).catch((err) => {
					res.send(utils.throw('failed to retieve languages data', err));
					return;
				});
			}	

			completeResult().then(() => {
				res.send(utils.send(result));
			}).catch((err) => {
				return;
			})
		} else {
			res.send(utils.throw('failed to retrieve place data', exception.sql(endpoint, err.code, query.build())));
		}
	});
});

module.exports = app;