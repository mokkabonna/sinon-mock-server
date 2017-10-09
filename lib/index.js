var sinon = require('sinon')
var isEqual = require('lodash/isEqual')
var every = require('lodash/every')
var reduce = require('lodash/reduce')
var isNumber = require('lodash/isNumber')

function matchesMethod(base, compare) {
  if (base === '*') {
    return true
  } else if (isSinonMatch(base)) {
    return base.test(compare)
  } else {
    return base.toLowerCase() === compare.toLowerCase()
  }
}

function matchesUrl(base, compare) {
  if (isSinonMatch(base)) {
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

function createBodyMatcher(val) {
  if (val === null || val === undefined) {
    return sinon.match.any
  } else {
    return sinon.match(val)
  }
}

function createHeaderMatcher(requiredHeaders) {
  return sinon.match(function(value) {
    var incomingHeaders = normalizeHeaders(value)
    return every(requiredHeaders, function(requiredVal, name) {
      if (isSinonMatch(requiredVal)) {
        return requiredVal.test(incomingHeaders[name])
      } else {
        return requiredVal === incomingHeaders[name]
      }
    })
  }, JSON.stringify(requiredHeaders, null, 2))
}

function printMatcher(matcher) {
  var obj = JSON.parse(matcher.message)
  var result = reduce(obj, function(all, val, name) {
    if (val && val.message) {
      all[name] = val.message
    } else {
      all[name] = val
    }

    return all
  }, {})

  return JSON.stringify(result, null, 2)
}

function getPrefix(xhr) {
  return xhr.method + ' ' + xhr.url + ': '
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
  var server = {}
  var sinonServer = sinon.fakeServer.create()
  var endpoints = []

  var origHandle = sinonServer.handleRequest
  sinonServer.handleRequest = function(xhr) {
    if (isJSONRequest(xhr)) {
      xhr.requestBody = JSON.parse(xhr.requestBody)
    }

    var endpoint = findEndpoint(xhr)
    if (endpoint) {
      var matchBody = matchesBody(endpoint.body, xhr.requestBody)
      var matchHeaders = matchesHeaders(endpoint.headers, xhr.requestHeaders)
      if (!matchBody) {
        var bodymsg = isSinonMatch(endpoint.body) ? endpoint.body.message : isObjectOrArray(endpoint.body) ? JSON.stringify(endpoint.body, null, 2) : endpoint.body
        throw new Error(getPrefix(xhr) + 'Route found, but body does not match:\nRequired:' + bodymsg + '\nActual:' + (isJSONRequest(xhr) ? JSON.stringify(xhr.requestBody, null, 2) : xhr.requestBody))
      } else if (!matchHeaders) {
        var headerMsg = printMatcher(endpoint.headers)
        throw new Error(getPrefix(xhr) + 'Route found, but headers does not match:\nRequired:' + headerMsg + '\nActual:' + JSON.stringify(xhr.requestHeaders, null, 2))
      }

      endpoint.stub(xhr.method, xhr.url, xhr.requestBody, xhr.requestHeaders)
    }

    var result = origHandle.apply(this, [].slice.call(arguments))

    if (endpoint) {
      if (endpoint.hasResponded) {
        endpoint.respond(xhr)
      }
    } else {
      throw new Error(getPrefix(xhr) + 'No such endpoint registered.')
    }

    return result
  }
  
  sinonServer.respondWith(function(xhr) {
    var endpoint = findEndpoint(xhr)
    var prefix = getPrefix(xhr)
    
    if (endpoint) {
      if (endpoint.respond) {
        endpoint.respond(xhr)
      } else {
        throw new Error(prefix + 'Server respond was called but endpoint have no defined response. Call either resolve or reject.')
      }
    } else {
      throw new Error(getPrefix(xhr) + 'No such endpoint registered.')
    }
  })

  function findEndpoint(xhr) {
    var matchingEndpoints = endpoints.filter(function(endpoint) {
      var matchMethod = matchesMethod(endpoint.method, xhr.method)
      var matchUrl = matchesUrl(endpoint.url, xhr.url)
      return matchMethod && matchUrl
    })

    return matchingEndpoints[0]
  }

  function use(method, url, body, requiredHeaders) {
    var stub = sinon.stub()

    var endpoint = {
      method: method,
      url: url,
      body: body,
      headers: requiredHeaders,
      stub: stub,
      hasResponded: false
    }

    endpoints.push(endpoint)

    function resolveFactory(defaultStatusCode) {
      return function(statusCode, responseBody, headers) {
        if (arguments.length === 1) {
          responseBody = statusCode
          statusCode = defaultStatusCode
        } else if (arguments.length === 2 && !isNumber(statusCode)) {
          headers = responseBody
          responseBody = statusCode
          statusCode = defaultStatusCode
        }

        headers = normalizeHeaders(headers || {})
        endpoint.respond = function(xhr) {
          if (isObjectOrArray(responseBody)) {
            responseBody = tryStringifyJSON(responseBody)
            // stringify went ok, set json response header
            if (responseBody && !headers['content-type']) {
              headers['content-type'] = 'application/json; charset=utf-8'
            }
          }
          xhr.respond(statusCode, headers, responseBody)
        }

        sinonServer.respond()
        endpoint.hasResponded = true
        return stub
      }
    }

    stub.resolves = resolveFactory(200)
    stub.rejects = resolveFactory(500)

    return stub
  }

  var methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']

  methods.forEach(function(method) {
    server[method] = function(url, body, requiredHeaders) {
      method = method.toUpperCase()
      url = sinon.match(url)
      body = createBodyMatcher(body)
      requiredHeaders = normalizeHeaders(requiredHeaders)
      var headerMatcher = createHeaderMatcher(requiredHeaders)
      return use(method, url, body, headerMatcher)
    }

    server[method].strict = function(url, body, requiredHeaders) {
      return use(method, url, body, requiredHeaders)
    }
  })

  server.any = function(url, body, requiredHeaders) {
    url = sinon.match(url)
    body = createBodyMatcher(body)
    requiredHeaders = normalizeHeaders(requiredHeaders)
    var headerMatcher = createHeaderMatcher(requiredHeaders)
    return use(sinon.match.string, url, body, headerMatcher)
  }

  server.any.strict = function(url, body, requiredHeaders) {
    return use(sinon.match.string, url, body, requiredHeaders)
  }

  server.use = function(method, url, body, requiredHeaders) {
    url = sinon.match(url)
    body = createBodyMatcher(body)
    requiredHeaders = normalizeHeaders(requiredHeaders)
    var headerMatcher = createHeaderMatcher(requiredHeaders)
    return use(method, url, body, headerMatcher)
  }

  server.use.strict = function() {
    return use.apply(this, [].slice.call(arguments))
  }

  server.restore = sinonServer.restore.bind(sinonServer)

  return server
}

module.exports = createServer
