import { Console, Context, Data, Effect, Layer } from "effect"

// =============================================================================
// 01 GOOD. 숨겨진 Effect를 타입에 드러내기
// =============================================================================
// bad.ts에서는 함수 타입이 `Promise<SubmitResult>`라서 HTTP, storage, logger,
// analytics, clock 같은 외부 세계 의존성이 보이지 않습니다.
//
// 여기서는 같은 submit flow를 Effect program으로 작성합니다.
// 핵심은 "실행에 필요한 capability"를 generator 안에서 명시적으로 요청하는 것입니다.

// =============================================================================
// 1. 이 예제에서 필요한 model / error / service를 파일 안에 선언한다
// =============================================================================

type ProfileInput = {
  readonly name: string
}

type SubmitResult = {
  readonly id: string
  readonly savedAt: number
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
  readonly post: (url: string, body: unknown) => Effect.Effect<HttpResponse>
}

const HttpClient = Context.GenericTag<HttpClient>("01/HttpClient")

type KeyValueStorage = {
  readonly set: (key: string, value: string) => Effect.Effect<void>
}

const KeyValueStorage = Context.GenericTag<KeyValueStorage>("01/KeyValueStorage")

type Logger = {
  readonly info: (message: string) => Effect.Effect<void>
}

const Logger = Context.GenericTag<Logger>("01/Logger")

type Analytics = {
  readonly track: (event: string, payload: unknown) => Effect.Effect<void>
}

const Analytics = Context.GenericTag<Analytics>("01/Analytics")

// =============================================================================
// 2. Boundary helper: 외부 응답을 domain model로 decode한다
// =============================================================================

const decodeSubmitResult = (body: unknown): Effect.Effect<SubmitResult, DecodeError> =>
  Effect.gen(function* () {
    if (
      typeof body === "object" &&
      body !== null &&
      "id" in body &&
      "savedAt" in body &&
      typeof body.id === "string" &&
      typeof body.savedAt === "number"
    ) {
      return { id: body.id, savedAt: body.savedAt }
    }

    return yield* Effect.fail(new DecodeError({ reason: "body is not SubmitResult" }))
  })

// =============================================================================
// 3. Program: business flow는 필요한 capability를 요구한다
// =============================================================================

export const submitProfileGood = (input: ProfileInput) =>
  Effect.gen(function* () {
    // `yield* ServiceTag`는 구현체를 직접 만드는 것이 아닙니다.
    // runtime context에 "이 capability가 필요하다"고 요구하는 지점입니다.
    const http = yield* HttpClient
    const storage = yield* KeyValueStorage
    const logger = yield* Logger
    const analytics = yield* Analytics

    // HTTP 요청은 HttpClient interface 뒤로 숨겨져 있습니다.
    // fetch인지 axios인지, test fake인지 이 program은 모릅니다.
    const response = yield* http.post("/api/profile", input)

    // expected failure는 throw하지 않고 error channel로 반환합니다.
    if (response.status === 401) {
      return yield* Effect.fail(new UnauthorizedError())
    }

    if (response.status >= 400) {
      return yield* Effect.fail(new UnexpectedStatusError({ status: response.status }))
    }

    // decode 역시 실패할 수 있는 boundary입니다.
    const result = yield* decodeSubmitResult(response.body)

    // storage / analytics / logger도 모두 Effect로 합성됩니다.
    yield* storage.set("lastSubmit", String(result.savedAt))
    yield* analytics.track("profile_submitted", { id: result.id })
    yield* logger.info("profile submitted")

    return result
  })

// =============================================================================
// 4. Runtime layer: 이 파일의 program이 실행될 세계를 제공한다
// =============================================================================

const DemoRuntimeLive = Layer.mergeAll(
  Layer.succeed(HttpClient, {
    post: (_url, _body) =>
      Effect.succeed({
        status: 200,
        body: { id: "submit-1", savedAt: Date.now() }
      })
  }),
  Layer.succeed(KeyValueStorage, {
    set: (key, value) => Console.log(`[storage] ${key}=${value}`)
  }),
  Layer.succeed(Logger, {
    info: (message) => Console.log(`[info] ${message}`)
  }),
  Layer.succeed(Analytics, {
    track: (event, payload) =>
      Console.log(`[analytics] ${event} ${JSON.stringify(payload)}`)
  })
)

// =============================================================================
// 5. Demo: runtime layer를 제공해서 실행 가능한 program으로 만든다
// =============================================================================

export const demo = Effect.gen(function* () {
  yield* Console.log("\n[01 GOOD] 숨겨진 effect를 타입에 드러내기")
  const result = yield* submitProfileGood({ name: "Ada" })
  yield* Console.log(JSON.stringify(result, null, 2))
}).pipe(
  // Requirements(HttpClient | Storage | Logger | Analytics)를 여기서 제거합니다.
  Effect.provide(DemoRuntimeLive),
  // CLI boundary에서는 남은 error를 출력으로 바꿉니다.
  Effect.catchAll((error) => Console.error(error))
)
