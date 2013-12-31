var settings = require('./settings');
var bosReader = require('./parseBoSList');
var binarySearch = require('./binarySearch');
var bosListReader = new bosReader.bosListReader();	//Start BoSList read, parse, and sort;
var binarySearcher = new binarySearch.binarySearcher();	//Create this for searching the BoSList later;

var bosListByName;
var bosListByIP;
var rcon;
var usermatch = /Id: \s?([0-9]*) - (.*) is remote ip: ([0-9\.]*):([0-9]*)/g;
var ignoreForNow = [];			//Names in this array are being warned/banned already. The normal loop should ignore them to prevent multiple warnings/kicks/bans for the same player;
var removeFromIgnoreArray = [];	//Async insurance: so we don't remove an ignored name in the middle of a 'check player names' loop (and possibly w/k/b them twice in rapid succession);

//Wait until the BoS list is read and parsed;
bosListReader.once("BoSListConversionCompleted", function(listByName, listByIP) {		//BoS list parsing finished;
	bosListByName = listByName;
	bosListByIP = listByIP;
	initRCON();									//Initialize the RCON interface;
	rcon.once("authed", autoBoSLoop);			//RCON login success. Start the main loop;
});

/**
 * Initializes the RCON object and connection with the BF2 server using
 * the rcon settings defined in the settings file.
**/
function initRCON() {
	var bf2 = require('./bf2rcon');
	var options = {
		host: settings.rcon.HOST,
		port: settings.rcon.PORT,
		password: settings.rcon.PASSWORD
	}
	rcon = new bf2.rcon(options);
}

/**
 * The main loop of the program. This function grabs the online player list, checks
 * that list against the bos list, removes any BoS player found, then sets a timer
 * to repeat after the specified time. Illegal name checking coming soon.
**/
function autoBoSLoop() {
	rcon.send("exec admin.listPlayers", function(data) {		//Get all connected and connecting players;
		data = data.toString();
		match = usermatch.exec(data);							//Parse out 1 player's info;
		while(match != null) {
			if(!isNameIgnored(match[2])) {						//If this player is already being handled by an earlier check skip it so we don't w/k/b it twice;
				if(checkAgainstBoSList(match[2], match[3])) {	//Check if this player is on the BoS List;
					ignoreForNow.push(match[2]);				//Mark this player as 'being handled' so we can ignore it on the next check (if it's still on the server by then);
					banPlayer(match[1], match[2], match[3], settings.messages.BOS_BAN_NOTICE);	//If this player is BoS remove it from the server;
				}
				else {											//If it's not BoS...;
					if(checkForIllegalName(match[2])) {			//Check if player has an inappropriate name;
						ignoreForNow.push(match[2]);			//Mark this player as 'being handled' so we can ignore it on the next check (if it's still on the server by then);
						kickPlayer(match[1], match[2], match[3], settings.messages.ILLEGAL_NAME_NOTICE);	//Player has an inappropriate name (orange text, swearing, etc.) remove them from the server;
					}
				}
			}
			match = usermatch.exec(data);						//Parse out next player's info and repeat;
		}
		if(removeFromIgnoreArray.length > 0) {
			removeNamesFromIgnore();							//Remove all the names that were in the ignore array which we've dealt with during the last check;
		}
		setTimeout(autoBoSLoop, settings.general.LOOP_WAIT_TIME); 	//Set a timer to do this again in waitTime ms (actual time between checks will always > loopWaitTime in case loopWaitTime < 'time to check all players' (otherwise we might start a new check before the last one was finished));
	});
}

