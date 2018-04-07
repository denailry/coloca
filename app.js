var express = require("express");
var fs = require("fs");
var app = express();
var bodyParser = require("body-parser");
var session = require('express-session');
var MySQLStore = require('express-mysql-session');
var idGen = require('./scripts/id-gen');
var host = require('./scripts/host');
var util = require('./scripts/utils');

var sessionStore;
var logging = util.logging;

var MAX_ID_CHECKING = 0;
var SUCCESS_ID_CHECKING = 0;

app.set("view engine", "ejs");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: true
}));
app.use(session({
	key: 'session_authorized',
	secret: 'authorized',
	store: sessionStore,
	resave: false,
	saveUninitialized: false
}));

app.use("/", function(req, res, next) {
	logging("REQUEST" + req.originalUrl + ": body{" + JSON.stringify(req.body) + "}, " + "header{" + JSON.stringify(req.headers) + "}");
	// if (req.method == "POST") {
	// 	if(req.headers.authorization != host.KEY && req.session.authorized == null) {
	// 		logging("Not authorized access detected....");
	// 	}
	// }
	next();
});

app.get("/", (req, res) => {
	res.send("Hello");
	// req.session.authorized = true;
	// res.render("main.ejs", {domain: host.DOMAIN, dir: host.DIR});
});

app.get("/api/doc", (req, res) => {
	res.send(require('./api-doc'));
});
app.use('/api/account', require('./routes/account'));
app.use('/api/order', require('./routes/order'));
app.use('/api/place', require('./routes/place'));

function init() {
	fs.writeFile("log.dat", "", (err) => {
		if(err) {
			console.log("Error cleaning log!");
		} else {
			host.makeConnection((err, message) => {
				if (err) {
					console.log("Error init host! "  + message);
				} else {
					idChecking();
				}
			});
		}
	});
}

async function idChecking() {
	MAX_ID_CHECKING = 0;
	// var getTransactionId = "SELECT MAX(transaction_id) as transaction_id FROM `cus_transaction`";
	// var transactionCheck = await new Promise(resolve => {
	// 	host.con.query(getTransactionId, (err, result) => {
	// 		if (err) {
	// 			reject("failed to do id checking");
	// 		} else {
	// 			idGen.setTransactionId(result[0].transaction_id);
	// 			SUCCESS_ID_CHECKING++;
	// 			resolve(true);
	// 		}
	// 	});
	// }).catch(err => {
	// 	logging(err);
	// });
	serverUp();
}

function serverUp() {
	if (SUCCESS_ID_CHECKING == MAX_ID_CHECKING) {
		app.listen(3000, () => {
			sessionStore = new MySQLStore({}, host.con);
			console.log("Server On!");
		});
	} else {
		console.log("initialization failed");
	}
}

init();