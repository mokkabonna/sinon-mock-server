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
      endpoint.resolves(200, books)
      return fetchPromise
    })

    it('exposes the books', function() {
      expect(mymodule.books).to.eql(books)
    })
  })

  describe('when server fails', function() {
    beforeEach(function() {
      endpoint.rejects(500, {})
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

The server will have methods for the following verbs: get, post, put, patch, delete, head, options which can be used in the following way:

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

These methods will return a sinon stub that you can perform normal sinon assertions on, like:

```js
var endpoint = server.post('/books').resolves({})
mymodule.createBook('new book').then(function () {
  sinon.assert.calledOnce(endpoint)
  sinon.assert.calledWithMatch(endpoint, 'POST', '/books', {
    title: 'new Book'
  }, {
    'accept': sinon.match('json')
  })
})
```

The stub is called like this:

`stub(method, url, requestBody, requestHeaders)`

Headers names are normalized (lowercased) before being called.

The stub also have the methods `resolves` and `rejects` on them that you can use to define success and failure responses.

They take these parameters:

```js
resolves(responseBody) // default status 200
resolves(responseBody, responseHeaders) // default status 200
resolves(statusCode, responseBody)
resolves(statusCode, responseBody, responseHeaders)

// same with rejects but default status is 500
```

If the body is an array or an object it will automatically be serialized to JSON and the header `content-type: application/json; charset=utf-8` will be set, unless the content-type header is already present in the responseHeaders.

For incoming requests the request body is parsed to JSON if the content-type in the request headers contains `application/json`.


## Contributing

Create tests for new functionality and follow the eslint rules.

## License

MIT © [Martin Hansen](http://martinhansen.com)
