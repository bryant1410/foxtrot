var util = require('util');
var EventEmitter = require('events').EventEmitter;
var crypto = require('crypto');
var SecureRandom = require('bitcore').SecureRandom;
var netstring = require('./netstring');

function AESSocket(transportSocket, key) {
  if(!(this instanceof AESSocket)) return new AESSocket(transportSocket, key);
  this.transport = transportSocket;
  this.key = key;
  this.parser = null;
};
util.inherits(AESSocket, EventEmitter);

AESSocket.prototype.bindParser = function(parser) {
  var self = this;
  self.parser = parser || self.parser || netstring.Parser();
  self.parser.on('data', function(data) {
    self.emit('data', self.decrypt(data));
  });
  self.parser.on('error', function(err) {
    self.transport.close();
    self.emit('error', err);
  });
};

AESSocket.prototype.write = function(message) {
  this.transport.write(netstring(this.encrypt(message)));
};

AESSocket.prototype.encrypt = function(message) {
  var iv = SecureRandom.getRandomBuffer(16);
  var cipheriv = crypto.createCipheriv('AES-256-CBC', this.key, iv);
  var a = cipheriv.update(message);
  var b = cipheriv.final();
  return Buffer.concat([iv, a, b], iv.length+a.length+b.length);
};

AESSocket.prototype.decrypt = function(message) {
  var iv = message.slice(0, 16);
  var decipheriv = crypto.createDecipheriv('AES-256-CBC', this.key, iv);
  var todecrypt = message.slice(16, message.length);
  var a = decipheriv.update(todecrypt);
  var b = decipheriv.final();
  return Buffer.concat([a, b], a.length + b.length);
};

module.exports = AESSocket;