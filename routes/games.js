/*
 * The code in this section will ultimately be dumped into a MongoDB database but right now only displays live info.
 * GameID's are displayed as 4 digit numbers
 * GameType is a 2 digit number
 * Season is an 8 digit number
 */
var sprintf = require('sprintf-js').sprintf,
	teams = require('./teams');

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
				playByPlay(season, gametype, gameid, html, function(gamedata) {
					res.send(gamedata);
				})				
			} else if(response.statusCode != 200) {
				res.send(response.statusCode);
			} else {
				throw error;
			}
		});
	}

	var playByPlay = function(season, gametype, gameid, html, callback) {
		var modhtml = html.replace(/&nbsp;/g,' ');
		var $ = cheerio.load(modhtml);

		var nhlgame = new Object();

		nhlgame['season'] = season;
		nhlgame['gametype'] = (gametype == "02") ? "REGULAR" : "PLAYOFF";
		nhlgame['gameid'] = gameid;
		
		var hometeam = $(($('#Home').first().children('tr:nth-child(3)').html()).replace('<br>','|')).text().split('|')[0].trim();
		var awayteam = $(($('#Visitor').first().children('tr:nth-child(3)').html()).replace('<br>','|')).text().split('|')[0].trim();

		var homeabbr;

		teams.forEach(function(v,i) {
			if(v.name.toUpperCase() == hometeam) {
				nhlgame['home'] = v.teamID;
				homeabbr = v.TeamPXP;
			}
			if(v.name.toUpperCase() == awayteam) {
				nhlgame['away'] = v.teamID;
			}
		});

		nhlgame['gamedate'] = $('#GameInfo').first().children('tr:nth-child(4)').text().trim();
		var gametime = ($('#GameInfo').first().children('tr:nth-child(6)').text().replace('Start','').trim().split(';')[0]).split(':');

		nhlgame['gamestart'] = (parseInt(gametime[0]) < 10) ? sprintf('%02f', parseInt(gametime[0])+12) + ':' + gametime[1].trim() : sprintf('%02f', parseInt(gametime[0])) + ':' + gametime[1].trim();
		
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
						if(singleEvent['period'] > 4 && ticks['elapsed'] == 0 && ticks['remain'] == 0)
							singleEvent['shootout'] = true;
						break;
					case 4:
						// Captures all Goal/Shot/Fenwick/Corsi events
						if(!singleEvent['shootout']) {
							switch($(colValue).text()) {
								case "GOAL":
									singleEvent['goal'] = true;
									singleEvent['shot'] = true;
									if(singleEvent['strength'] == "EV") {
										singleEvent['fenwick'] = true;
										singleEvent['corsi'] = true;
									}
									break;
								case "SHOT":
									singleEvent['shot'] = true;
									if(singleEvent['strength'] == "EV") {
										singleEvent['fenwick'] = true;
										singleEvent['corsi'] = true;
									}
									break;
								case "MISS":
									if(singleEvent['strength'] == "EV") {
										singleEvent['fenwick'] = true;
										singleEvent['corsi'] = true;
									}
									break;
								case "BLOCK":
									if(singleEvent['strength'] == "EV") {
										singleEvent['corsi'] = true;
									}
									break;
							}
							singleEvent['eventtype'] = $(colValue).text();
						} else {
							switch($(colValue).text()) {
								case "SHOT":
								case "MISS":
								case "GOAL":
									singleEvent['eventtype'] = "SO_" + $(colValue).text();
									break;
								default:
									singleEvent['eventtype'] = $(colValue).text();
									break;
							}
							
						}
						break;
					case 5:
						switch(singleEvent['eventtype']) {
							case "SO_GOAL":
							case "SO_SHOT":
							case "SO_MISS":
							case "SHOT":
							case "MISS":
							case "GOAL":
								// This displays all information for Fenwick/Corsi events
								singleEvent['eventfor'] = ($(colValue).text().substring(0,3) == homeabbr) ? nhlgame['home'] : nhlgame['away'];
								singleEvent['eventby'] = parseInt($(colValue).text().substring($(colValue).text().indexOf('#')).replace('#','').split(' ')[0]);
								singleEvent['zone'] = $(colValue).text().substring($(colValue).text().indexOf('. Zone'), $(colValue).text().indexOf('. Zone')-3).toUpperCase();
								singleEvent['distance'] = parseInt($(colValue).text().substring($(colValue).text().lastIndexOf(',')).replace(' ft.','').replace(', ',''));
								singleEvent['shottype'] = $(colValue).text().split(',')[1].trim();
								break;
							case "BLOCK":
								// This displays all information for BLOCKED Corsi events
								singleEvent['eventfor'] = ($(colValue).text().substring(0,3) == homeabbr) ? nhlgame['home'] : nhlgame['away'];
								singleEvent['eventby'] = parseInt($(colValue).text().substring($(colValue).text().indexOf('#')).replace('#','').split(' ')[0]);
								singleEvent['zone'] = $(colValue).text().substring($(colValue).text().indexOf('. Zone'), $(colValue).text().indexOf('. Zone')-3).toUpperCase();
								singleEvent['shottype'] = $(colValue).text().split(',')[1].trim();
								singleEvent['blockedby'] = parseInt($(colValue).text().substring($(colValue).text().lastIndexOf('#')).replace('#','').split(' ')[0]);
								break;
							case "FAC":
								// This displays information for Faceoffs. Because the faceoff is recorded as
								// '<Team> won <zone> - <AWAY> #<NO> <PLAYER> vs <HOME> #<NO> <PLAYER>' the eventby
								// needs to be adjusted to grab the correct player's number.
								singleEvent['eventfor'] = ($(colValue).text().substring(0,3) == homeabbr) ? nhlgame['home'] : nhlgame['away'];
								if(($(colValue).text().substring(0,3) != homeabbr))
									singleEvent['eventby'] = parseInt($(colValue).text().substring($(colValue).text().indexOf('#')).replace('#','').split(' ')[0]);
								else
									singleEvent['eventby'] = parseInt($(colValue).text().substring($(colValue).text().lastIndexOf('#')).replace('#','').split(' ')[0]);
								singleEvent['zone'] = $(colValue).text().substring($(colValue).text().indexOf('. Zone'), $(colValue).text().indexOf('. Zone')-3).toUpperCase();
								break;
							case "HIT":
							case "TAKE":
							case "GIVE":
								// This displays information for Hits, Takeaways and Giveaways
								singleEvent['eventfor'] = ($(colValue).text().substring(0,3) == homeabbr) ? nhlgame['home'] : nhlgame['away'];
								singleEvent['eventby'] = parseInt($(colValue).text().substring($(colValue).text().indexOf('#')).replace('#','').split(' ')[0]);
								singleEvent['zone'] = $(colValue).text().substring($(colValue).text().indexOf('. Zone'), $(colValue).text().indexOf('. Zone')-3).toUpperCase();
								break;
							case "PENL":
								// This displays penalty information. I tried to include the actual penalty call but ran into problems with penalties
								// that that were more than one word long (ie. cross checking would only display as checking)
								singleEvent['eventfor'] = ($(colValue).text().substring(0,3) == homeabbr) ? nhlgame['home'] : nhlgame['away'];
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

		callback(nhlgame);
	}
};


module.exports = GameHandler;