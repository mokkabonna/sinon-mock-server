module.exports = function(config) {
  config.set({
    basePath: '../',
    files: [
      'test/index.js'
    ],
    browsers: ['PhantomJS'],
    frameworks: ['mocha', 'sinon-chai'],
    reporters: ['spec', 'coverage'],
    preprocessors: {
      'test/index.js': ['webpack', 'coverage']
    },
    coverageReporter: {
      type: 'lcov',
      dir: 'coverage/'
    }
  })
}
