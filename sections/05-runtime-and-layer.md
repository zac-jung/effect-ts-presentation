# 5. Runtime과 코드의 분리

## 섹션 목표

Effect 프로그램은 구체 구현체가 아니라 abstract runtime capability에 의존하고, 실제 runtime은 실행 시점에 선택된다는 점을 설명한다.

## 핵심 메시지

> 코드는 abstract runtime capability에 의존하고, 실제 runtime은 실행 시점에 선택한다.

---

## Slide 1. 일반 코드는 실행 환경에 바로 묶인다

```ts
async function submit() {
  const response = await fetch("/api/submit")
  localStorage.setItem("lastSubmit", Date.now().toString())
  console.log("submitted")
  return response.json()
}
```

이 코드는 이미 많은 것을 결정하고 있다.

```txt
HTTP = fetch
storage = localStorage
logging = console
clock = Date.now
runtime = browser
error model = throw/rejected promise
```

---

## Slide 2. Effect 프로그램은 capability를 요구한다

```ts
const submitProgram = Effect.gen(function* () {
  const http = yield* HttpClient
  const storage = yield* Storage
  const logger = yield* Logger
  const clock = yield* Clock

  const response = yield* http.post("/api/submit")
  const now = yield* clock.currentTimeMillis
  yield* storage.set("lastSubmit", String(now))
  yield* logger.info("submitted")

  return response
})
```

타입으로 보면:

```ts
Effect.Effect<SubmitResult, SubmitError, HttpClient | Storage | Logger | Clock>
```

### 핵심 문장

> 이 프로그램은 구현체가 아니라 capability set에 의존한다.

---

## Slide 3. 실제 runtime은 실행 시점에 선택한다

Production runtime:

```ts
const BrowserRuntime = Layer.mergeAll(
  HttpClientLive,
  BrowserStorageLive,
  ConsoleLoggerLive,
  ClockLive
)
```

Test runtime:

```ts
const TestRuntime = Layer.mergeAll(
  FailingHttpClientTest,
  InMemoryStorageTest,
  MemoryLoggerTest,
  TestClock
)
```

Bootstrap:

```ts
Effect.runPromise(submitProgram.pipe(Effect.provide(BrowserRuntime)))
```

---

## Slide 4. 테스트 관점에서의 의미

같은 프로그램을 다른 세계에서 실행할 수 있다.

```txt
Production runtime
- real HTTP client
- real logger
- browser storage
- real clock

Test runtime
- failing HTTP client
- memory logger
- in-memory storage
- controllable clock
```

### 핵심 문장

> 좋은 테스트는 코드를 바꾸는 것이 아니라, 코드가 실행되는 세계를 바꾸는 것이다.

---

## Slide 5. compile time contract

Effect 프로그램은 실행 전까지 필요한 Requirements가 타입에 남는다.

```ts
Effect.Effect<User, UserError, HttpClient>
```

`HttpClient`가 필요한 상태다.

```ts
const runnable = program.pipe(Effect.provide(HttpClientLive))
// Effect.Effect<User, UserError, never>
```

### 발표자 노트

모든 버그를 compile time에 잡는다는 뜻은 아니다.  
하지만 dependency, expected error, success type처럼 설계상 중요한 정보를 타입으로 끌어올린다.
