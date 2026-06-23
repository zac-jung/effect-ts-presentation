import { Clock, Console, Context, Data, Effect, Layer, Ref, Schedule } from "effect"

// =============================================================================
// 04 GOOD. 시간 정책을 program value에 조합하기
// =============================================================================
// business flow는 "user를 가져온다"에 집중합니다.
// retry/timeout 같은 시간 정책은 program 바깥에서 pipe로 조합합니다.

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

class NetworkError extends Data.TaggedError("NetworkError")<{
  readonly reason: string
}> {}

class RequestTimeoutError extends Data.TaggedError("RequestTimeoutError")<{
  readonly duration: string
}> {}

class UnauthorizedError extends Data.TaggedError("UnauthorizedError")<{}> {}

class UnexpectedStatusError extends Data.TaggedError("UnexpectedStatusError")<{
  readonly status: number
}> {}

class DecodeError extends Data.TaggedError("DecodeError")<{
  readonly reason: string
}> {}

type HttpClient = {
  readonly get: (url: string) => Effect.Effect<HttpResponse, NetworkError>
}

const HttpClient = Context.GenericTag<HttpClient>("04/HttpClient")

type Logger = {
  readonly info: (message: string) => Effect.Effect<void>
}

const Logger = Context.GenericTag<Logger>("04/Logger")

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
// 3. Base program: 요청과 decode만 표현한다
// =============================================================================

const loadUser = Effect.gen(function* () {
  const http = yield* HttpClient
  const logger = yield* Logger

  yield* logger.info("request user")
  const response = yield* http.get("/api/user")

  if (response.status === 401) {
    return yield* Effect.fail(new UnauthorizedError())
  }

  if (response.status >= 400) {
    return yield* Effect.fail(new UnexpectedStatusError({ status: response.status }))
  }

  return yield* decodeUser(response.body)
})

// =============================================================================
// 4. Policy composition: retry와 timeout을 나중에 붙인다
// =============================================================================
// retry는 NetworkError에만 적용합니다.
// UnauthorizedError나 decode/status error를 재시도하지 않는 것이 중요합니다.

const timeoutDuration = "1 second"

const resilientLoadUser = loadUser.pipe(
  Effect.retry({
    schedule: Schedule.recurs(2),
    while: (error) => error._tag === "NetworkError"
  }),
  Effect.timeoutFail({
    duration: timeoutDuration,
    onTimeout: () => new RequestTimeoutError({ duration: timeoutDuration })
  })
)

// =============================================================================
// 5. Runtime layer: 첫 두 번은 실패하고 세 번째 성공하는 HTTP client
// =============================================================================

const ConsoleLoggerLive = Layer.succeed(Logger, {
  info: (message) => Console.log(`[info] ${message}`)
})

const makeFlakyHttpClientLive = () =>
  Layer.effect(
    HttpClient,
    Effect.gen(function* () {
      const attempts = yield* Ref.make(0)

      return {
        get: (url) =>
          Effect.gen(function* () {
            const attempt = yield* Ref.updateAndGet(attempts, (current) => current + 1)
            yield* Effect.sleep("80 millis")

            if (attempt < 3) {
              return yield* Effect.fail(
                new NetworkError({
                  reason: `temporary network failure on attempt ${attempt}`
                })
              )
            }

            const loadedAt = yield* Clock.currentTimeMillis
            return {
              status: 200,
              body: { id: "1", name: `Ada from ${url} at ${loadedAt}` }
            }
          })
      }
    })
  )

// =============================================================================
// 6. Demo: flaky runtime에서 retry 후 성공한다
// =============================================================================

export const demo = Effect.gen(function* () {
  yield* Console.log("\n[04 GOOD] retry/timeout은 program 값에 조합한다")
  const user = yield* resilientLoadUser.pipe(
    Effect.provide(makeFlakyHttpClientLive()),
    Effect.provide(ConsoleLoggerLive)
  )
  yield* Console.log(`retry 후 성공: ${user.name}`)
}).pipe(Effect.catchAll((error) => Console.error(error)))
