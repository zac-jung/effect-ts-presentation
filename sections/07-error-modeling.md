# 7. Error Modeling First

## 섹션 목표

Effect.ts가 throw/catch 중심의 사후적 에러 처리보다 “어떤 실패가 가능한지 먼저 모델링하는 구조”를 제공한다는 점을 설명한다.

## 핵심 메시지

> Effect.ts의 장점은 에러를 잘 catch하는 것이 아니라, 어떤 에러가 가능한지 먼저 모델링하게 만든다는 점이다.

---

## Slide 1. Promise 타입은 실패를 숨긴다

```ts
async function loadUser(): Promise<User> {
  const response = await fetch("/api/user")

  if (!response.ok) {
    throw new Error("failed")
  }

  return response.json()
}
```

`Promise<User>` 타입은 말해주지 않는다.

```txt
- 인증 실패가 나는지
- 네트워크 실패가 나는지
- timeout이 나는지
- decode error가 나는지
```

결국 호출부에서는:

```ts
try {
  await loadUser()
} catch (error) {
  // error: unknown
}
```

---

## Slide 2. Effect는 실패를 먼저 모델링한다

```ts
class UnauthorizedError extends Data.TaggedError("UnauthorizedError")<{}> {}

class NetworkError extends Data.TaggedError("NetworkError")<{
  reason: string
}> {}

class DecodeError extends Data.TaggedError("DecodeError")<{
  reason: string
}> {}
```

그 다음 프로그램 타입에 실패 가능성을 포함한다.

```ts
Effect.Effect<User, UnauthorizedError | NetworkError | DecodeError, HttpClient>
```

### 핵심 문장

> Effect에서는 expected error를 throw하지 않는다. domain error로 모델링하고 error channel로 반환한다.

---

## Slide 3. Effect.gen에서 에러 모델링하기

```ts
const loadUser = Effect.gen(function* () {
  const http = yield* HttpClient

  const response = yield* http.get("/api/user")

  if (response.status === 401) {
    return yield* Effect.fail(new UnauthorizedError())
  }

  const user = yield* decodeUser(response.body)
  return user
})
```

타입:

```ts
Effect.Effect<User, UnauthorizedError | NetworkError | DecodeError, HttpClient>
```

---

## Slide 4. Error handling도 프로그램의 일부가 된다

```ts
const handledProgram = loadUser.pipe(
  Effect.catchTag("UnauthorizedError", () => redirectToLogin),
  Effect.catchTag("NetworkError", () => showRetryToast)
)
```

차이:

```txt
기존 방식
- 어딘가에서 catch
- error는 unknown
- 어떤 에러가 처리됐는지 흐름을 추적하기 어려움

Effect 방식
- 에러가 프로그램 타입에 있음
- catchTag로 구체 에러를 처리
- 처리하지 않은 에러는 타입에 남음
```

---

## Slide 5. 좋은 아키텍처 관점

좋은 아키텍처는 실패를 숨기지 않는다.

```txt
- 실패 가능성을 먼저 식별한다
- 실패를 domain model로 표현한다
- 어떤 boundary에서 어떤 실패를 처리할지 정한다
- 예상된 실패와 예상치 못한 결함을 구분한다
```

### 핵심 문장

> Error modeling은 사후 방어 코드가 아니라 프로그램 설계의 일부다.
