var GameHandler = require('./games');

module.exports = exports = function(app, request, cheerio) {
	var gameHandler = new GameHandler(request, cheerio);

	app.get('/playbyplay/:season/:gametype/:gameid', gameHandler.getPlayByPlay);
}