/**
 * Checks the provided name and IP against the BoSList. Returns true if the name or IP
 * was found. Returns false otherwise.
**/
function checkAgainstBoSList(name, ip) {
	var location = binarySearcher.find(bosListByName, name, true);	//Search for the name in the boslist;
	if(location > -1) {												//Function will return index of the name in the sorted boslist(not guarenteed to be the first occurance of this name);
		console.log("NAME: \"" + name + ":" + ip + "\" = \"" + bosListByName[location].name + ":" + bosListByName[location].ip + "\" (BoS row: " + location + ").");
		return true;												//Name was found. Report results;
	}
	location = binarySearcher.find(bosListByIP, ip, false);			//Name not found in BoSlist. Search for the IP instead;
	if(location > -1) {
		console.log("IP: \"" + name + ":" + ip + "\" = \"" + bosListByIP[location].name + ":" + bosListByIP[location].ip + "\" (BoS row: " + location + ").");
		return true;												//IP was found. Report results. This implies that the name was not found so we should add it to the list (NYI);
	}
	return false;
}

/**
 * (NYI) Not yet implemented. Should load illegal 'phrases' from file. Names containing the phrases shouldn't be allowed. (similar to banned words).
**/
function checkForIllegalName(name) {
	if(name==="InappropriateName") {
		console.log("NAME VIOLATION! " + name);
		return true;
	}
	else {
		return false;
	}
}

/**
 * This function returns true if the specified name is in the 'ignoreForNow' array.
**/
function isNameIgnored(name) {
	var index = ignoreForNow.indexOf(name);
	if(index > -1)
		return true;
	else
		return false;
}

/**
 * This function removes the specified name from the 'ignoreForNow' array.
**/
function removeNameFromIgnore(name) {
	var index = ignoreForNow.indexOf(name);
	if(index > -1)
		ignoreForNow.splice(index, 1);
	else
		return false;
}

/**
 * This function removes all names stored in the 'removeFromIgnoreArray' array from the 'ignoreForNow' array.
**/
function removeNamesFromIgnore() {
	for(var i=0;i<removeFromIgnoreArray.length;i++) {
		removeNameFromIgnore(removeFromIgnoreArray[i]);
	}
	removeFromIgnoreArray = [];
}

/**
 * This instruction was isolated into a function to allow it to be easily called via setTimeout();
 * It pushes a name onto the 'removeFromIgnoreArray' array.
**/
function pushToRemoveFromIgnoreArray(name) {
	removeFromIgnoreArray.push(name);
}

/**
 * This function uses the rcon connection to send the specified message to the server. 
 * The message will be displayed in the top left corner of each connected game-client (as part of the kill-list).
**/
function sendAllChatMessage(message, callBack) {
	console.log("Sending message: " + message);
	rcon.send('exec game.sayAll "' + message + '"', function(data){
		//console.log(data.toString());
		callBack();
	});
}

/**
 * This function handles sending a specified warning, directed to a specified player, to the server 
 * multiple times with a specified delay between warnings.
 *
 * @param name 					The name of the player being warned.
 * @param notifyMessage 		The warning message text.
 * @param i						The current message iteration (used to keep track of how many messages have been sent).
 * @param time_between_messages	The time to delay between sending each message.
 * @param number_messages		The number of messages to send.
**/
function sendWarnings(name, notifyMessage, i, time_between_messages, number_messages, callBack) {
	sendAllChatMessage("WARNING!!! " + name + " " + notifyMessage, function() {
		i = i + 1;
		if(i < number_messages) {
			setTimeout(sendWarnings, time_between_messages, name, notifyMessage, i, function() {
				callBack();
			});
		}
		else {
			setTimeout(callBack, time_between_messages);
		}
	});
}

/**
 * This function initializes the sendWarnings function with kick-specific parameters.
**/
function sendKickWarnings(name, notifyMessage, i, callBack) {
	sendWarnings(name, notifyMessage, i, settings.messages.TIME_BETWEEN_KICK_WARNINGS, settings.messages.NUMBER_KICK_WARNINGS, function() {
		callBack();
	});
}

/**
 * This function initializes the sendWarnings function with ban-specific parameters.
**/
function sendBoSWarnings(name, notifyMessage, i, callBack) {
	sendWarnings(name, notifyMessage, i, settings.messages.TIME_BETWEEN_BAN_WARNINGS, settings.messages.NUMBER_BOS_WARNINGS, function() {
		callBack();
	});
}

