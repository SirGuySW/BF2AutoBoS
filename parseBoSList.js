var settings = require('./settings');
var fs = require('fs');
var util = require('util');
var events = require('events');

/**
 * This 'class' is responsible for fetching and parsing the BoS List.
**/
function bosListReader() {
	$bosListReader = this;
	fs.readFile(settings.BoSList.path, settings.BoSList.encoding, function(err, data) {
		if(err) throw err;
		parseList(data);
	});
	
	/**
	 * This function parses the BoSList into an array with each element corresponding
	 * to a BoS name/IP pair. The BoSList is expected to be in the format 'Name'DELIM'IP'\r\n
	 * The following is an example BoSList using a delimiter of ":,:"
	 * Guy:,:192.168.0.1
	 * Bob:,:10.0.0.1
	 * George:,:172.16.0.1
	**/
	function parseList(list) {
		var bosList = [];
		list.replace("\r\n","\n").split("\n").forEach(function(row) {
			row = row.trim().split(settings.BoSList.delimiter);
			bosList.push({ name: row[0], ip: row[1]});
		});
		console.log("BoSList parsed!");
		$bosListReader.emit('BoSListConversionCompleted', bosList);
	}
}
util.inherits(bosListReader, events.EventEmitter);
exports.bosListReader = bosListReader;