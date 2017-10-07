var mockServer = require('../../lib')
var chai = require('chai')
var axios = require('axios')
var sinon = require('sinon')
var expect = chai.expect

describe('createServer', function() {
  var server
  beforeEach(function() {
    server = mockServer()
  })

  afterEach(function() {
    server.restore()
  })

  it('supports any method', function() {
    server.any('/').resolves(200, {
      test: 5
    })

    return axios.get('/foo').then(function(response) {
      expect(response.data).to.eql({
        test: 5
      })
    })
  })

  it('supports null body as sinon.match.any', function() {
    server.any('/', null, {
      accept: sinon.match('json')
    }).resolves(200, {
      test: 5
    })

    return axios.post('/foo', {
      supplied: true
    }).then(function(response) {
      expect(response.data).to.eql({
        test: 5
      })
    })
  })

  it('supports strict matching', function() {
    server.any.strict('/').resolves(200, {
      test: 5
    })

    var stub = sinon.stub()
    var catchStub = sinon.stub()

    return axios.get('/not registered').then(stub).catch(catchStub).then(function() {
      sinon.assert.notCalled(stub)
      sinon.assert.calledOnce(catchStub)
    })
  })

  it('supports matching on regexp', function() {
    server.use('*', /.*/).resolves(200, {
      test: 5
    })

    return axios.get('/foo').then(function(response) {
      expect(response.data).to.eql({
        test: 5
      })
    })
  })

  it('maches in correct order, first register, first respond', function() {
    server.use('*', /.*/).resolves(200, {
      test: 5
    })

    server.use('*', /.*/).resolves(200, {
      test: 7
    })

    return axios.get('/foo').then(function(response) {
      expect(response.data).to.eql({
        test: 5
      })
    })
  })

  it('works with query params', function() {
    server.use('*', '/test?foo=3').resolves(200, {
      test: 7
    })

    return axios.get('/test?foo=3').then(function(response) {
      expect(response.data).to.eql({
        test: 7
      })
    })
  })

  describe('resolves', function() {
    it('supports body only', function() {
      var body = {
        test: 7
      }
      server.get('/').rejects(body)

      var stub = sinon.stub()

      return axios.get('/').catch(function(err) {
        stub()
        return err.response
      }).then(function(response) {
        sinon.assert.calledOnce(stub)
        expect(response.status).to.eql(500)
        expect(response.data).to.eql(body)
        expect(response.headers).to.eql({
          'content-type': 'application/json; charset=utf-8'
        })
      })
    })
  })

  describe('resolves', function() {
    it('supports body only', function() {
      var body = {
        test: 7
      }
      server.get('/').resolves(body)

      return axios.get('/').then(function(response) {
        expect(response.status).to.eql(200)
        expect(response.data).to.eql(body)
        expect(response.headers).to.eql({
          'content-type': 'application/json; charset=utf-8'
        })
      })
    })

    it('supports body and headers only', function() {
      var body = {
        test: 7
      }
      server.get('/').resolves(body, {
        'x-meta': 'metainfo'
      })

      return axios.get('/').then(function(response) {
        expect(response.status).to.eql(200)
        expect(response.data).to.eql(body)
        expect(response.headers).to.eql({
          'x-meta': 'metainfo',
          'content-type': 'application/json; charset=utf-8'
        })
      })
    })

    it('supports status and body', function() {
      var body = {
        test: 7
      }
      server.get('/').resolves(201, body)

      return axios.get('/').then(function(response) {
        expect(response.status).to.eql(201)
        expect(response.data).to.eql(body)
        expect(response.headers).to.eql({
          'content-type': 'application/json; charset=utf-8'
        })
      })
    })

    it('supports status, body and headers', function() {
      var body = {
        test: 7
      }
      server.get('/').resolves(204, body, {
        'x-meta': 'metainfo'
      })

      return axios.get('/').then(function(response) {
        expect(response.status).to.eql(204)
        expect(response.data).to.eql(body)
        expect(response.headers).to.eql({
          'x-meta': 'metainfo',
          'content-type': 'application/json; charset=utf-8'
        })
      })
    })
  })

  describe('get', function() {
    it('registers a handler for a GET request', function() {
      server.get('/api/test').resolves(200, {
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
      server.get('/api/test').resolves(200, {
        test: 5
      })

      return axios.get('/api/test').then(function(response) {
        expect(response.headers['content-type']).to.eql('application/json; charset=utf-8')
      })
    })

    it('does not set content-type json if not object', function() {
      server.get('/api/test').resolves(200, 'some string')

      return axios.get('/api/test').then(function(response) {
        expect(response.data).to.eql('some string')
        expect(response.headers['content-type']).to.eql(undefined)
      })
    })

    it('does not set content-type json if content type set explicit', function() {
      server.get('/api/test').resolves(200, {}, {
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
      }).resolves(201, {})

      return axios.post('/api/test', {}).then(function(response) {
        expect(response.data).to.eql({})
      })
    })
  })

  describe('post body', function() {
    it('matches incoming body', function() {
      server.post('/api/test', {
        requiredBodyParam: 3
      }).resolves(201, {})

      return axios.post('/api/test', {
        requiredBodyParam: 3
      }).then(function(response) {
        expect(response.data).to.eql({})
      })
    })

    it('matches strictly incoming body as string', function() {
      server.post('/api/test', 'somebody').resolves(201, {})

      var stub = sinon.stub()

      return axios.post('/api/test', 'suppliedbody').catch(function(err) {
        expect(err.message).to.match(/Required:.+somebody/)
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
      server.post('/api/test', requiredBody).resolves(201, {})

      var stub = sinon.stub()

      return axios.post('/api/test', suppliedBody).catch(function(err) {
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
      var endpoint = server.get('/api/test').resolves(201, {})

      axios.get('/api/test')

      setTimeout(function() {
        sinon.assert.calledOnce(endpoint)
        done()
      }, 1)
    })

    it('support sinon matchers on body', function() {
      server.post('/api/test', sinon.match({
        requiredBodyParam: 3
      })).resolves(201, {})

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
