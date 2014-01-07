var settings = {}

settings.general = {};
settings.general.LOOP_WAIT_TIME = 10000;			//Time in between each check (in miliseconds);
settings.general.RCON_LAG_WAIT = 5000;				//The time it takes for the server to complete an action (kick/ban) from when we requested it through RCON (it's best to overestimate this);
settings.general.CHECK_FOR_BAD_IPS = true;			//Should we ban players for sharing an IP with a BoS player;

settings.rcon = {};
settings.rcon.HOST = "127.0.0.1";
settings.rcon.PORT = 1234;
settings.rcon.PASSWORD = "*password*";

settings.BoSList = {};
settings.BoSList.PATH = "BoSList.txt";	//Relative path to the BoSList;
settings.BoSList.ENCODING = "utf8";		//Encoding for the BoSList;
settings.BoSList.DELIMITER = ":,:";		//The delimiter seperating each Name:IP combination;

settings.messages = {};
settings.messages.WRITE_KICK_WARNINGS = false;				//Should we display warnings before kicking (ie: "WARNING!!! <PlayerName> |ccc| YOU MUST CHANGE YOUR NAME!!!");
	settings.messages.KICK_MESSAGE_DELAY = 1000;			//Time to wait before sending warning messages for kicks (in miliseconds)(this will also delay the kick);
	settings.messages.TIME_BETWEEN_KICK_WARNINGS = 1250;	//Time to wait in between sending each message (in miliseconds)(this will also delay the kick);
	settings.messages.NUMBER_KICK_WARNINGS = 3;				//How many kick warnings should be sent per kick?
settings.messages.WRITE_KICK_MESSAGE = false;				//Should we display the kick (ie: "KICKING!!! <PlayerName> |ccc| YOU MUST CHANGE YOUR NAME!!!");

settings.messages.WRITE_BOS_WARNINGS = false;				//Should we display warnings before banning for BoS (ie: "WARNING!!! <PlayerName> |ccc| YOU ARE NOT WELCOME ON NRNS SERVERS!!!");
	settings.messages.BOS_MESSAGE_DELAY = 1000;				//Time to wait before sending warning messages for BoS bans (in miliseconds)(this will also delay the ban);
	settings.messages.TIME_BETWEEN_BAN_WARNINGS = 1250;		//Time to wait in between sending each message (in miliseconds)(this will also delay the ban);
	settings.messages.NUMBER_BOS_WARNINGS = 3;				//How many BoS warnings should be sent per ban?
settings.messages.WRITE_BOS_MESSAGE = false;				//Should we display the ban (ie: "BANNING!!! <PlayerName> |ccc| YOU ARE NOT WELCOME ON NRNS SERVERS!!!");

settings.messages.TIME_AFTER_MESSAGE_BEFORE_ACTION = 3000;	//Gives them a chance to read what's about to happen to them (kick/ban) before they loose connection;

settings.messages.BOS_BAN_NOTICE = "|ccc| **YOU HAVE REPEATEDLY BROKEN OUR RULES AND ARE NOT WELCOME ON OUR SERVERS!**";

module.exports = settings;