/**
 * Removes the player from the server (via kick). Sends warnings first if requested.
**/
function kickPlayer(ID, name, ip, notifyMessage) {
	if(settings.messages.WRITE_KICK_WARNINGS) {				//If we need to send warnings before kicking the player;
		setTimeout(sendKickWarnings, settings.messages.KICK_MESSAGE_DELAY, name, notifyMessage, 0, function() {	//Send the warnings;
			doKick(ID, name, ip, notifyMessage);			//Then kick the player;
		});
	}
	else {													//Otherwise ... ;
		doKick(ID, name, ip, notifyMessage);				//Just kick the player;
	}
}

/**
 * Removes the player from the server (via ban). Sends warnings first if requested.
**/
function banPlayer(ID, name, ip, notifyMessage) {
	if(settings.messages.WRITE_BOS_WARNINGS) {				//If we need to send warnings before banning the player;
		setTimeout(sendBoSWarnings, settings.messages.BOS_MESSAGE_DELAY, name, notifyMessage, 0, function() {	//Send the warnings;
			doBan(ID, name, ip, notifyMessage);				//Then ban the player;
		});
	}
	else {													//Otherwise ... ;
		doBan(ID, name, ip, notifyMessage);					//Just ban the player;
	}
}

/**
 * Continuing to remove the player from the server (via ban).
 * Displays the ban message in the server if requested.
**/
function doBan(ID, name, ip, notifyMessage) {
	if(settings.messages.WRITE_BOS_MESSAGE) {				//If we need to display the ban message before banning the player;
		sendAllChatMessage("BANNING!!! " + name + " " + notifyMessage, function() {	//Send the message;
			setTimeout(pureBan, settings.messages.TIME_AFTER_MESSAGE_BEFORE_ACTION, ID, name, ip);	//Wait the specified time, then ban the player;
		});
	}
	else {													//Otherwise ... ;
		pureBan(ID, name, ip);								//Just ban the player;
	}
}

/**
 * Function name is slightly missleading. This function is responsible for processing the
 * actual ban command, output to console, and removal of the players name from the ignore array.
 * Because admin.banPlayer doesn't remove the player from the server in all cases this function
 * first kicks the player then adds the players IP to the banned IP list.
**/
function pureBan(ID, name, ip) {
	rcon.send("exec admin.kickPlayer " + ID, function(data){		//admin.banPlayer doesn't kick while player is loading, which could result in multiple ban commands sent through rcon for the same ban;
		//console.log(data.toString());
		console.log("Player kicked: " + name + ":" + ip);
		rcon.send("exec admin.addAddressToBanList " + ip + " perm", function(data){	//Now add the IP to the banned IP list;
			//console.log(data.toString());
			console.log("IP added to ban list: " + name + ":" + ip);
			setTimeout(pushToRemoveFromIgnoreArray, settings.general.RCON_LAG_WAIT, name);	//Wait for the server to process the kick, then remove the players name from the ignore array;
		});
	});
}

/**
 * Continuing to remove the player from the server (via kick).
 * Displays the kick message in the server if requested.
**/
function doKick(ID, name, ip, notifyMessage) {
	if(settings.messages.WRITE_KICK_MESSAGE) {				//If we need to display the kick message before kicking the player;
		sendAllChatMessage("KICKING!!! " + name + " " + notifyMessage, function() {	//Send the message;
			setTimeout(pureKick, settings.messages.TIME_AFTER_MESSAGE_BEFORE_ACTION, ID, name, ip);	//Wait th especified time, then kick the player;
		});
	}
	else {													//Otherwise ... ;
		pureKick(ID, name, ip);								//Just kick the player;	
	}
}

/**
 * This function kicks the specified player and removes the players name from the ignore array.
**/
function pureKick(ID, name, ip) {
	rcon.send("exec admin.kickPlayer " + ID, function(data){		//Kick the player;
		//console.log(data.toString());
		console.log("Player kicked: " + name + ":" + ip);
		setTimeout(pushToRemoveFromIgnoreArray, settings.general.RCON_LAG_WAIT, name);	//Wait for the server to process the kick, then remove the players name from the ignore array;
	});
}