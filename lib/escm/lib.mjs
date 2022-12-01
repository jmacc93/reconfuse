
export const lib = {};
(() => {

  //#region isDefined like functions

  /**
  isDefined(0)
  isDefined({a:1})
  isDefined(null)      // fails
  isDefined(undefined) // fails
  */
  function isDefined(obj) {
    if(typeof(obj) === 'undefined' || obj === undefined || obj === null)
      return false
    else
      return true
  }
  lib.isDefined = isDefined

  /**
  anyDefined([null, undefined]) // fails
  anyDefined([undefined, 3])
  */
  function anyDefined(array) {
    for(const e of array)
      if(isDefined(e))
        return true
    return false
  }
  lib.anyDefined = anyDefined

  /**
  isUndefined(null)
  isUndefined(undefined)
  isUndefined(0)         //fails
  */
  function isUndefined(obj) {
    return !isDefined(obj)
  }
  lib.isUndefined = isUndefined

  //#endregion

  //#region assertions

  /**
  Setting debuggerOnAssertionFailure to true makes certain functions drop
  into the debugger and write an error to the console when their assertions fail
  */
  let debuggerOnAssertionFailure = true
  lib.debuggerOnAssertionFailure = debuggerOnAssertionFailure

  /**
  Setting assertionsOff to true makes assertions not do anything
  Assertions are assumed slow here and so shouldn't really be used in production
  */
  let assertionsOff = false
  lib.assertionsOff = assertionsOff

  function assert(condition, msg) {
    if(assertionsOff) return void 0
    if(!condition) {
      if(debuggerOnAssertionFailure) {
        console.error(`Assertion failed`, msg ?? 'Reason not given')
        debugger
      }
      throw new Error(msg)
    }
  }
  lib.assert = assert

  /**
  assertHas({a: 1, b: 2}, 'a')
  assertHas({a: 1, b: 2}, 'a', 'b')
  assertHas({a: 1, b: 2}, 'c')      // fails
  */
  function assertHas(obj, ...keys) {
    if(assertionsOff) return void 0
    let badkeys = []
    for(const key of keys)
      if(isUndefined(key in obj))
        badkeys.push(key)
    if(badkeys.length > 0) {
      if(debuggerOnAssertionFailure) {
        console.error(`Has assertion failed`, obj, ...keys, 'bad keys:', ...badkeys)
        debugger
      }
      throw new Error(`${badkeys.join(', ')} not in obj ${obj}`)
    }
  }
  lib.assertHas = assertHas

  /**
  assertIsIdNumber(-1) // fails
  assertIsIdNumber(0)
  assertIsIdNumber(1)
  assertIsIdNumber(2)
  Asserts input is number, !isNan, and >= 0
  */
  function assertIsIdNumber(obj) {
    if(assertionsOff) return void 0
    assert(!isNaN(obj), 'obj is NaN')
    assert(obj >= 0, "obj is not a valid id")
  }
  lib.assertIsIdNumber = assertIsIdNumber

  /**
  assertIsNumber(-1)
  assertIsNumber(1)
  assertIsNumber(NaN) // fails
  */
  function assertIsNumber(obj) {
    if(assertionsOff) return void 0
    assert(typeof(obj) === 'number', "object is not a number")
    assert(!isNaN(obj), 'obj is NaN')
  }
  lib.assertIsNumber = assertIsNumber

  /**
  assertIsArray([])
  assertIsArray([1, 2])
  assertIsArray({a: 3})  // fails
  assertIsArray(3)       // fails
  */
  function assertIsArray(obj) {
    if(assertionsOff) return void 0
    assert(typeof obj === 'object')
    assert(obj instanceof Array)
  }
  lib.assertIsArray= assertIsArray

  /**
  assertIsRegularObject({a: 1})
  assertIsRegularObject({b: 2})
  assertIsRegularObject({[0]: 3}) // fails
  assertIsRegularObject([4])      // fails
  Asserts that obj is an entirely string-indexed object
  */
  function assertIsRegularObject(obj) {
    if(assertionsOff) return void 0
    assert(typeof obj === 'object')
    for(const key in obj)
      assertIsString(key)
  }
  lib.assertIsRegularObject = assertIsRegularObject

  /**
  assertIsString('')
  assertIsString('asdf')
  assertIsString(3)      // fails
  */
  function assertIsString(obj) {
    if(assertionsOff) return void 0
    assert(typeof obj === 'string')
  }
  lib.assertIsString = assertIsString

  /**
  assertIsTyped('asdf', 'string')
  assertIsTyped(5, 'number')
  assertIsTyped({a:1}, 'number') // fails
  */
  function assertIsTyped(obj, type) {
    if(assertionsOff) return void 0
    assert(typeof(obj) === type, `object is not the given type (${type})`)
  }
  lib.assertIsTyped = assertIsTyped

  /**
  assertDefined(0)
  assertDefined(null)      // fails
  assertDefined(undefined) // fails
  */
  function assertDefined(obj, msg) {
    if(assertionsOff) return void 0
    if(isUndefined(obj)) {
      if(debuggerOnAssertionFailure) {
        console.error(`Not-null assertion failed`, obj, msg ?? '')
        debugger
      }
      throw new Error(msg ?? '')
    }
  }
  lib.assertDefined = assertDefined

  /**
  assertAllDefined(0, 1)
  assertAllDefined(null, 1)      // fails
  assertAllDefined(0, undefined) // fails
  */
  function assertAllDefined(...objList) {
    if(assertionsOff) return void 0
    for(const obj of objList)
      assertDefined(obj)
  }
  lib.assertAllDefined = assertAllDefined


  // Below are testing-related functions

  /**
  assertIsAround(0,  0.2)
  assertIsAround(0,  0.6)       // fails
  assertIsAround(0,  0.6,  1)
  assertIsAround(10, 10.6, 1)
  assertIsAround(10, 10.6, 0.5) // fails
  assertIsAround(x, y, r)
  Fails if abs(x - y) > r
  Note assertIsAround(x, y, r) is equivalent to assertIsAround(y, x, r)
  */
  function assertIsAround(x, y, r) {
    if(assertionsOff) return void 0
    if(Math.abs(x - y) > r)
      throw new Error(`${y} is not within ${r} of ${x}`)
  }
  lib.assertIsAround = assertIsAround
  /**
  The negative version of assertIsAround
  */
  function assertIsNotAround(x, y, r) {
    if(assertionsOff) return void 0
    if(Math.abs(x - y) <= r)
      throw new Error(`${y} is within ${r} of ${x}`)
  }
  lib.assertIsNotAround = assertIsNotAround

  /**
  assertAllEqual(0, 0)
  assertAllEqual([1], [1])
  assertAllEqual({a:2}, {a:2})
  assertAllEqual({a:3}, {b:3})  // fails
  assertAllEqual({a:4}, [4])    // fails
  assertAllEqual(x, y, z, ...)
  Fails if all the arguments aren't equal
  Uses equals(...) from below
  Assumes transitivity of equality lol
  */
  function assertAllEqual(... args) {
    if(assertionsOff) return void 0
    for(let i = 0; i < args.length-1; i++) {
      if(!equals(args[i], args[i+1]))
        throw new Error(`Objects ${args[i]} and ${args[i+1]} are not equal`)
    }
  }
  lib.assertAllEqual = assertAllEqual

  //#endregion

  //#region Testing and debugging functions

  // Just a namespace
  class Debug {

    /**
    This is just for simulating what slow code looks like
    Don't actually use it
    */
    static debugSleepFor(ms) {
      var startTime = Date.now()
      while(Date.now() < startTime + ms) {
        // do nothing
      }
      return
    }

  }

  //#endregion

  //#region class Ease

  /**
  Namespace Ease
  This contains interpolating functions which look like Ease.f(a, b, x)
  Where Ease.f(a, b, 0) = a, Ease.f(a, b, 1) = b
  */
  class Ease {
    
    /**
    Ease.linear(0, 10, 0.5) == 5
    Ease.linear(0, 1, x) Looks like a straight line x on [0, 1]
    */
    static linear(a, b, x) {
      return a + (b - a)*x
    }

    /**
    Ease.log(0, 1, x) Starts out quickly increasing then levels out some on [0, 1]
    */
    static log(u, v, x, r = 0.5) {
      assert(r > 0, `Ease.log parameter must be greater than 0, but is ${r}`)
      return Ease.linear(u, v, Math.log(1 + 100*r*x)/Math.log(1 + 100*r))
    }

    /**
    Ease.power(0, 1, x, a) where a > 1: starts slow ends fast on [0, 1]
                          where a < 1: starts fast, ends slow on [0, 1]
    */
    static power(u, v, x, a = 0.5) {
      assert(a > 0, `Ease.power parameter must be greater than 0, but is ${a}`)
      return Ease.linear(u, v, Math.pow(x, a))
    }
  }
  lib.Ease = Ease

  //#endregion

  //#region async-related code

  /**
  intervalStopper = setIncreasingInterval(functionToCall, initialDelay, maxDelay, inNumberOfSteps, argForFunction)
  // Then later:
  intervalStopper()
  // And the interval is stopped, the functionToCall function isn't called again
  All delays in ms
  */
  function _setIncreasingInterval_FullArgs(updateFunction, initialDelay, finalDelay, stepsToMax, args) {
    assert(stepsToMax > 0, `Max setIncreasingInterval steps must be > 0 (is ${stepsToMax})`)
    let updateId // from either setTimeout or setInterval
    let currentStep = 0 
    let logInitialDelay = Math.log(initialDelay)
    let logMaxDelay     = Math.log(finalDelay)
    let intervalIsSet   = false
    let clearFunction = ()=>{
      clearTimeout(updateId)
    } 
    let updateWrapper = function() {
      let shouldResetRate = updateFunction.apply(null, args ?? [])
      if(isUndefined(shouldResetRate)) {
        shouldResetRate = false
      }
      if(shouldResetRate) { // reset delay to initial delay
        currentStep = 0
        intervalIsSet = false
        updateId = setTimeout(updateWrapper, initialDelay)
      } else if(intervalIsSet) { // continue the interval
        return
      } else if(currentStep < stepsToMax) { // keep increasing delay
        currentStep += 1
        updateId = setTimeout(updateWrapper, Math.exp(Ease.linear(logInitialDelay, logMaxDelay, currentStep/stepsToMax)))
      } else { // at max delay, just set an interval
        updateId = setInterval(updateWrapper, finalDelay)
        intervalIsSet = true
      }
    }
    // console.log(`Now using delay ${initialDelay/1000} seconds`) // debug
    updateId = setTimeout(updateWrapper, initialDelay)
    return clearFunction
  }
  function setIncreasingInterval(arg0, ...otherArgs) {
    if(typeof arg0 === 'object') { // as options
      const opts = arg0
      return _setIncreasingInterval_FullArgs(
        opts.updateFunction, opts.initialDelay, opts.finalDelay, opts.stepsToMax, opts.args
      )
    } else { // as full args
      assert(typeof arg0 === 'function')
      assert((typeof(otherArgs[0]) === 'number') || isUndefined(otherArgs[0]))
      assert((typeof(otherArgs[1]) === 'number') || isUndefined(otherArgs[1]))
      assert((typeof(otherArgs[2]) === 'number') || isUndefined(otherArgs[2]))
      assert(Array.isArray(otherArgs[4]) || isUndefined(otherArgs[4]))
      return _setIncreasingInterval_FullArgs.apply(null, [arg0, otherArgs[0], otherArgs[1], otherArgs[2], otherArgs[3]])
    }
  }
  lib.setIncreasingInterval = setIncreasingInterval

  //#endregion

  //#region Element creation

  function toElement(tag, fn = undefined) {
    let ret = document.createElement(tag)
    fn?.(ret)
    return ret
  }
  lib.toElement = toElement

  function plaintextElement(arg) {
    assertDefined(arg)
    if(typeof arg === 'string') { // then use as is
      const text = arg // rename for clarity
      return toElement('span', e => e.innerText = text)
    } else if(typeof arg === 'object') { // then make into json string
      const obj = arg // rename for clarity
      return toElement('span', e => e.innerText = JSON.stringify(obj))
    } else { // assume number or something
      return toElement('span', e => e.innerText = arg.toString())
    }
  }
  lib.plaintextElement = plaintextElement

  //#endregion

  //#region Variable ...args helper functions

  /**
  fromAnySatisfying(predicate, [any, ...])
  Iterates using deepMapApply over the leaf elements of the second argument,
  if any element satisfies the predicate, then it returns that element
  fromAnySatisfying([predicate, ...], ...)
  If the first argument is a list of predicate functions, then it returns
  the equivalent of [fromAnySatisfying(predicate1, ...), fromAnySatisfying(predicate2, ...), ...]
  fromAnySatisfying(pred, arg: not an array)
  If the 2nd argument isn't an array then it acts like
  it is an array with arg as its only element: fromAnySatisfying(pred, [arg])
  fromAnySatisfying(x=>x%2==0, [1,3,5,4,3,1]) // returns: 4
  */
  function fromAnySatisfying(predicate, objs) {
    if(Array.isArray(predicate)) { // assuming first arg is list of predicates // apply this function to each predicate
      const predicateArray = predicate // rename for clarity
      return predicateArray.map(pred => fromAnySatisfying(pred, objs))
    } else if(Array.isArray(objs)) {
      return deepMapApply(objs, elem => {
        if(predicate(elem))
          return elem
      })
    } else { // objs is not an array
      const obj = objs // rename for clarity
      if(predicate(obj))
        return obj
    }
    return undefined
  }
  lib.fromAnySatisfying = fromAnySatisfying

  /**
  fromAny('a', {a: 1})               // 1
  fromAny('b', {a: 1})               // undefined
  fromAny('b', [{a: 1}, {b: 2}])     // 2
  fromAny('b', [[{a: 1}], [{b: 2}]]) // 2
  Looks for the first object in the second argument containing the first argument as a key,
  and returns that objects value for that key 
  */
  function fromAny(key, objs) {
    assertDefined(key); assertDefined(objs)
    if(Array.isArray(key)) { // key is string[] // apply fromAny to each of keys elements
      const keyArray = key // rename for clarity
      return keyArray.map(singleKey => fromAny(singleKey, objs))
    } else { // key is a string
      return deepMapApply(objs, singleObj => {
        if((typeof singleObj === 'object') && (key in singleObj))
          return singleObj[key]
      })
    }
  }
  lib.fromAny = fromAny

  /**
  firstTyped('number', [1, [2], "3", {a:4}]) // 1
  firstTyped('array',  [1, [2], "3", {a:4}]) // [2]
  firstTyped('string', [1, [2], "3", {a:4}]) // "3"
  firstTyped('object', [1, [2], "3", {a:4}]) // {a:4}
  Selects the first deeply nested object in the second argument with a
  typeof string matching the first element
  A type string of 'array' matches Array.isArray(...)
  Use to get a single number, string, etc from a function's arguments obj when that 
  arg is the only one of that type
  */
  function firstTyped(typeString, objs) {
    assertDefined(typeString); assertDefined(objs)
    if(Array.isArray(typeString)) { // typeString is like ['number', 'string', ...]
      const typeStringArray = typeString // rename for clarity
      return typeStringArray.map(singleTypeString => firstTyped(singleTypeString, objs))
    } else {
      return mapApplyOnlyTyped(typeString, objs, singleObj => {
        return singleObj
      })
    }
  }
  lib.firstTyped = firstTyped

  /**
  Like firstTyped but gives all objs with the given typeof
  allTyped('number', [1, [2], 5, '3', {a:4}, [6], '7', {b:8}, 9]) // return: [1, 2, 5, 7, 9]
  allTyped('array',  [1, [2], 5, '3', {a:4}, [6], '7', {b:8}, 9]) // return: [[2], [6]]
  allTyped('string', [1, [2], 5, '3', {a:4}, [6], '7', {b:8}, 9]) // return: ["3", "7"]
  allTyped('object', [1, [2], 5, '3', {a:4}, [6], '7', {b:8}, 9]) // return: [{a:4}, {b:8}]
  */
  function allTyped(typeString, objs) {
    assertDefined(typeString); assertDefined(objs)
    if(Array.isArray(typeString)) { // typeString is like ['number', 'string', ...]
      const typeStringArray = typeString // rename for clarity
      return typeStringArray.map(singleTypeString => allTyped(singleTypeString, objs))
    } else {
      let retArray = []
      mapApplyOnlyTyped(typeString, objs, singleObj => {
        retArray.push(singleObj)
      })
      return retArray
    }
  }
  lib.allTyped = allTyped

  /**
  onlyInstancesOf(Array, [[1], 2, [3, [4]], "asdf"]) // returns [[1], [3, [4]]]
  */
  function allInstancesOf(Cla, objs) {
    assertAllDefined(Cla, objs)
    if(Array.isArray(Cla)) { // Cla like [Array, Object, ...]
      const ClaArray = Cla // rename for clarity
      return ClaArray.map(singleCla => allInstancesOf(singleCla, objs))
    } else { // Cla like Array
      let retArray = []
      mapApply(objs, singleObj => {
        if(singleObj instanceof Cla)
          retArray.push(singleObj)
      }, Cla !== Array)
      return retArray
    }
  }
  lib.allInstancesOf = allInstancesOf

  /**
  firstInstanceOf(Array, ["asdf", [1], 2, [3, [4]]]) // returns [1]
  */
  function firstInstanceOf(Cla, objs) {
    assertAllDefined(Cla, objs)
    if(Array.isArray(Cla)) { // Cla like [Array, Object, ...]
      const ClaArray = Cla // rename for clarity
      return ClaArray.map(singleCla => firstInstanceOf(singleCla, objs))
    } else { // Cla like Array
      return mapApply(objs, singleObj => {
        if(singleObj instanceof Cla)
          return singleObj
      }, Cla !== Array)
    }
  }
  lib.firstInstanceOf = firstInstanceOf

  //#endregion

  //#region Array functions like map, deepMapApply, etc

  /**
  Shallow version:
  mapApply([[1,2],3,[4,[5,6]]], x => console.log(x)) // prints: [1, 2] 3 [4, [5, 6]]
  mapApply(7, x => console.log(x)) // prints: 7
  mapApply({a: 1, b: 2}, x => console.log(x)) // prints: {a: 1, b: 2}
  Deep version:
  mapApply([[1,2],3,[4,[5,6]]], x => console.log(x), true) // prints: 1 2 3 4 5 6
  The third argument (optional) is true for deep map, false for shallow map, number for map up to depth n
  mapApply([[1,2],3,[4,[5,6]]], x => console.log(x), 1) // prints: 1 2 3 4 [5, 6]
  */
  function mapApply(arg, fn, deep = false) {
    assertDefined(fn)
    if(deep === true)
      deep = -1
    else if(deep === false)
      deep = 0
    if(Array.isArray(arg)) {
      const array = arg // rename for clarity
      for(const elem of array) {
        let ret
        if(deep !== 0)
          ret = Array.isArray(elem) ? mapApply(elem, fn, deep > 0 ? deep-1 : deep) : fn(elem)
        else
          ret = fn(elem)
        if(isDefined(ret))
          return ret
      }
    } else {
      return fn(arg)
    }
    return undefined
  }
  lib.mapApply = mapApply

  /**
  An alias of mapApply(arg, fn, -1)
  Maps the given function fn over all arrays in arg deeply
  ei: only applies fn to the deepest elements of arrays in arg
  */
  function deepMapApply(arg, fn) {
    return mapApply(arg, fn, -1)
  }
  lib.deepMapApply = deepMapApply

  /**
  mapApplyOnlyTyped('number', [1, {a:'qwer'}, 'z'], fn)
  Maps fn only onto deeply nested elements of the second arg with a typeof matching the first element
  */
  function mapApplyOnlyTyped(typeString, objs, fn) {
    assertDefined(typeString); assertDefined(objs)
    if(!Array.isArray(objs)) // redirect non-array objs arg to [objs]
      return mapApplyOnlyTyped(typeString, [objs], fn)
    // else:
    if(typeString === 'array') { // don't search deeply so we can catch arrays
      return mapApply(objs, singleObj => {
        if(Array.isArray(singleObj)) {
          let ret = fn(singleObj)
          if(isDefined(ret))
            return ret
        }
      })
    } else { // typeString is like 'number', 'string', ...
      return deepMapApply(objs, singleObj => {
        if(typeof singleObj === typeString) {
          let ret = fn(singleObj)
          if(isDefined(ret))
            return ret
        }
      })
    }
  }
  lib.mapApplyOnlyTyped = mapApplyOnlyTyped

  /**
  fold((total, x) => total + x, [1, 2, 3]) // 6 // the sum of all elements
  The return of fold(f, [x1, x2, ..., xn]) is like:
  f(f( ... f(f(x1, x2), x3) ...), xn)
  */
  function fold(f, array) {
    if(array.length == 0)
      return undefined
    let res = array[0]
    for(let i = 1; i < array.length; i++)
      res = f(res, array[i])
    return res
  }
  lib.fold = fold

  //#endregion

  //#region output functions like echo

  function echo(x) {
    console.log('echo ', x)
    return x
  }
  lib.echo = echo

  //#endregion

  //#region equality functions

  function arrayEquals(x, y) {
    assertIsArray(x); assertIsArray(y)
    if(x.length !== y.length)
      return false
    // else:
    for(let i = 0; i < x.length; i++) {
      if(!equals(x[i], y[i]))
        return false
    }
    // else:
    return true
  }
  lib.arrayEquals = arrayEquals

  function objectEquals(x, y) {
    assertIsRegularObject(x); assertIsRegularObject(y)
    for(const key in x) {
      assertIsString(key)
      if(!(key in y))
        return false
      // else:
      if(!equals(x[key], y[key]))
        return false
    }
    // else:
    return true
  }
  lib.objectEquals = objectEquals

  function equals(x, y) {
    if(typeof x !== typeof y)
      return false
    // else:
    if(typeof x === 'object') { // array or object
      if(Array.isArray(x) && Array.isArray(y)) { // array
        return arrayEquals(x, y)
      } else { // object
        return objectEquals(x, y)
      }
    } else { // can use primitive equality operators
      return x === y
    }
  }
  lib.equals = equals

  //#endregion


  //#region math and random generation

  /**
  randomIntegerOn(0, 10) // 4
  randomIntegerOn(0, 10) // 6
  randomIntegerOn(0, 10) // 1
  randomIntegerOn(0, 10) // 10
  randomIntegerOn(0, 10) // 0
  randomIntegerOn(1, 1)  // 1
  randomIntegerOn(10, 0)
  Same as randomIntegerOn(0, 10)
  */
  function randomIntegerOn(start, end) {
    assertIsNumber(start); assertIsNumber(end)
    if(end < start)
      return randomIntegerOn(start, end)
    else if(end === start)
      return start
    else
      return Math.floor(Math.random()*(end+1-start)) + start
  }
  lib.randomIntegerOn = randomIntegerOn

  /**
  randomChoice([1,2,3])    // 3
  randomChoice([1,2,3], 3) // [2, 2, 1]
  randomChoice([1,2,3], 6) // [3, 1, 2, 3, 1, 1]
  */
  function singleRandomChoice(choices) {
    return choices[randomIntegerOn(0, choices.length - 1)]
  }
  lib.singleRandomChoice = singleRandomChoice
  function randomChoice(choices, n) {
    if(isUndefined(n)) { // no count n given
      return singleRandomChoice(choices)
    } else { // count n is given
      assertIsNumber(n); assert(n > 0, 'n must be > 0')
      let ret = []
      for(let i = 0; i < n; i++)
        ret.push(singleRandomChoice(choices))
      return ret
    }
  }
  lib.randomChoice = randomChoice

  /**
  randomAlphanum(4) // 'ht2v'
  */
  const alphanumChars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
  function randomAlphanum(n) {
    assert(n >= 0, 'n must be > 0')
    return randomChoice(alphanumChars, n).join('')
  }
  lib.randomAlphanum = randomAlphanum

  //#endregion

  //#region applyTo, ifNotNull, etc

  /**
  applyTo(x, f)
  eq to: f(x); x
  Applies the second argument function to the first argument, then returns the first
  Use to make a block into an expression
  */
  function applyTo(x, fn = undefined) {
    fn?.(x)
    return x
  }
  lib.applyTo = applyTo

  /**
  ifNotNull('a',       x=>1, y=>2) // 1
  ifNotNull(undefined, x=>1, y=>2) // 2
  ifNotNull(null,      x=>1, y=>2) // 2
  ifNotNull(undefined, x=>1)       // undefined 
  ifNotNull('a',       x=>1)       // 1
  ifNotNull('a',       f, g)       // f('a')
  ifNotNull(undefined, f, g)       // g()
  */
  function ifNotNull(obj, then, otherwise = undefined) {
    return isDefined(obj) ? then(obj) : isDefined(otherwise) ? otherwise() : obj
  }
  lib.ifNotNull = ifNotNull

  //#endregion


  //#region miscellaneous

  function makeTimestring(timeNumber) {
    return (new Date(timeNumber)).toLocaleDateString('en-us', {
      hour12: true,
      weekday:"short", year:"numeric", month:"short", day:"numeric",
      hour:"numeric", minute:"numeric", second:"numeric"
    })
  }
  lib.makeTimestring = makeTimestring
  function makeCurrentTimestring() {
    return makeTimestring(Date.now())
  }
  lib.makeCurrentTimestring = makeCurrentTimestring


  //#endregion

})()