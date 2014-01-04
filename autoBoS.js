var settings = require('./settings');
var bosReader = require('./parseBoSList');
var binarySearch = require('./binarySearch');
var bosListReader = new bosReader.bosListReader();	//Start BoSList read, parse, and sort;
var binarySearcher = new binarySearch.binarySearcher();	//Create this for searching the BoSList later;

var gameWrapper;//The interface for whichever game we're managing. Declared here (for global reference), defined below;
var bosListByName;
var bosListByIP;
var ignoreForNow = [];			//Names in this array are being warned/banned already. The normal loop should ignore them to prevent multiple warnings/kicks/bans for the same player;
var removeFromIgnoreArray = [];	//Async insurance: so we don't remove an ignored name in the middle of a 'check player names' loop (and possibly w/k/b them twice in rapid succession);

//Wait until the BoS list is read and parsed;
bosListReader.once("BoSListConversionCompleted", function(listByName, listByIP) {		//BoS list parsing finished;
	bosListByName = listByName;
	bosListByIP = listByIP;
	var gameWrapperFile = require('./bf2Wrapper');			//Load the file which contains the interface for the desired game;
	var options = {
		host: settings.rcon.HOST,
		port: settings.rcon.PORT,
		password: settings.rcon.PASSWORD
	}
	gameWrapper = new gameWrapperFile.bf2Wrapper(options);	//init the interface itself;
	gameWrapper.once("ready", autoBoSLoop);			//Interface ready. Start the main loop;
});

/**
 * The main loop of the program. This function grabs the online player list, checks
 * that list against the bos list, removes any BoS player found, then sets a timer
 * to repeat after the specified time. Illegal name checking coming soon.
**/
function autoBoSLoop() {
	gameWrapper.listPlayersFormatted(function(playerList) {		//Get player list from server;
		playerList.forEach(function(row) {
			if(!isNameIgnored(row.name)) {						//If this player is already being handled by an earlier check skip it so we don't w/k/b it twice;
				if(checkAgainstBoSList(row.name, row.ip)) {		//Check if this player is on the BoS List;
					ignoreForNow.push(row.name);				//Mark this player as 'being handled' so we can ignore it on the next check (if it's still on the server by then);
					banPlayer(row.id, row.name, row.ip, settings.messages.BOS_BAN_NOTICE);	//If this player is BoS remove it from the server;
				}
			}
		});
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
	gameWrapper.sendServerMessage("WARNING!!! " + name + " " + notifyMessage, function() {
		i = i + 1;
		if(i < number_messages) {
			setTimeout(sendWarnings, time_between_messages, name, notifyMessage, i, time_between_messages, number_messages, function() {
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
		gameWrapper.sendServerMessage("BANNING!!! " + name + " " + notifyMessage, function() {	//Send the message;
			setTimeout(pureBan, settings.messages.TIME_AFTER_MESSAGE_BEFORE_ACTION, ID, name, ip);	//Wait the specified time, then ban the player;
		});
	}
	else {													//Otherwise ... ;
		pureBan(ID, name, ip);								//Just ban the player;
	}
}

/**
 * This function bans the specified player and removes the players name from the ignore array.
 * Because admin.banPlayer doesn't remove the player from the server in all cases 
 * this function first kicks the player then adds the players IP to the banned IP list.
**/
function pureBan(ID, name, ip) {
	gameWrapper.banPlayer(ID, name, ip, function() {
		setTimeout(pushToRemoveFromIgnoreArray, settings.general.RCON_LAG_WAIT, name);	//Wait for the server to process the kick, then remove the players name from the ignore array;
	});
}

/**
 * Continuing to remove the player from the server (via kick).
 * Displays the kick message in the server if requested.
**/
function doKick(ID, name, ip, notifyMessage) {
	if(settings.messages.WRITE_KICK_MESSAGE) {				//If we need to display the kick message before kicking the player;
		gameWrapper.sendServerMessage("KICKING!!! " + name + " " + notifyMessage, function() {	//Send the message;
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
	gameWrapper.kickPlayer(ID, name, ip, function() {
		setTimeout(pushToRemoveFromIgnoreArray, settings.general.RCON_LAG_WAIT, name);	//Wait for the server to process the kick, then remove the players name from the ignore array;
	});
}