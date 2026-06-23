import { Console, Context, Data, Effect, Layer } from "effect"

// =============================================================================
// 06 GOOD. Generator와 Effect.gen의 IoC 감각 익히기
// =============================================================================
// generator는 중간에 멈출 수 있고, 바깥 runtime/interpreter가 다시 resume할 수 있습니다.
// Effect.gen은 이 성질을 이용해 program과 runtime 사이의 제어권 양도 지점을 만듭니다.

// =============================================================================
// 1. 이 예제에서 필요한 model / error / service를 파일 안에 선언한다
// =============================================================================

type User = {
  readonly id: string
  readonly name: string
}

type HttpResponse = {
  readonly status: number
  readonly body: unknown
}

class UnauthorizedError extends Data.TaggedError("UnauthorizedError")<{}> {}

class UnexpectedStatusError extends Data.TaggedError("UnexpectedStatusError")<{
  readonly status: number
}> {}

class DecodeError extends Data.TaggedError("DecodeError")<{
  readonly reason: string
}> {}

type HttpClient = {
  readonly get: (url: string) => Effect.Effect<HttpResponse>
}

const HttpClient = Context.GenericTag<HttpClient>("06/HttpClient")

type Logger = {
  readonly info: (message: string) => Effect.Effect<void>
}

const Logger = Context.GenericTag<Logger>("06/Logger")

// =============================================================================
// 2. Boundary helper: HTTP body를 User로 decode한다
// =============================================================================

const decodeUser = (body: unknown): Effect.Effect<User, DecodeError> =>
  Effect.gen(function* () {
    if (
      typeof body === "object" &&
      body !== null &&
      "id" in body &&
      "name" in body &&
      typeof body.id === "string" &&
      typeof body.name === "string"
    ) {
      return { id: body.id, name: body.name }
    }

    return yield* Effect.fail(new DecodeError({ reason: "body is not User" }))
  })

// =============================================================================
// 3. Plain generator: yield 지점에서 멈추고 외부에서 resume한다
// =============================================================================

function* tinyGenerator(): Generator<string, string, string> {
  const first = yield "step 1"
  const second = yield "step 2"
  return `${first} + ${second}`
}

// =============================================================================
// 4. Effect.gen program: yield* 지점에서 runtime에게 실행을 맡긴다
// =============================================================================
// `yield* HttpClient`는 service capability를 요구하는 지점입니다.
// `yield* http.get(...)`는 async effect 실행을 runtime에게 맡기는 지점입니다.

const effectProgram = Effect.gen(function* () {
  const http = yield* HttpClient
  const logger = yield* Logger

  const response = yield* http.get("/api/user")

  if (response.status === 401) {
    return yield* Effect.fail(new UnauthorizedError())
  }

  if (response.status >= 400) {
    return yield* Effect.fail(new UnexpectedStatusError({ status: response.status }))
  }

  const user = yield* decodeUser(response.body)
  yield* logger.info(`loaded ${user.name}`)

  return user
})

// =============================================================================
// 5. Runtime layer: Effect.gen program에 필요한 capability를 제공한다
// =============================================================================

const DemoRuntimeLive = Layer.mergeAll(
  Layer.succeed(HttpClient, {
    get: (_url) => Effect.succeed({ status: 200, body: { id: "1", name: "Ada" } })
  }),
  Layer.succeed(Logger, {
    info: (message) => Console.log(`[info] ${message}`)
  })
)

// =============================================================================
// 6. Demo: plain generator와 Effect.gen을 나란히 본다
// =============================================================================

export const demo = Effect.gen(function* () {
  yield* Console.log("\n[06 GOOD] generator의 yield*는 runtime에게 제어권을 넘긴다")

  // plain generator는 next(...)로 직접 resume한다.
  const iterator = tinyGenerator()
  yield* Console.log(JSON.stringify(iterator.next()))
  yield* Console.log(JSON.stringify(iterator.next("A")))
  yield* Console.log(JSON.stringify(iterator.next("B")))

  // Effect.gen program은 Effect runtime이 resume한다.
  const user = yield* effectProgram.pipe(Effect.provide(DemoRuntimeLive))
  yield* Console.log(`Effect.gen 결과: ${user.name}`)
})
