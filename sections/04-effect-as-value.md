# 4. Effect: 효과를 값으로 다룬다는 관점

## 섹션 목표

Effect.ts의 함수형 핵심인 “효과를 값으로 다룬다”는 개념을 소개한다.

## 핵심 메시지

> Effect는 실행 결과가 아니라 실행 가능한 프로그램 값이다.

---

## Slide 1. Effect의 핵심 타입

```ts
Effect.Effect<Success, Error, Requirements>
```

이 타입이 말하는 것:

```txt
Success
- 성공하면 무엇을 반환하는가

Error
- 어떤 실패가 가능한가

Requirements
- 실행하려면 어떤 외부 capability가 필요한가
```

예:

```ts
Effect.Effect<User, UnauthorizedError | TimeoutError, HttpClient | Logger>
```

### 핵심 문장

> Effect 타입은 반환 타입이 아니라 프로그램의 계약이다.

---

## Slide 2. 일반 코드는 호출하면 실행된다

```ts
const user = await fetchUser()
```

호출 순간:

```txt
- 네트워크 요청이 나가고
- 실패하면 throw/reject되고
- 외부 세계와 상호작용이 발생한다
```

---

## Slide 3. Effect는 먼저 프로그램 값을 만든다

```ts
const loadUser = Effect.gen(function* () {
  const http = yield* HttpClient
  const logger = yield* Logger

  yield* logger.info("loading user")
  const user = yield* http.getUser()
  yield* logger.info("user loaded")

  return user
})
```

이 시점에는 아직 실행되지 않았다.

```ts
// loadUser: Effect.Effect<User, UserError, HttpClient | Logger>
```

### 핵심 문장

> Effect.ts의 함수형 핵심은 효과를 즉시 실행하지 않고, 값으로 모델링하는 것이다.

---

## Slide 4. Effect value와 Fiber

```ts
const program = Effect.gen(function* () {
  yield* Effect.sync(() => {
    console.log("side effect")
  })

  return 1
})
```

이 시점에는 `console.log`가 실행되지 않는다.

```ts
// program: Effect.Effect<number, never, never>
```

실행을 시작하면 Fiber가 생긴다.

```ts
const fiber = Effect.runFork(program)
// fiber: RuntimeFiber<number, never>
```

정리:

```txt
Effect = 아직 실행되지 않은 프로그램 값
Fiber  = runtime 위에서 실행 중인 Effect의 handle
```

---

## Slide 5. 효과가 값이면 무엇이 좋은가

효과를 값으로 만들면:

```txt
- 실행을 미룰 수 있다
- 작은 효과를 조합할 수 있다
- 성공/실패/의존성을 타입으로 검사할 수 있다
- 실행 환경을 나중에 선택할 수 있다
- 테스트에서 원하는 환경을 제공할 수 있다
```

### 핵심 문장

> 테스트 가능하다는 것은 같은 프로그램을 다른 runtime 위에서 실행할 수 있다는 뜻이다.
