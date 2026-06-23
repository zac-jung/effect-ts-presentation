import { Console, Context, Data, Effect, Layer } from "effect"

// =============================================================================
// 03 GOOD. 같은 program을 다른 runtime/layer 위에서 실행하기
// =============================================================================
// Effect program은 구체 구현체가 아니라 capability에 의존합니다.
// 그래서 program은 그대로 두고, 제공하는 Layer만 바꿔서 다른 세계를 만들 수 있습니다.

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

const HttpClient = Context.GenericTag<HttpClient>("03/HttpClient")

type Logger = {
  readonly info: (message: string) => Effect.Effect<void>
}

const Logger = Context.GenericTag<Logger>("03/Logger")

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
// 3. Program: HttpClient와 Logger capability만 요구한다
// =============================================================================

export const loadUserProgram = Effect.gen(function* () {
  const http = yield* HttpClient
  const logger = yield* Logger

  yield* logger.info("loading user")
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
// 4. Runtime layers: 같은 program에 다른 세계를 제공한다
// =============================================================================

const ConsoleLoggerLive = Layer.succeed(Logger, {
  info: (message) => Console.log(`[info] ${message}`)
})

const HttpClientSuccessLive = Layer.succeed(HttpClient, {
  get: (_url) => Effect.succeed({ status: 200, body: { id: "1", name: "Ada" } })
})

const HttpClientUnauthorizedLive = Layer.succeed(HttpClient, {
  get: (_url) => Effect.succeed({ status: 401, body: { message: "unauthorized" } })
})

const SuccessRuntime = Layer.mergeAll(HttpClientSuccessLive, ConsoleLoggerLive)
const UnauthorizedRuntime = Layer.mergeAll(HttpClientUnauthorizedLive, ConsoleLoggerLive)

// =============================================================================
// 5. Demo: 같은 program + 다른 Layer
// =============================================================================

export const demo = Effect.gen(function* () {
  yield* Console.log("\n[03 GOOD] 같은 program, 다른 runtime")

  // 성공하는 runtime을 제공한다.
  const liveUser = yield* loadUserProgram.pipe(Effect.provide(SuccessRuntime))
  yield* Console.log(`Production-like runtime: ${liveUser.name}`)

  // 401을 반환하는 runtime을 제공한다.
  // program 코드는 바꾸지 않고, 실행되는 세계만 바꿉니다.
  const testResult = yield* loadUserProgram.pipe(
    Effect.provide(UnauthorizedRuntime),
    Effect.catchTag("UnauthorizedError", () =>
      Effect.succeed("Test runtime: 로그인 페이지로 redirect")
    )
  )

  yield* Console.log(testResult)
})
