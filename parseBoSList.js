var settings = require('./settings');
var fs = require('fs');
var util = require('util');
var events = require('events');

/**
 * This 'class' is responsible for fetching and parsing the BoS List.
**/
function bosListReader() {
	$bosListReader = this;
	fs.readFile(settings.BoSList.PATH, settings.BoSList.ENCODING, function(err, data) {
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
			row = row.trim().split(settings.BoSList.DELIMITER);
			bosList.push({ name: row[0], ip: row[1]});
		});
		bosList.sort(function(a,b) {			//Sorts the boslist in lexi order by BoS name;
			if(a.name > b.name) return 1;
			if(a.name < b.name) return -1;
			return 0;
		});
		var bosListByIP = bosList.slice(0);		//Clone the bolist;	
		bosListByIP.sort(function(a,b) {		//Sorts this clone in lexi order by BoS IP;
			if(a.ip > b.ip) return 1;
			if(a.ip < b.ip) return -1;
			return 0;
		});
		console.log("BoSList parsed! BoS Records: " + bosList.length);
		$bosListReader.emit('BoSListConversionCompleted', bosList, bosListByIP);
	}
}
util.inherits(bosListReader, events.EventEmitter);
exports.bosListReader = bosListReader;