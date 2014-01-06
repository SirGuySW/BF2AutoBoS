var net = require('net');
var crypto = require('crypto');
var util = require('util');
var events = require('events');
var mq = require('./messageQueue');
function rcon(options) {
	$rcon = this;
	var inUse = false;
	this.messageQueue = new mq.rconMessageQueue();
	this.client = net.connect(
		{
			host: options.host,
			port: options.port
		}, function() {
			console.log("RCON connection established!");
		}
	);
	this.client.on('data', function(data) {
		var sent = data.toString();
		if(sent.indexOf('### Digest seed: ') != -1) {
			var seed = sent.replace("### Digest seed: ", "").trim();
			//console.log("seed: " + seed);
			$rcon.client.write("login " + crypto.createHash('md5').update(seed + options.password).digest('hex') + "\n");
		}
		if(sent.indexOf('Authentication successful') != -1) {
			console.log("RCON connection authenticated!");
			$rcon.emit('authed');
		}
	});
}
util.inherits(rcon, events.EventEmitter);
/**
 * This function handles safely sending messages through the RCON
 * connection using a queue and ensuring each reply is received
 * before sending the next message.
**/
rcon.prototype.send = function(data, callback) {
	this.messageQueue.addMessage(data, callback);	//Add the new message to the queue;
	if(!this.inUse) {								//If the RCON interface is not currently in-use;
		this.inUse = true;							//Set busy;
		$rcon.processQueue(function() {				//Process the queue;
			//$rcon.inUse = false;					//Set busy false (moved into processQueue function);
		});
	}
}
/**
 * This function handles processing the queue by sending
 * each message in order until the queue is empty.
**/
rcon.prototype.processQueue = function(callback) {
	$rcon.messageQueue.getNextMessage(function(message) {
		$rcon.realSend(message.message, function(data) {
			message.callback(data);
			if($rcon.messageQueue.isEmpty()) {
				$rcon.inUse = false;
				callback();
			}
			else {
				$rcon.processQueue(callback);
			}
		});
	});
}
/**
 * Sends the specified message through the RCON connection.
 * Returns the reply to the callback function.
**/
rcon.prototype.realSend = function(data, callback) {
	this.client.write(data + "\n");
	this.client.once("data", function(data) {
		callback(data);
	});
}
exports.rcon = rcon;