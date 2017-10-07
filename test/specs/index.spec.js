var mockServer = require('../../lib')
var chai = require('chai')
var axios = require('axios')
var sinon = require('sinon')
var expect = chai.expect

describe('createServer', function() {
  var server
  beforeEach(function() {
    server = mockServer.createServer()
  })

  afterEach(function() {
    server.restore()
  })

  it('supports matching on regexp', function() {
    server.use('*', /.*/).resolve(200, {
      test: 5
    })

    return axios.get('/foo').then(function(response) {
      expect(response.data).to.eql({
        test: 5
      })
    })
  })

  it('maches in correct order, first register, first respond', function() {
    server.use('*', /.*/).resolve(200, {
      test: 5
    })

    server.use('*', /.*/).resolve(200, {
      test: 7
    })

    return axios.get('/foo').then(function(response) {
      expect(response.data).to.eql({
        test: 5
      })
    })
  })

  it('works with query params', function() {
    server.use('*', '/test?foo=3').resolve(200, {
      test: 7
    })

    return axios.get('/test?foo=3').then(function(response) {
      expect(response.data).to.eql({
        test: 7
      })
    })
  })

  describe('get', function() {
    it('registers a handler for a GET request', function() {
      server.get('/api/test').resolve(200, {
        test: 5
      })

      return axios.get('/api/test').then(function(response) {
        expect(response.status).to.eql(200)
        expect(response.data).to.eql({
          test: 5
        })
      })
    })

    it('sets json content type header if json', function() {
      server.get('/api/test').resolve(200, {
        test: 5
      })

      return axios.get('/api/test').then(function(response) {
        expect(response.headers['content-type']).to.eql('application/json')
      })
    })

    it('does not set content-type json if not object', function() {
      server.get('/api/test').resolve(200, 'some string')

      return axios.get('/api/test').then(function(response) {
        expect(response.data).to.eql('some string')
        expect(response.headers['content-type']).to.eql(undefined)
      })
    })

    it('does not set content-type json if content type set explicit', function() {
      server.get('/api/test').resolve(200, {}, {
        'content-type': 'foo'
      })

      return axios.get('/api/test').then(function(response) {
        expect(response.headers['content-type']).to.eql('foo')
      })
    })
  })

  describe('post headers', function() {
    it('supports sinon matchers', function() {
      server.post('/api/test', null, {
        accept: sinon.match('json'),
        'content-type': sinon.match('application/json')
      }).resolve(201, {})

      return axios.post('/api/test', {}).then(function(response) {
        expect(response.data).to.eql({})
      })
    })
  })

  describe('post body', function() {
    it('matches incoming body', function() {
      server.post('/api/test', {
        requiredBodyParam: 3
      }).resolve(201, {})

      return axios.post('/api/test', {
        requiredBodyParam: 3
      }).then(function(response) {
        expect(response.data).to.eql({})
      })
    })

    it('matches strictly incoming body as string', function() {
      server.post('/api/test', 'somebody').resolve(201, {})

      var stub = sinon.stub()

      return axios.post('/api/test', 'suppliedbody').catch(function (err) {
        expect(err.message).to.match(/Required:somebody/)
        expect(err.message).to.match(/Actual:suppliedbody/)
        stub()
      }).then(function() {
        sinon.assert.calledOnce(stub)
      })
    })

    it('matches strictly incoming body as json', function() {
      var requiredBody = {
        suppliedParam: 3,
        requiredBodyParam: 3
      }
      var suppliedBody = {
        suppliedParam: 3
      }
      server.post('/api/test', requiredBody).resolve(201, {})

      var stub = sinon.stub()

      return axios.post('/api/test', suppliedBody).catch(function (err) {
        expect(err.message).to.match(/Required:/)
        expect(err.message).to.match(/suppliedParam/)
        expect(err.message).to.match(/requiredBodyParam/)
        expect(err.message).to.match(/Actual:/)
        stub()
      }).then(function() {
        sinon.assert.calledOnce(stub)
      })
    })

    it('call stub async', function(done) {
      var endpoint = server.get('/api/test').resolve(201, {})

      axios.get('/api/test')

      setTimeout(function() {
        sinon.assert.calledOnce(endpoint)
        done()
      }, 1)
    })

    it('support sinon matchers on body', function() {
      server.post('/api/test', sinon.match({
        requiredBodyParam: 3
      })).resolve(201, {})

      return axios.post('/api/test', {
        requiredBodyParam: 3,
        additionalParam: 5
      }).then(function(response) {
        expect(response.data).to.eql({})
      })
    })
  })

  it('should no longer be in the queue after autoresponded', function() {

  })
})
