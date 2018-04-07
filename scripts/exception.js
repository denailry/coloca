var sqlException = function(route, errcode, sqlStatement) {
	return "SQL_ERR/" + route + ": " + errcode + " " + sqlStatement;
}

var httpException = function(route, errcode, url) {
	return "HTTP_ERR/" + route + ": " + errcod + " " + url;
}

module.exports = {
  sql: sqlException,
  http: httpException
}