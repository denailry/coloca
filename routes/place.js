const PLACE_IMAGE_DIR = "img/place";

const express = require("express");
const host = require('../scripts/host');
const utils = require('../scripts/utils');
const sql = require('../scripts/sql-builder/sql-builder');
const app = express.Router();
const logging = utils.logging;
const exception = require('../scripts/exception');
const request = require('request');

var normalize = function(str) {
	var space = false;
	var sIndex = 0;
	var index = 0;
	while (index < str.length) {
		var char = str[index];
		if (char == ' ') {
			if (space) {
				str.splice(index, 0);
				index--;
			} else {
				space = true;
				sIndex = index;
			}
		} else {
			space = false;
		}
		index++;
	};
	if (space) {
		str.splice(sIndex, 0);
	}
	return str;
}

app.get('/', (req, res) => {
	var search = req.query.search;
	var limit = req.query.limit;
	var offset = req.query.limit;

	if (search == null) {
		search = "";
	}

	var sqlSearch = sql.make_sql(sql.SELECT, 'destination')
		.addFields("id_destination, CONCAT(name, ' ', city, ' ', province, ' ', country) as place");
	var query = sql.make_sql(sql.SELECT, 'destination natural join ' + sql.wrap(sql.alias(sqlSearch.build(), 'T')))
		.addFields("id_destination, name, img_type")
		.setCondition(sql.make_cond('T.place', sql.LIKE, '%'+normalize(search)+'%'))
		.setLimit(offset, limit);

	host.con.query(query.build(), (err, result) => {
		if(!err) {
			result.forEach((item, index) => {
				if (item.img_type != null) {
					item.img_url = utils.build_scheme(
						'http://dirdomain/dir/file_name.extension', 
						['http', host.DIR, PLACE_IMAGE_DIR, item.id_destination, item.name.replace(/ /g, '_'), item.img_type]
					);
				}	
				delete item.img_type;
			});
			res.send(utils.send(result));
		} else {
			res.send(utils.throw('failed to retrieve place data', exception.sql('place', err.code, query.build())));
		}
	});
});

app.get('/top10', (req, res) => {
	var url = 'http://ilhamfp31.pythonanywhere.com/top10';
	request(url, {json: true}, (err, requestResult, body) => {
		if (err) { 
			res.send(utils.throw('failed to request place data', exception.http('place/top10', err.code, url)));
		}
		var query = sql.make_sql(sql.SELECT, 'destination')
			.addFields("id_destination, name, city, province, country, timezone, cost, rating, img_type");

		for (var key in body) {
			query.addCondition(sql.OR, sql.make_cond('name', sql.LIKE, utils.wrap('%', key)));
		}

		console.log(query.build());

		host.con.query(query.build(), (err, result) => {
			if (!err) {
				result.forEach((place, index) => {
					delete place.img_type;
					for (var key in body) {
						if (key == place.name) {
							place.rating = body[key];
							delete body[key];
							break;
						}
					}
				});
				res.send(utils.send(result));
			} else {
				res.send(utils.throw('failed to retrieve place data', exception.sql('place/top10', err.code, query.build())));
			}
		});
	});
});

app.get('/id/:id_destination', (req, res) => {
	var idDestination = req.params.id_destination;

	var query = sql.make_sql(sql.SELECT, 'destination')
		.addFields("id_destination, name, city, province, country, timezone, cost, rating, img_type")
		.setCondition(sql.make_cond('id_destination', sql.EqualTo, idDestination));

	host.con.query(query.build(), (err, result) => {
		if(!err) {
			result.forEach((item, index) => {
				if (item.img_type != null) {
					item.img_url = utils.build_scheme(
						'http://dirdomain/dir/file_name.extension', 
						['http', host.DIR, PLACE_IMAGE_DIR, item.id_destination, item.name.replace(/ /g, '_'), item.img_type]
					);
				}
				delete item.img_type;
			});
			var url = 'http://ilhamfp31.pythonanywhere.com/' + result[0].name;
			request(url, {json: true}, (err, requestResult, body) => {
				if (err) { 
					res.send(utils.throw('failed to request review data', exception.http('place/id_destination', err.code, url)));
				}
				result[0].review = body.positif;
				result[0].rating = body.summary[0].rating;
				res.send(utils.send(result));
			});
		} else {
			res.send(utils.throw('failed to retrieve place data', exception.sql('place/id_destination', err.code, query.build())));
		}
	});
});	

