"use strict";

// expand this with obj
Object.prototype.expand = function (obj) {
  var _this = this;

  Object.getOwnPropertyNames(obj).forEach(function (key) {
    if (!_this[key])
      _this[key] = obj[key];
  });
}

var crypto = require('crypto');

exports.PAC_PATH = './pac/proxy.pac';

// four factories to generate en/decryptors with algorithm and password
exports.Decryptor = function (algorithm, password) {
  return function (content) {
    var d = crypto.createDecipher(algorithm, password);
    return d.update(content, 'hex', 'binary') + d.final('binary');
  }
}

exports.Encryptor = function (algorithm, password) {
  return function (content) {
    var c = crypto.createCipher(algorithm, password);
    return c.update(content, 'binary', 'hex') + c.final('hex');
  }
}

exports.BufferDecryptor = function (algorithm, password) {
  return function (content) {
    var d = crypto.createDecipher(algorithm, password);
    return Buffer.concat([d.update(content), d.final()])
  }
}

exports.BufferEncryptor = function (algorithm, password) {
  return function (content) {
    var c = crypto.createCipher(algorithm, password);
    return Buffer.concat([c.update(content), c.final()]);
  }
}

// log with time tag
exports.log = function () {
  var arg = [(new Date()).toString() + ':'];
  var l = arguments.length;

  for (var i = 0; i < l; ++i)
    arg.push(arguments[i]);

  console.log.apply(console, arg);
}

exports.get_config = function () {
  var DEFAULT_CONFIG = require('./default_config.json');
  var config_file_path = process.argv.length > 2 ? process.argv[2] : null;
  var config = config_file_path ? require(config_file_path) : {};

  // Object.prototype.expand in common.js
  config.expand(DEFAULT_CONFIG);

  return config;
}
