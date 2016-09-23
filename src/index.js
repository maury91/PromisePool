type QuerablePromise = {
  isFulfilled: Function,
  isResolved: Function,
  isRejected: Function,
  executionTime: Function,
  info: Array<any>,
  then: Function,
  catch: Function
}

function MakeQuerablePromise (promise: Promise|QuerablePromise, ...info): QuerablePromise {
  // Don't create a wrapper for promises that can already be queried.
  if (promise.isResolved) {
    return promise
  }

  let isResolved = false
  let isRejected = false
  let executionTime = 0
  const start = Date.now()

  // Observe the promise, saving the fulfillment in a closure scope.
  var result = promise.then(
    (v) => {
      isResolved = true
      executionTime = Date.now() - start
      return v
    },
    (e) => {
      isRejected = true
      executionTime = Date.now() - start
      throw e
    })
  result.isFulfilled = () => isResolved || isRejected
  result.isResolved = () => isResolved
  result.isRejected = () => isRejected
  result.executionTime = () => executionTime
  result.info = info
  return result
}

type executeObject = {
  promise: Function<Promise>,
  index: number
}

function execute (executor: executeObject): QuerablePromise {
  return MakeQuerablePromise(executor.promise(), executor.index)
}

export default function PromisePool (promisesRaw: Array<Function<Promise>>, concurrency = 2, noError = true): Promise<Array<number|boolean>> {
  const promises = promisesRaw.map((promise: Function<Promise>, index: number) => {promise, index})
  const result = new Array(promisesRaw.length).fill(false)
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
      const resolved = inExecution.filter(prom => prom.isResolved())
      for (const promise of resolved) {
        result[promise.info[0]] = promise.executionTime()
      }
      inExecution = inExecution.filter(prom => !prom.isFulfilled())
      const toExtract = Math.min(concurrency - inExecution.length, promises.length)
      if (toExtract) {
        inExecution = inExecution.concat(promises.splice(0, toExtract).map(execute))
      }
      if (inExecution.length === 0) {
        resolve(result)
      } else {
        executePool()
      }
    })()
  })
}
