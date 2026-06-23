# 8. Generator와 IoC

## 섹션 목표

Effect에서 generator를 쓰는 이유를 문법적 편의가 아니라 runtime에게 제어권을 넘기는 IoC 장치로 설명한다.

## 핵심 메시지

> Generator는 async/await처럼 보이지만, Promise를 기다리는 문법이 아니라 Effect runtime에게 실행을 위임하는 문법이다.

---

## Slide 1. Generator는 멈출 수 있는 함수다

```ts
function* program() {
  const a = yield "step 1"
  const b = yield "step 2"
  return a + b
}
```

핵심:

```txt
- 함수가 한 번에 끝까지 실행되지 않는다
- yield 지점에서 멈춘다
- 바깥쪽 caller가 다시 resume한다
- 함수 내부 로직의 제어권이 바깥으로 넘어간다
```

### 핵심 문장

> generator는 내부 코드가 실행 흐름을 직접 소유하지 않고, 바깥 interpreter가 실행을 drive하게 만든다.

---

## Slide 2. Effect.gen은 Effect용 async/await처럼 읽힌다

```ts
const program = Effect.gen(function* () {
  const http = yield* HttpClient
  const logger = yield* Logger

  const user = yield* http.getUser()
  yield* logger.info("user loaded")

  return user
})
```

읽기에는 async/await와 비슷하다.

하지만 `yield*`는 Promise만 기다리는 것이 아니다.

---

## Slide 3. 각 yield\*에서 일어나는 일

```txt
1. program이 멈춘다
2. 현재 Effect를 runtime에게 넘긴다
3. runtime이 필요한 dependency를 찾는다
4. runtime이 async 작업을 실행한다
5. 실패하면 error channel로 보낸다
6. 성공하면 값을 generator 안으로 다시 넣는다
7. timeout/cancel/cleanup도 runtime이 관리한다
```

### 핵심 문장

> `yield*`는 program과 runtime 사이의 제어권 양도 지점이다.

---

## Slide 4. IoC 관점에서 보기

일반 코드:

```txt
내 코드가 dependency를 만들고
내 코드가 실행하고
내 코드가 에러 처리하고
내 코드가 cleanup한다
```

Effect + generator:

```txt
내 코드는 필요한 effect를 선언하고
runtime이 실행을 drive하고
Layer가 dependency를 제공하고
Error channel이 실패를 전달하고
Runtime이 시간과 interruption을 관리한다
```

### 핵심 문장

> 제어권이 코드에서 runtime으로 넘어간다. 이것이 IoC다.

---

## Slide 5. Program to Interface와의 연결

```ts
const submit = Effect.gen(function* () {
  const http = yield* HttpClient
  const storage = yield* Storage
  const analytics = yield* Analytics

  const result = yield* http.post("/submit")
  yield* storage.set("lastSubmit", result.id)
  yield* analytics.track("submitted")

  return result
})
```

이 프로그램은 다음을 모른다.

```txt
- fetch인지 axios인지
- localStorage인지 memory storage인지
- Segment인지 Amplitude인지
- browser인지 test인지 SSR인지
```

알고 있는 것은 capability뿐이다.

```ts
Effect.Effect<SubmitResult, SubmitError, HttpClient | Storage | Analytics>
```

### 핵심 문장

> generator 안에서 service를 `yield*`한다는 것은 구현체를 가져오는 것이 아니라 capability를 요구하는 것이다.
