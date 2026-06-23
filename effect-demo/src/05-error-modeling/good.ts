import { Console, Context, Data, Effect, Layer } from "effect"

// =============================================================================
// 05 GOOD. Error Modeling First
// =============================================================================
// Effect에서는 expected error를 throw하지 않고 error channel로 반환합니다.
// 그러면 어떤 실패가 가능한지 program 타입에 남고, catchTag로 구체적으로 처리할 수 있습니다.

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

const HttpClient = Context.GenericTag<HttpClient>("05/HttpClient")

type Logger = {
  readonly info: (message: string) => Effect.Effect<void>
}

const Logger = Context.GenericTag<Logger>("05/Logger")

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
// 3. Program: 실패를 domain error로 모델링한다
// =============================================================================

export const loadUserWithModeledErrors = Effect.gen(function* () {
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
// 4. Runtime layer: 일부러 401을 반환하는 세계
// =============================================================================

const UnauthorizedRuntime = Layer.mergeAll(
  Layer.succeed(HttpClient, {
    get: (_url) => Effect.succeed({ status: 401, body: { message: "unauthorized" } })
  }),
  Layer.succeed(Logger, {
    info: (message) => Console.log(`[info] ${message}`)
  })
)

// =============================================================================
// 5. Demo: 특정 tag만 복구한다
// =============================================================================
// UnauthorizedError는 여기서 처리되므로 message로 변환됩니다.
// 처리하지 않은 다른 error는 타입에 남아 다음 boundary로 전달됩니다.

export const demo = Effect.gen(function* () {
  yield* Console.log("\n[05 GOOD] expected error를 먼저 모델링한다")

  const message = yield* loadUserWithModeledErrors.pipe(
    Effect.provide(UnauthorizedRuntime),
    Effect.catchTag("UnauthorizedError", () =>
      Effect.succeed("UnauthorizedError만 구체적으로 복구: redirect to login")
    )
  )

  yield* Console.log(message)
})
