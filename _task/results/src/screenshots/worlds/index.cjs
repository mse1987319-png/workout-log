'use strict'
// The worlds (data sets) scenes can ask for by name: world: 'manual'.
// Add yours here; build(options) returns { world, personas } with one fresh copy per call.
// options always has `lang`; a set or a scene may add more (worldOptions).
module.exports = {
  manual: require('./manual.cjs'),
  demo: require('./demo.cjs'),
}
