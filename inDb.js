/*!
 * inDB for file system.
 *
 * @version 1.0.0 beta
 *
 * @desktop_browser_support IE 9+, Firefox 15+, Chrome 23+, Opera 15+.
 * @mobile_browser_support Chrome for Android, Firefox for Android, Opera for Android, IE10 for WP8, IOS 8+.
 *
 * @author Valentine Yakimenko, Arthem Zharuk.
 *
 * @licenced on MIT.
 */

/**
 * Crossbrowser indexed db and Transactions.
 */
var indexedDB = window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB,
	IDBTransaction  = window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction,
	IDBKeyRange  = window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;

"use strict";
var inDB = function ( dbconfig ){

	var db;

	/**
	 * Used to keep track of which view is displayed to avoid to uselessly reload it
	 */
	var current_view_pub_key;

	/**
	 * Default config.
	 *
	 * @type {{name: string, storeName: string}}
	 */
	var db_default = {
		name: 'TEST',
		storeName: 'TEST',
		version: 1,
		keyPath: 'id',
		autoIncrement: true,
		indexes: [
			{
				key: 'biblioid',
				name: 'biblioid',
				unique: true
			},
			{
				key: 'name',
				name: 'name',
				unique: false
			},
			{
				key: 'somevar',
				name: 'somevar',
				unique: true
			}
		]
	};


	/**
	 * @settings - Configuration for inDB.
	 */
	this.config = dbconfig;
};

inDB.prototype.log = function (err){
	console.log(err);
};

inDB.prototype.openDB = function (callback) {
	var _this = this;
	var req = indexedDB.open(this.config.name, this.config.version);
	req.onsuccess = function (evt) {
		/**
		 * Better use "this" than "req" to get the result to avoid problems with
		 * garbage collection.
		 * db = req.result;
		 * @type {Object}
		 */
		_this.db = this.result;

		return callback();
	};
	req.onerror = function (evt) {
		_this.log("openDb:", evt.target.errorCode);
	};

	req.onupgradeneeded = function (evt) {
		var store = evt.currentTarget.result.createObjectStore(
			_this.config.storeName, { keyPath: _this.config.keyPath, autoIncrement: _this.config.autoIncrement });

		_this.config.indexes.forEach(function (e) {
			store.createIndex(e.key, e.name, { unique: e.unique})
		});
	};
};

/**
 * @param {string} store_name
 * @param {string} mode either "readonly" or "readwrite"
 */
inDB.prototype.getObjectStore = function (store_name, mode) {
	var tx = this.db.transaction(store_name, mode);
	return tx.objectStore(store_name);
};

/**
 * @param {object} publication
 */
inDB.prototype.addPublication = function (publication) {
	var _this = this;

	var store = this.getObjectStore(this.config.storeName, 'readwrite');
	var req;
	try {
		req = store.add(publication);
	} catch (e) {
		if (e.name == 'DataCloneError')
			throw e;
	}
	req.onsuccess = function (evt) {
		_this.log("Insertion in DB successful");
	};
	req.onerror = function() {
		_this.log("addPublication error", this.error);
	};
};

/**
 * @param {number} key
 * @param {IDBObjectStore=} store
 */
inDB.prototype.deletePublication = function (key, store) {
	var _this = this;
	this.log("deletePublication:", arguments);

	if (typeof store == 'undefined')
		store = this.getObjectStore(this.config.storeName, 'readwrite');

	// As per spec http://www.w3.org/TR/IndexedDB/#object-store-deletion-operation
	// the result of the Object Store Deletion Operation algorithm is
	// undefined, so it's not possible to know if some records were actually
	// deleted by looking at the request result.
	var req = store.get(key);
	req.onsuccess = function(evt) {
		var record = evt.target.result;
		_this.log("record:", record);
		if (typeof record == 'undefined') {
			return;
		}
		// Warning: The exact same key used for creation needs to be passed for
		// the deletion. If the key was a Number for creation, then it needs to
		// be a Number for deletion.
		req = store.delete(key);
		req.onsuccess = function(evt) {
			_this.log("evt:", evt);
			_this.log("evt.target:", evt.target);
			_this.log("evt.target.result:", evt.target.result);
			_this.log("delete successful");
		};
		req.onerror = function (evt) {
			_this.log("deletePublication:", evt.target.errorCode);
		};
	};
	req.onerror = function (evt) {
		_this.log("deletePublication:", evt.target.errorCode);
	};
};

/**
 * @param {string} index
 * @param {string} name
 */
inDB.prototype.deletePublicationFromIndex = function (index, name) {
	var _this = this;
	console.log("deletePublication:", arguments);
	var store = this.getObjectStore(this.config.storeName, 'readwrite');
	var req = store.index(index);
	req.get(name).onsuccess = function(evt) {
		if (typeof evt.target.result == 'undefined') {
			return;
		}
		_this.deletePublication(evt.target.result.id, store);
	};
	req.onerror = function (evt) {
		console.error("deletePublicationFromIndex:", evt.target.errorCode);
	};
};

inDB.prototype.clearObjectStore = function() {
	var _this = this;
	var store = this.getObjectStore(this.config.storeName, 'readwrite');
	var req = store.clear();
	req.onsuccess = function(evt) {

	};
	req.onerror = function (evt) {
		_this.log("clearObjectStore:", evt.target.errorCode);
	};
};

inDB.prototype.getPublicationFromIndex = function (index, name) {
	var _this = this;
	var store = this.getObjectStore(this.config.storeName, 'readwrite');
	var req = store.index(index);
	req.get(name).onsuccess = function(evt) {
		if (typeof evt.target.result == 'undefined') {
			return;
		}
		return evt.target.result
	};
	req.onerror = function (evt) {
		_this.log("getPublicationFromIndex:", evt.target.errorCode);
	};
};