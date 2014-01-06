/**
 * This class handles a simple queue of objects each object consisting 
 * of a message and callback function.
**/
function rconMessageQueue() {
	$rconMessageQueue = this;
	this.queue = [];
}
/**
 * Adds a message to the queue.
**/
rconMessageQueue.prototype.addMessage = function(message, callback) {
	this.queue.push({ message: message, callback: callback});
}
/**
 * Removes the next (the oldest) message from the queue and returns it
 * to the callback function.
**/
rconMessageQueue.prototype.getNextMessage = function(callback) {
	var tmp = this.queue.shift();
	callback(tmp);
}
/**
 * Returns true if the queue is empty. False otherwise.
**/
rconMessageQueue.prototype.isEmpty = function() {
	return this.queue.length === 0;
}
exports.rconMessageQueue = rconMessageQueue