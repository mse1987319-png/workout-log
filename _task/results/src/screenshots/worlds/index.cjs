'use strict'
// The worlds (data sets) scenes can ask for by name: world: 'manual'.
// Add yours here; build() returns { world, personas } with one fresh copy per call.
module.exports = {
  manual: require('./manual.cjs'),
}
