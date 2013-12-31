function binarySearcher() {
	$binarySearcher = this;
}
/**
 * If the searchStr is in the source array this function returns the index
 * location of the matching element.
 *
 * @param source The array containing the elements to search through.
 * @param searchStr The object to search for.
 * @param searchByName If true, this function searches by source.name.
 * 					   If false this function searches by source.ip.
**/
binarySearcher.prototype.find = function(source, searchStr, searchByName) {
	if(searchByName) {
		return $binarySearcher.findNameIn(source, searchStr, 0, source.length);
	}
	else {
		return $binarySearcher.findIPIn(source, searchStr, 0, source.length);
	}
}

/**
 * The below two functions are split up to save a few instructions per check.
**/

/**
 * The recursive heart of the binary search.
 * Details here: http://en.wikipedia.org/wiki/Binary_search_algorithm
**/
binarySearcher.prototype.findNameIn = function(source, searchStr, min, max) {
	if(max < min) {
		return -1;
	}
	else {
		var mid = Math.floor((max - min)/2) + min;
		
		if(source[mid].name > searchStr) {
			return $binarySearcher.findNameIn(source, searchStr, min, mid-1);
		}
		else {
			if(source[mid].name < searchStr) {
				return $binarySearcher.findNameIn(source, searchStr, mid+1, max);
			}
			else {
				return mid;
			}
		}
	}
}

/**
 * The recursive heart of the binary search.
 * Details here: http://en.wikipedia.org/wiki/Binary_search_algorithm
**/
binarySearcher.prototype.findIPIn = function(source, searchStr, min, max) {
	if(max < min) {
		return -1;
	}
	else {
		var mid = Math.floor((max - min)/2) + min;
		
		if(source[mid].ip > searchStr) {
			return $binarySearcher.findIPIn(source, searchStr, min, mid-1);
		}
		else {
			if(source[mid].ip < searchStr) {
				return $binarySearcher.findIPIn(source, searchStr, mid+1, max);
			}
			else {
				return mid;
			}
		}
	}
}
exports.binarySearcher = binarySearcher;