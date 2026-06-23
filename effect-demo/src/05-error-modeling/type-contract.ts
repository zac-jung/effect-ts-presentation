import { Console, Data, Effect } from "effect"

// =============================================================================
// 05 TYPE CONTRACT. Error channel이 compile-time contract가 되는 모습
// =============================================================================
// 이 파일은 실행 결과보다 "편집기/tsc에서 어떤 에러가 나는지" 보여주기 위한 예제입니다.
//
// 핵심 메시지:
// 1. Effect의 error channel에 선언하지 않은 error를 yield하면 컴파일 에러가 납니다.
// 2. 기본 Effect 타입은 "실제로 발생 가능한 error"를 추론합니다.
// 3. 정말 정확한 error contract가 필요하면 type-level assertion으로
//    "내가 모델링한 error를 실제 program이 모두 포함하는지" 검증할 수 있습니다.

// =============================================================================
// 1. 이 예제에서 필요한 model / error를 파일 안에 선언한다
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

class NetworkError extends Data.TaggedError("NetworkError")<{
  readonly reason: string
}> {}

class DecodeError extends Data.TaggedError("DecodeError")<{
  readonly reason: string
}> {}

// =============================================================================
// 2. 실패할 수 있는 작은 Effect들
// =============================================================================

const requestUser = Effect.succeed({
  status: 200,
  body: { id: "1", name: "Ada" }
} satisfies HttpResponse)

const requestUserFromNetwork: Effect.Effect<HttpResponse, NetworkError> = Effect.succeed({
  status: 200,
  body: { id: "1", name: "Ada from network" }
})

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
// 3. GOOD: 가능한 error를 전부 타입에 모델링한다
// =============================================================================
// 이 program은 다음 실패를 타입에 드러냅니다.
// - UnauthorizedError: HTTP 401
// - NetworkError: network request failure
// - DecodeError: response body decode failure

const correctProgram: Effect.Effect<
  User,
  UnauthorizedError | NetworkError | DecodeError
> = Effect.gen(function* () {
  const response = yield* requestUserFromNetwork

  if (response.status === 401) {
    return yield* Effect.fail(new UnauthorizedError())
  }

  return yield* decodeUser(response.body)
})

// =============================================================================
// 4. COMPILE ERROR: 모델링하지 않은 error를 yield하면 안 된다
// =============================================================================
// 아래 contract는 UnauthorizedError만 실패할 수 있다고 말합니다.
// 하지만 body 안에서는 NetworkError와 DecodeError가 가능한 Effect를 yield합니다.
// 따라서 tsc는 "NetworkError | DecodeError는 UnauthorizedError에 assign될 수 없다"고 막습니다.
//
// 발표 중에는 `@ts-expect-error`를 잠깐 지워서 실제 컴파일 에러를 보여줄 수 있습니다.

// @ts-expect-error NetworkError와 DecodeError가 contract에 빠져 있다.
const unmodeledErrorProgram: Effect.Effect<User, UnauthorizedError> = Effect.gen(
  function* () {
    const response = yield* requestUserFromNetwork

    if (response.status === 401) {
      return yield* Effect.fail(new UnauthorizedError())
    }

    return yield* decodeUser(response.body)
  }
)

void unmodeledErrorProgram

// =============================================================================
// 5. 정확한 error contract가 필요한 경우: inferred error를 type-level로 검증한다
// =============================================================================
// Effect 자체는 더 적은 error를 내는 program을 더 넓은 error contract로 사용하는 것을 허용합니다.
// 예를 들어 `Effect<User, UnauthorizedError>`는 `Effect<User, UnauthorizedError | DecodeError>`가
// 필요한 곳에 넣어도 안전합니다. "실패 가능성이 더 적은 program"이기 때문입니다.
//
// 하지만 교육/contract 테스트 목적으로 "내가 모델링한 error union과 실제 inferred error union이
// 정확히 같은지" 보고 싶다면 아래처럼 type-level assertion을 만들 수 있습니다.

type ErrorOf<T> = T extends Effect.Effect<unknown, infer Error, unknown> ? Error : never

type IsEqual<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? (<T>() => T extends B ? 1 : 2) extends <T>() => T extends A ? 1 : 2
      ? true
      : false
    : false

type Expect<T extends true> = T

const missingDecodeProgram = Effect.gen(function* () {
  const response = yield* requestUser

  if (response.status === 401) {
    return yield* Effect.fail(new UnauthorizedError())
  }

  return { id: "1", name: "Ada" } satisfies User
})

type MissingModeledErrorCheck = IsEqual<
  ErrorOf<typeof missingDecodeProgram>,
  UnauthorizedError | DecodeError
>

// @ts-expect-error 실제 error는 UnauthorizedError뿐이라 DecodeError가 contract에 포함되지 않았다.
const missingModeledErrorCheck: Expect<MissingModeledErrorCheck> = true

void missingDecodeProgram
void missingModeledErrorCheck

type CorrectErrorCheck = IsEqual<
  ErrorOf<typeof correctProgram>,
  UnauthorizedError | NetworkError | DecodeError
>

const correctErrorCheck: Expect<CorrectErrorCheck> = true

// =============================================================================
// 6. Runtime demo: 올바른 program은 정상 실행된다
// =============================================================================

export const demo = Effect.gen(function* () {
  yield* Console.log("\n[05 TYPE CONTRACT] error channel은 compile-time contract다")
  yield* Console.log(
    "@ts-expect-error가 붙은 부분을 지우면 tsc가 막는 모습을 볼 수 있습니다."
  )

  const user = yield* correctProgram
  yield* Console.log(`정상 program 실행 결과: ${user.name}`)
  yield* Console.log(`type-level exact check result: ${correctErrorCheck}`)
})
