var GameHandler = require('./games');

module.exports = exports = function(app, request, cheerio) {
	var gameHandler = new GameHandler(request, cheerio);

	app.get('/playbyplay/:season/:gametype/:gameid', gameHandler.getPlayByPlay);
	app.get('/fenwick/:season/:gametype/:gameid', gameHandler.getFenwickEvents);
	app.get('/corsi/:season/:gametype/:gameid', gameHandler.getCorsiEvents);
	app.get('/shots/:season/:gametype/:gameid', gameHandler.getShotEvents);
	app.get('/goals/:season/:gametype/:gameid', gameHandler.getGoalEvents);
}