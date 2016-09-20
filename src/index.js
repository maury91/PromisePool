type QuerablePromise = {
  isFulfilled: Function,
  isResolved: Function,
  isRejected: Function,
  then: Function,
  catch: Function
}

function MakeQuerablePromise (promise: Promise|QuerablePromise): QuerablePromise {
  // Don't create a wrapper for promises that can already be queried.
  if (promise.isResolved) {
    return promise
  }

  let isResolved = false
  let isRejected = false

  // Observe the promise, saving the fulfillment in a closure scope.
  var result = promise.then(
    (v) => {
      isResolved = true
      return v
    },
    (e) => {
      isRejected = true
      throw e
    })
  result.isFulfilled = () => isResolved || isRejected
  result.isResolved = () => isResolved
  result.isRejected = () => isRejected
  return result
}

function execute (executor: Function<Promise>): QuerablePromise {
  return MakeQuerablePromise(executor())
}

export default function PromisePool (promises: Array<Function<Promise>>, concurrency = 2, noError = true): Promise<boolean> {
  return new Promise(function (resolve, reject) {
    let noErrors = true
    let inExecution = promises.splice(0, concurrency).map(execute);
    (async function executePool () {
      try {
        await Promise.race(inExecution)
      } catch (err) {
        noErrors = false
        if (!noError) {
          return reject()
        }
      }
      inExecution = inExecution.filter(prom => !prom.isFulfilled())
      const toExtract = Math.min(concurrency - inExecution.length, promises.length)
      if (toExtract) {
        inExecution = inExecution.concat(promises.splice(0, toExtract).map(execute))
      }
      if (inExecution.length === 0) {
        resolve(noErrors)
      } else {
        executePool()
      }
    })()
  })
}
