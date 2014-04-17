var express = require('express'),
	app = express();

var request = require('request'),
	cheerio = require('cheerio'),
	routes = require('./routes');

routes(app, request, cheerio);

app.listen('3600');