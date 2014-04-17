# PuckIQ API
## Usage Guide

This is a pretty simple system built to parse through the NHL's website of playbyplay reports. The system uses Express, Cheerio and Request to make calls to the NHL's website and request playbyplay reports. The HTML is then parsed and outputted into a universal JSON object.

To run the program run ```npm install``` from a command line and all of the required libraries will come down. To run the app just run ```npm start``` from the command line. This will start the server on localhost port 3600. With a broweser go to http://localhost:3600/playbyplay/:season/:gametype/:gameid and it will display the results you are looking for.

For a comparisson of the JSON data to the raw NHL data go to http://www.nhl.com/scores/htmlreports/20122013/PL030416.HTM this will bring up the raw HTML data. To get the JSON data browse to http://localhost:3600/playbyplay/20122013/03/0416 and this will display the data parsed in JSON format.
