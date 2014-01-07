var util = require('util');
var events = require('events');

/**
 * The purpose of this file is to abstract all the BF2 specific
 * elements out of the main program. Ideally we should be able
 * to create a seperate interface for any other game (cod, bfbc,
 * minecraft, w/e), plug that interface into the main program,
 * and be able to manage it in a similar fashion.
**/
function bf2Wrapper(options) {
	$bf2Wrapper = this;
	var bf2 = require('./bf2rcon');
	this.rcon = new bf2.rcon(options);
	this.rcon.once("authed", function() {
		$bf2Wrapper.emit("ready");
	});
}
util.inherits(bf2Wrapper, events.EventEmitter);

/**
 * This function uses the rcon connection to send the specified message
 * to the server. The message will be displayed in the top left corner 
 * of each connected game-client (as part of the kill-list).
**/
bf2Wrapper.prototype.sendServerMessage = function(message, callBack) {
	console.log("Sending message: " + message);
	this.rcon.send('exec game.sayAll "' + message + '"', function(data){
		//console.log(data.toString());
		callBack(message);
	});
}

/**
 * This function returns a list of all connected and connecting players.
**/
bf2Wrapper.prototype.listPlayers = function(callBack) {
	this.rcon.send("exec admin.listPlayers", function(data) {		//Get all connected and connecting players;
		callBack(data);
	});
};

/**
 * This function converts the list returned from listPlayers into a 
 * JSON formatted array with each element containing 4 variables (id,
 * name, ip, and port).
**/
bf2Wrapper.prototype.listPlayersFormatted = function(callBack) {
	var usermatch = /Id: \s?([0-9]*) - (.*) is remote ip: ([0-9\.]*):([0-9]*)/g;
	var playerList = [];
	$bf2Wrapper.listPlayers(function(data) {
		data = data.toString();
		match = usermatch.exec(data);							//Parse out 1 player's info;
		while(match != null) {									//If player exists push to playerList;
			playerList.push({id: match[1],name: match[2],ip: match[3],port: match[4]});
			match = usermatch.exec(data);						//Parse out next player's info and repeat;
		}
		callBack(playerList);	
	});
};

/**
 * This function kicks the specified player.
**/
bf2Wrapper.prototype.kickPlayer = function(ID, name, ip, callBack) {
	this.rcon.send("exec admin.kickPlayer " + ID, function(data){		//Kick the player;
		//console.log(data.toString());
		console.log("Player kicked: " + name + ":" + ip);
		callBack();
	});
};

/**
 * This function bans the specified player.
 * Because admin.banPlayer doesn't remove the player from the server in all cases 
 * this function first kicks the player then adds the players IP to the banned IP list.
**/
bf2Wrapper.prototype.banPlayer = function(ID, name, ip, callBack) {
	this.rcon.send("exec admin.kickPlayer " + ID, function(data){		//admin.banPlayer doesn't kick while player is loading, which could result in multiple ban commands sent through rcon for the same ban;
		//console.log(data.toString());
		console.log("Player kicked: " + name + ":" + ip);
		$bf2Wrapper.rcon.send("exec admin.addAddressToBanList " + ip + " perm", function(data){	//Now add the IP to the banned IP list;
			//console.log(data.toString());
			console.log("IP added to ban list: " + name + ":" + ip);
			callBack();
		});
	});
}
exports.bf2Wrapper = bf2Wrapper;