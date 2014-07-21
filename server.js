var express = require('express'),
	app = express();

var request = require('request'),
	http = require('http'),
	cheerio = require('cheerio'),
	routes = require('./routes'),
	config = require('./config.js'),
	server = http.createServer(app);

routes(app, request, cheerio);

server.listen(config.port, config.ip, function() {
	server.close(function() {
		server.listen(config.port, config.ip);
	})
});