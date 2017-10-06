var sinon = require('sinon')
var isEqual = require('lodash/isEqual')
var every = require('lodash/every')

function matchesMethod(base, compare) {
  if (base === '*') {
    return true
  } else {
    return base.toLowerCase() === compare.toLowerCase()
  }
}

function matchesUrl(base, compare) {
  if (base && base.test) {
    return base.test(compare)
  } else {
    return base.toLowerCase() === compare.toLowerCase()
  }
}

function matchesBody(base, compare) {
  if (base === undefined || base === null) {
    return true
  } else if (isSinonMatch(base)) {
    return base.test(compare)
  } else {
    return isEqual(base, compare)
  }
}

function isSinonMatch(val) {
  return isFunction(val && val.test)
}

function isFunction(val) {
  return typeof val === 'function'
}

function normalizeHeaders(headers) {
  var newHeaders = {}

  for (var prop in headers) {
    if (headers.hasOwnProperty(prop)) {
      newHeaders[prop.toLowerCase()] = headers[prop]
    }
  }

  return newHeaders
}

function matchesHeaders(base, compare) {
  if (base === undefined || base === null) {
    return true
  } else if (isSinonMatch(base)) {
    return base.test(compare)
  } else {
    return isEqual(base, compare)
  }
}

function tryStringifyJSON(val) {
  try {
    return JSON.stringify(val)
  } catch (e) {}
}

function isObjectOrArray(val) {
  return Array.isArray(val) || typeof val === 'object'
}

function isJSONRequest(xhr) {
  var header = xhr.requestHeaders['Content-Type'] || ''
  return header.indexOf('application/json') !== -1
}

function createServer() {
  var server = sinon.fakeServer.create()
  var endpoints = []

  var origHandle = server.handleRequest
  server.handleRequest = function(xhr) {
    if (isJSONRequest(xhr)) {
      xhr.requestBody = JSON.parse(xhr.requestBody)
    }

    var endpoint = findEndpoint(xhr)

    if (endpoint) {
      endpoint.stub(xhr.method, xhr.url, xhr.requestBody, xhr.requestHeaders)
    }

    var result = origHandle.apply(this, [].slice.call(arguments))

    if (endpoint && endpoint.hasResponded) {
      endpoint.respond(xhr)
    }

    return result
  }

  server.respondWith(function(xhr) {
    var endpoint = findEndpoint(xhr)
    var prefix = xhr.method + ' ' + xhr.url + ': '

    if (endpoint) {
      if (endpoint.respond) {
        endpoint.respond(xhr)
      } else {
        throw new Error(prefix + 'Server respond was called but endpoint have no defined response. Call either resolve or reject.')
      }
    } else {
      xhr.respond(404, {}, prefix + 'No mock endpoint defined for this url.')
    }
  })

  function findEndpoint(xhr) {
    var matchingEndpoints = endpoints.filter(function(endpoint) {
      var matchMethod = matchesMethod(endpoint.method, xhr.method)
      var matchUrl = matchesUrl(endpoint.url, xhr.url)
      var matchBody = matchesBody(endpoint.body, xhr.requestBody)
      var matchHeaders = matchesHeaders(endpoint.headers, xhr.requestHeaders)
      return matchMethod && matchUrl && matchBody && matchHeaders
    })

    return matchingEndpoints[0]
  }

  function use(method, url, body, requiredHeaders) {
    method = method.toUpperCase()
    requiredHeaders = normalizeHeaders(requiredHeaders)
    var stub = sinon.stub()

    var headerMatcher = sinon.match(function(value) {
      var incomingHeaders = normalizeHeaders(value)
      return every(requiredHeaders, function(requiredVal, name) {
        if (isSinonMatch(requiredVal)) {
          return requiredVal.test(incomingHeaders[name])
        } else {
          return requiredVal === incomingHeaders[name]
        }
      })
    }, 'Headers dont match.')

    var endpoint = {
      method: method,
      url: url,
      body: body,
      headers: headerMatcher,
      stub: stub,
      hasResponded: false
    }

    endpoints.push(endpoint)

    function resolveFactory(defaultStatusCode) {
      return function(statusCode, responsebody, headers) {
        headers = normalizeHeaders(headers || {})
        endpoint.respond = function(xhr) {
          if (isObjectOrArray(responsebody)) {
            responsebody = tryStringifyJSON(responsebody)
            // stringify went ok, set json response header
            if (responsebody && !headers['content-type']) {
              headers['content-type'] = 'application/json'
            }
          }
          xhr.respond(statusCode, headers, responsebody)
        }

        server.respond()
        endpoint.hasResponded = true
        return stub
      }
    }

    stub.resolve = resolveFactory(200)
    stub.reject = resolveFactory(500)

    return stub
  }

  var methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']

  methods.forEach(function(method) {
    server[method] = function(url, body, headers) {
      return use(method, url, body, headers)
    }
  })

  server.use = use

  return server
}

module.exports = {
  createServer: createServer
}
