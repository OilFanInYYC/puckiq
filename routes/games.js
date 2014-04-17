var sprintf = require('sprintf-js').sprintf;

function GameHandler(request, cheerio) {
	"use strict";

	var htmlReportsUrl = 'www.nhl.com/scores/htmlreports';
	
	this.getPlayByPlay = function(req, res) {
		var season = parseInt(req.params.season);
		switch(req.params.gametype) {
			case '02':
			case '2':
			case 2:
			case 'R':
			case 'REG':
				var gametype = '02';
				break;
			default:
				var gametype = '03';
				break;
		}

		var gameid = sprintf('%04f', parseInt(req.params.gameid));

		var playbyplayUrl = 'http://' + htmlReportsUrl + '/' + season + '/PL' + gametype + gameid + '.HTM';

		request(playbyplayUrl, function(error, response, html) {
			if(!error && response.statusCode == 200) {
				var modhtml = html.replace(/&nbsp;/g,' ');
				var $ = cheerio.load(modhtml);

				var nhlgame = new Object();

				nhlgame['season'] = season;
				nhlgame['gametype'] = (gametype == "02") ? "REGULAR" : "PLAYOFF";
				nhlgame['gameid'] = gameid;
				nhlgame['home'] = $(($('#Home').first().children('tr:nth-child(3)').html()).replace('<br>','|')).text().split('|')[0].trim();
				nhlgame['away'] = $(($('#Visitor').first().children('tr:nth-child(3)').html()).replace('<br>','|')).text().split('|')[0].trim();
				nhlgame['gamedate'] = $('#GameInfo').first().children('tr:nth-child(4)').text().trim();
				var gametime = ($('#GameInfo').first().children('tr:nth-child(6)').text().replace('Start','').trim().split(';')[0]).split(':');

				nhlgame['gamestart'] = (parseInt(gametime[0]) < 10) ? sprintf('%02f', parseInt(gametime[0])+12) + ':' + gametime[1] : sprintf('%02f', parseInt(gametime[0])) + ':' + gametime[1];
				
				var getEvents = $('tr.evenColor');
				var events = new Array();

				$(getEvents).each(function(rowIndex, rowValue) {
					var singleEvent = new Object();
					$(rowValue).children('td').each(function(colIndex, colValue) {
						switch(colIndex) {
							case 0:
								singleEvent['eventid'] = parseInt($(colValue).text());
							case 1:
								singleEvent['period'] = parseInt($(colValue).text());
								break;
							case 2:
								singleEvent['strength'] = ($(colValue).text() == " ") ? 'NA' : $(colValue).text();
								break;
							case 3:
								var ticks = new Object();
								var tick = $(colValue).html().replace('<br>','|').split('|');
								ticks['elapsed'] = (parseInt(tick[0].split(':')[0])*60)+(parseInt(tick[0].split(':')[1]));
								ticks['remain'] = (parseInt(tick[1].split(':')[0])*60)+(parseInt(tick[1].split(':')[1]));
								singleEvent['time'] = ticks;
								break;
							case 4:
								switch($(colValue).text()) {
									case "GOAL":
										singleEvent['goal'] = true;
										singleEvent['fenwick'] = true;
										singleEvent['corsi'] = true;
										break;
									case "SHOT":
									case "MISS":
										singleEvent['fenwick'] = true;
										singleEvent['corsi'] = true;
										break;
									case "BLOCK":
										singleEvent['corsi'] = true;
										break;
								}
								singleEvent['eventtype'] = $(colValue).text();
								break;
							case 5:
								switch(singleEvent['eventtype']) {
									case "SHOT":
									case "MISS":
									case "GOAL":
										singleEvent['eventfor'] = $(colValue).text().substring(0,3);
										singleEvent['eventby'] = parseInt($(colValue).text().substring($(colValue).text().indexOf('#')).replace('#','').split(' ')[0]);
										singleEvent['zone'] = $(colValue).text().substring($(colValue).text().indexOf('. Zone'), $(colValue).text().indexOf('. Zone')-3).toUpperCase();
										singleEvent['distance'] = parseInt($(colValue).text().substring($(colValue).text().lastIndexOf(',')).replace(' ft.','').replace(', ',''));
										singleEvent['shottype'] = $(colValue).text().split(',')[1].trim();
										break;
									case "BLOCK":
										singleEvent['eventfor'] = $(colValue).text().substring(0,3);
										singleEvent['eventby'] = parseInt($(colValue).text().substring($(colValue).text().indexOf('#')).replace('#','').split(' ')[0]);
										singleEvent['zone'] = $(colValue).text().substring($(colValue).text().indexOf('. Zone'), $(colValue).text().indexOf('. Zone')-3).toUpperCase();
										singleEvent['shottype'] = $(colValue).text().split(',')[1].trim();
										singleEvent['blockedby'] = parseInt($(colValue).text().substring($(colValue).text().lastIndexOf('#')).replace('#','').split(' ')[0]);
										break;
									case "FAC":
									case "HIT":
									case "TAKE":
									case "GIVE":
										singleEvent['eventfor'] = $(colValue).text().substring(0,3);
										singleEvent['eventby'] = parseInt($(colValue).text().substring($(colValue).text().indexOf('#')).replace('#','').split(' ')[0]);
										singleEvent['zone'] = $(colValue).text().substring($(colValue).text().indexOf('. Zone'), $(colValue).text().indexOf('. Zone')-3).toUpperCase();
										break;
									case "PENL":
										singleEvent['eventfor'] = $(colValue).text().substring(0,3);
										singleEvent['eventby'] = parseInt($(colValue).text().substring($(colValue).text().indexOf('#')).replace('#','').split(' ')[0]);
										singleEvent['zone'] = $(colValue).text().substring($(colValue).text().indexOf('. Zone'), $(colValue).text().indexOf('. Zone')-3).toUpperCase();
										singleEvent['drawnby'] = parseInt($(colValue).text().substring($(colValue).text().lastIndexOf('#')).replace('#','').split(' ')[0]);
										var penalty = $(colValue).text().substring($(colValue).text().lastIndexOf('(')+1, $(colValue).text().lastIndexOf(')')).replace(' min', '');
										singleEvent['pim'] = parseInt(penalty);
										break;
								}
								singleEvent['description'] = $(colValue).text();
								break;
							case 6:
								var player = new Array();
								$(colValue).find('font').each(function(playerIndex, playerValue) {
									player.push(parseInt($(playerValue).text()));
								})
								singleEvent['away'] = player;
								break;
							case 7:
								var player = new Array();
								$(colValue).find('font').each(function(playerIndex, playerValue) {
									player.push(parseInt($(playerValue).text()));
								})
								singleEvent['home'] = player;
								break;
						}
						if(colIndex == 7)
							events.push(singleEvent);
					});
				});

				nhlgame['events'] = events;

				res.send(nhlgame);
			} else if(response.statusCode != 200) {
				res.send(response.statusCode);
			} else {
				throw error;
			}
		});
	}
};

module.exports = GameHandler;