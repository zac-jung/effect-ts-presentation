# 6. 시간성을 가진 Effect

## 섹션 목표

프론트엔드 Effect에는 시간 개념이 들어 있고, Effect runtime이 시간의 흐름을 제어한다는 점을 설명한다.

## 핵심 메시지

> Effect runtime은 단순 실행기가 아니라, 시간 위에서 실행되는 프로그램을 제어하는 runtime이다.

---

## Slide 1. 프론트엔드 Effect에는 시간이 들어 있다

```txt
- HTTP request
- timeout
- retry
- polling
- streaming
- websocket
- cancellation
- cleanup
```

이들은 모두:

```txt
지금 당장 끝나는 계산이 아니라,
시간의 흐름 속에서 성공하거나 실패하거나 중단되는 작업
```

---

## Slide 2. 일반 코드에서는 시간 제어가 흩어진다

```ts
async function loadUser() {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 5000);

  try {
    const response = await fetch("/api/user", {
      signal: controller.signal,
    });
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}
```

여기에는 여러 책임이 섞여 있다.

```txt
- 요청 실행
- timeout 관리
- abort signal 관리
- cleanup
- error handling
```

---

## Slide 3. Effect는 시간 정책도 프로그램 값에 조합한다

실행 흐름은 `Effect.gen`으로 유지한다.

```ts
const loadUser = Effect.gen(function* () {
  const http = yield* HttpClient;
  const user = yield* http.getUser();
  return user;
});
```

시간 정책은 boundary에서 조합한다.

```ts
const resilientLoadUser = loadUser.pipe(
  Effect.timeout("5 seconds"),
  Effect.retry(Schedule.recurs(3))
);
```

### 핵심 문장

> 시간 제어 정책이 구현 코드에 섞이는 대신, 프로그램 값에 조합된다.

---

## Slide 4. Streaming도 시간성을 가진 Effect다

Streaming에는 다음이 포함된다.

```txt
- chunk가 언제 올지 모름
- 중간에 실패할 수 있음
- 사용자가 중단할 수 있음
- 연결을 정리해야 함
- backpressure가 있을 수 있음
```

Effect 관점:

```ts
Stream.Stream<Chunk, StreamError, HttpClient>
```

의미:

```txt
시간이 지나며 Chunk를 방출한다.
실패하면 StreamError.
실행하려면 HttpClient가 필요하다.
```

### 핵심 문장

> Stream은 시간에 따라 여러 값을 내는 Effect라고 볼 수 있다.

---

## Slide 5. Runtime이 제어하는 것

Effect runtime이 관리하는 것:

```txt
- 언제 시작할지
- 어떤 순서로 실행할지
- 병렬로 실행할지
- 언제 timeout 처리할지
- 언제 retry할지
- 중단되면 어디까지 cleanup할지
- streaming을 어떻게 소비할지
```

### 핵심 문장

> 코드가 시간의 흐름을 직접 소유하지 않고, runtime에게 위임한다.
