var settings = require('./settings');
var bosReader = require('./parseBoSList');
var bosListReader = new bosReader.bosListReader();
var bosList;
var rcon;
var usermatch = /Id: \s?([0-9]*) - (.*) is remote ip: ([0-9\.]*):([0-9]*)/g;
bosListReader.once("BoSListConversionCompleted", function(list) {		//Finished reading BoS List, wait for rcon auth;
	bosList = list;
	initRCON();
	rcon.once("authed", lookupPlayers);			//RCON login success. Start the loop;
});

/**
 * Initializes the RCON object and connection with the BF2 server using
 * the rcon settings defined in the settings file.
**/
function initRCON() {
	var bf2 = require('./bf2rcon');
	var options = {
		host: settings.rcon.host,
		port: settings.rcon.port,
		password: settings.rcon.password
	}
	rcon = new bf2.rcon(options);
}

/**
 * The main loop of the program. This function grabs the online player list, checks
 * that list against the bos list, removes any BoS player found, then sets a timer
 * to repeat after the specified time.
**/
function lookupPlayers() {
	rcon.send("exec admin.listPlayers", function(data) {	//Get all players;
		data = data.toString();
		match = usermatch.exec(data);						//Parse out 1 player's info;
		while(match != null) {
			if(checkAgainstBoSList(match[1], match[2], match[3])) {//Check if that player is on the BoS List;
				removePlayer(match[1], match[2], match[3]);	//If so, remove the player;
			}
			match = usermatch.exec(data);					//Parse out next player's info;
		}
	});
	setTimeout(lookupPlayers, settings.loopWaitTime); 	//Set a timer to do this again in waitTime ms;
}

/**
 * Checks the provided name and IP against the BoSList. Returns true if the name or IP
 * was found. Returns false otherwise.
**/
function checkAgainstBoSList(ID, name, ip) {
	var result = false;
	bosList.every(function(row) {	//Iterate through BoSList;
		if(row.name === name) {
			console.log("BoS Name found: " + name);
			result = true;
			return false;			//Found a match so break out of the loop;
		}
		if(row.ip === ip) {
			console.log("BoS IP found: " + ip);
			result = true;
			return false;			//Found a match so break out of the loop;
		}
		return true;
	});
	return result;					//Returns the results of the search;
}

/**
 * Removes the player from the server. Kick, Ban, etc.
**/
function removePlayer(ID, name, ip) {
	rcon.send("exec admin.kickPlayer " + ID, function(data){
		//console.log(data);
		console.log("BoS player kicked: " + name + ":" + ip);
	});
}