app.get('/route', (req, res) => {
	var origin = req.query.origin;
	var dest = req.query.dest;

	if (utils.null_check([origin, dest])) {
		res.send(utils.throw('lack of parameter'));
		return;	
	}


	var routes = [];

	var route1 = [4];
	route1[0] = {
		origin: 'My Location',
		transport_type: 1,
		transport_name: 'Carigin - Sadang Serang',
		dest: 'Jl. Pajajaran',
		distance: '8.1 KM',
		cost: '6.000 IDR'
	};
	route1[1] = {
		origin: 'Jl. Pajajaran',
		transport_type: 0,
		transport_name: 'Walking',
		dest: 'Husein Sastranegara Airport',
		distance: '200 M',
		cost: '0'
	};
	route1[2] = {
		origin: 'Husein Sastranegara Airport',
		transport_type: 4,
		transport_name: 'Aircraft',
		dest: 'Ngurah Rai Airport',
		distance: '1000 KM',
		cost: '500.000 - 1.000.000 IDR'
	};
	route1[3] = {
		origin: 'Ngurah Rai Airport',
		transport_type: 3,
		transport_name: 'Online Transport',
		dest: 'Pantai Kuta',
		distance: '4.2 KM',
		cost: '10.000 IDR'
	};

	var route2 = [4];
	route2[0] = {
		origin: 'My Location',
		transport_type: 1,
		transport_name: 'Caringin - Sadang Serang',
		dest: 'Jl. Dayang Sumbi',
		distance: '1.6 KM',
		cost: '2.500 IDR'
	};
	route2[1] = {
		origin: 'Jl. Dayang Sumbi',
		transport_type: 1,
		transport_name: 'Cicaheum - Ledeng',
		dest: 'Jl. WR. Supratman',
		distance: '4.4 KM',
		cost: '3.500 IDR'
	};
	route2[2] = {
		origin: 'Jl. WR. Supratman',
		transport_type: 1,
		transport_name: 'Abdul Muis - Cicaheum',
		dest: 'Jl. Gatot Subroto',
		distance: '3.9 KM',
		cost: '3.000 IDR'
	};
	route2[3] = {
		origin: 'Jl. Gatot Subroto',
		transport_type: 0,
		transport_name: 'Walking',
		dest: 'Trans Studio',
		distance: '100 M',
		cost: '0'
	};

	var route3 = [5];
	route3[0] = {
		origin: 'My Location',
		transport_type: 1,
		transport_name: 'Caringin - Sadang Serang',
		dest: 'Jl. Ir. H. Juanda',
		distance: '1.2 KM',
		cost: '2.500 IDR' 
	};
	route3[1] = {
		origin: 'Jl. Ir. H. Juanda',
		transport_type: 1,
		transport_name: 'Cicaheum - Ciroyom',
		dest: 'Baraya Travel Surapati',
		distance: '3.2 KM',
		cost: '3.000 IDR'
	};
	route3[2] = {
		origin: 'Baraya Travel Surapati',
		transport_type: 5,
		transport_name: 'Baraya Travel',
		dest: 'Baraya Travel Sarinah',
		distance: '152 KM',
		cost: '85.000 IDR'
	};
	route3[3] = {
		origin: 'Baraya Travel Sarinah',
		transport_type: 0,
		transport_name: 'Walking',
		dest: 'Bus Stop: Sarinah',
		distance: '170 M',
		cost: '0'
	};
	route3[4] = {
		origin: 'Bus Stop: Sarinah',
		transport_type: 6,
		transport_name: 'Transjakarta Bus',
		dest: 'Bus Stop: Monas',
		distance: '1.5 KM',
		cost: '3.500 IDR'
	};

	routes.push(route1);
	routes.push(route2);
	routes.push(route3);

	if (origin.toLowerCase() == 'my location' && dest.toLowerCase() == 'pantai kuta') {
		res.send(utils.send(routes[0]));
	} else if (origin.toLowerCase() == 'my location' && dest.toLowerCase() == 'trans studio')  {
		res.send(utils.send(routes[1]));
	} else if (origin.toLowerCase() == 'my location' && dest.toLowerCase() == 'monumen nasional') {
		res.send(utils.send(routes[2]));
	} else {
		res.send(utils.send(routes[parseInt(Math.random()*100) % 3]));
	}
});

module.exports = app;