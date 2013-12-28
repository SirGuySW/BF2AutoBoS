var settings = {}

settings.rcon = {};
settings.BoSList = {};

settings.loopWaitTime = 10000;			//Time in between each check (in miliseconds);

settings.rcon.host = "127.0.0.1";
settings.rcon.port = 1234;
settings.rcon.password = "*password*";

settings.BoSList.path = "BoSList.txt";	//Relative path to the BoSList;
settings.BoSList.encoding = "utf8";		//Encoding for the BoSList;
settings.BoSList.delimiter = ":,:";		//The delimiter seperating each Name:IP combination;


module.exports = settings;