# sinon-mock-server

> A more elegant mock server based on sinon fake server

```bash
npm install sinon-mock-server --save-dev
```

## Example
```js
import mockServer from 'sinon-mock-server'
import myModule from 'my-module'
import chai from 'chai'
var expect = chai.expect

describe('api test', function() {
  var server
  var endpoint
  var fetchPromise
  beforeEach(function() {
    server = mockServer()
    endpoint = server.get('/api/books')
    fetchPromise = myModule.fetchAllBooks()
  })

  afterEach(function () {
    server.restore()
  })

  describe('when call successful', function() {
    var books = [{
      id: 1,
      title: 'Moby dick'
    }]

    beforeEach(function() {
      endpoint.resolve(200, books)
      return fetchPromise
    })

    it('exposes the books', function() {
      expect(mymodule.books).to.eql(books)
    })
  })

  describe('when server fails', function() {
    beforeEach(function() {
      endpoint.reject(500, {})
      return fetchPromise.catch(function () {
        //silence, fail is expected
      })
    })

    it('exposes the Error', function() {
      expect(mymodule.loadBooksFailed).to.eql(true)
    })
  })
})
```

## methods

### restore

server.restore()

restores the server

### verbs

The server will have methods for the following vergs: get, post, put, patch, delete, head, options which can be used in the following way:

`server.post(url, [requiredBody], [requiredHeaders])`

```js
server.post('/api/books', {
  bodyParam: 3
}, {
  'Content-Type': 'application/json'
})
```

For non standard HTTP verbs use `server.use(method, url, [requiredBody], [requiredHeaders])`

Url, requiredBody and requiredHeaders will all be wrapped in sinon.match

If you don't want this use `server.post.strict` instead. You can still use sinon matchers as you please on some params like this:

```js
server.post.strict(sinon.match('books'), {
  bodyParam: 3
}, {
  'Content-Type': sinon.match('application/json')
})
```

Url also supports regex matching:

```js
server.post(/books/)
```
