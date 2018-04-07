var utils = require('../utils');
var host = require('../host')

function tableToString(tables) {
	if (typeof(tables) == "string") {
		return tables;
	} else {
		strTable = "";
		tables.forEach((table, index) => {
			strTable = strTable + table;
			if ((index+1) < tables.length) {
				strTable = strTable + ", ";
			}
		});
		return strTable;
	}
}

var statementBuilder = {
	statement: null,
	sql: null
}
statementBuilder.select = function() {
	var sql = this.sql;

	if (sql.fields == null || sql.fields.length == 0) {
		this.statement += '* ';
	} else {
		sql.fields.forEach((field, index) => {
			this.statement += field;
			if ((index + 1) != sql.fields.length) {
				this.statement += ",";
			}
			this.statement += " ";
		});
	}
	this.statement += "FROM " + tableToString(sql.table);

	if (sql.condition != null) {
		this.where();
	}
	if (sql.order != null) {
		this.order();
	}
	if (sql.limit != null) {
		this.limit();
	}
	if (sql.group != null) {
		this.group();
	}
}
statementBuilder.update = function() {
	var sql = this.sql;
	this.statement += sql.table + " SET ";
	sql.fields.forEach((field, index) => {
		this.statement += field + " = " + host.con.escape(sql.values[index]);
		if ((index + 1) != sql.fields.length) {
			this.statement += ", ";
		}
	});

	if (sql.condition != null) {
		this.where();
	} else {
		throw new Error("update without where clause");
	}
}
statementBuilder.delete = function() {
	var sql = this.sql;
	this.statement += "FROM " + sql.table;

	if (sql.condition != null) {
		this.where();
	} else {
		throw new Error("delete without where clause");
	}
}
statementBuilder.insert = function() {
	var sql = this.sql;
	this.statement += "INTO " + sql.table + " ";
	this.statement += "(";
	sql.fields.forEach((field, index) => {
		this.statement += field;
		if ((index + 1) != sql.fields.length) {
			this.statement += ", ";
		}
	});
	this.statement += ") ";
	this.statement += "VALUES(";
	sql.values.forEach((value, index) => {
		this.statement += host.con.escape(value);
		if ((index + 1) != sql.values.length) {
			this.statement += ", ";
		}
	});
	this.statement += ")"
}
statementBuilder.replace = function() {
	var sql = this.sql;
	this.statement += "INTO " + sql.table + " ";
	this.statement += "(";
	sql.fields.forEach((field, index) => {
		this.statement += field;
		if ((index + 1) != sql.fields.length) {
			this.statement += ", ";
		}
	});
	this.statement += ") ";
	this.statement += "VALUES(";
	sql.values.forEach((value, index) => {
		this.statement += host.con.escape(value);
		if ((index + 1) != sql.values.length) {
			this.statement += ", ";
		}
	});
	this.statement += ")";
}
statementBuilder.where = function() {
	var sql = this.sql;
	this.statement += " WHERE ";
	this.statement += sql.condition.toString();
}
statementBuilder.limit = function() {
	var sql = this.sql;
	this.statement += " LIMIT ";
	if (sql.limit.offset == null) {
		this.statement += sql.limit.length;
	} else {
		this.statement += sql.limit.offset + ", " + sql.limit.length;
	}
}
statementBuilder.order = function() {
	var sql = this.sql;
	this.statement += " ORDER BY " + sql.order.by + " " + sql.order.type;
}
statementBuilder.group = function() {
	var sql = this.sql;
	this.statement += " GROUP BY " + sql.group;
}

var createStatement = function(sql) {
	var newStatement = utils.clone(statementBuilder);
	newStatement.statement = sql.operation + " ";
	newStatement.sql = sql;
	return newStatement;
}

module.exports = {
	make_stmt: createStatement
}