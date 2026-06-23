# 좋은 아키텍처 배우기: Effect.ts로 다시 보는 Frontend 설계

> Effect.ts API 튜토리얼이 아니라, 좋은 아키텍처가 무엇을 분리해야 하는지 Effect.ts를 렌즈로 다시 보는 발표.

## 발표 목적

프론트엔드 팀원들이 다음을 이해하도록 돕는다.

1. 우리가 잘 모르고 써왔던 best practice가 어떤 문제를 해결하려는 것이었는지 환기한다.
2. 함수형 프로그래밍에서 말하는 `Effect`라는 더 고수준 개념을 소개한다.
3. 코드와 runtime의 차이를 이해한다.
4. generator가 runtime에게 제어권을 넘겨 IoC를 가능하게 하는 방식을 이해한다.

## 중심 메시지

> 좋은 아키텍처는 비즈니스 로직을 구체 구현, 외부 환경, 실패 방식, 시간 제어 정책으로부터 분리한다.  
> Effect.ts는 이 분리를 `Effect<Success, Error, Requirements>`라는 모델로 표현하게 해준다.

## 청중에게 남기고 싶은 것

- 좋은 아키텍처는 폴더 구조가 아니라 복잡성을 분리하는 방식이다.
- 테스트 가능성은 좋은 아키텍처의 유일한 기준은 아니지만, 중요한 신호다.
- 프론트엔드에서 어려운 것은 순수 로직보다 외부 환경, 비동기, 시간, 실패를 포함하는 Effect 관리다.
- Effect.ts의 함수형 핵심은 효과를 즉시 실행하지 않고 값으로 모델링하는 것이다.
- 같은 프로그램을 다른 runtime 위에서 실행할 수 있으면 테스트와 유지보수가 쉬워진다.
- generator는 async/await 대체 문법이 아니라 Effect runtime에게 실행 제어권을 넘기는 장치다.

## 코드 예제 원칙

발표 코드 예제는 다음 원칙을 따른다.

1. 실행 흐름 예제는 최대한 `Effect.gen`을 사용한다.
2. `pipe`는 error handling, timeout/retry policy, Layer merge, bootstrap처럼 조합이 핵심인 곳에만 사용한다.
3. `Effect.gen(...)`은 부수효과를 바로 실행하지 않고 `Effect` 값을 만든다는 점을 명확히 보여준다.
4. `Fiber`는 `Effect.runFork(program)`처럼 runtime에서 실제 실행이 시작될 때 생기는 실행 handle로 설명한다.

```ts
const program = Effect.gen(function* () {
  yield* Effect.sync(() => console.log("side effect"))
  return 1
})

// 이 시점에는 아직 console.log가 실행되지 않는다.
// program: Effect.Effect<number, never, never>

const fiber = Effect.runFork(program)
// 이 시점부터 runtime에서 실행이 시작된다.
// fiber: RuntimeFiber<number, never>
```

## 섹션 구성

1. [좋은 아키텍처란 무엇인가](./sections/01-good-architecture.md)
2. [테스트 가능성과 Effect 문제](./sections/02-testability-and-effects.md)
3. [우리는 이미 이 문제를 풀고 있었다](./sections/03-existing-practices.md)
4. [Effect: 효과를 값으로 다룬다는 관점](./sections/04-effect-as-value.md)
5. [Runtime과 코드의 분리](./sections/05-runtime-and-layer.md)
6. [시간성을 가진 Effect](./sections/06-time-and-runtime.md)
7. [Error Modeling First](./sections/07-error-modeling.md)
8. [Generator와 IoC](./sections/08-generator-ioc.md)
9. [정리와 결론](./sections/09-closing.md)

## 전체 흐름 요약

```txt
Opening
  ↓
좋은 아키텍처란 무엇인가
  ↓
테스트 가능성은 왜 중요한 신호인가
  ↓
순수 로직보다 Effect 관리가 어렵다
  ↓
우리는 이미 interface/context/contract로 이 문제를 풀고 있었다
  ↓
Effect.ts: 효과를 값으로 모델링한다
  ↓
Effect<Success, Error, Requirements>
  ↓
코드는 abstract runtime capability에 의존하고 실제 runtime은 실행 시점에 선택한다
  ↓
비동기/timeout/retry/streaming 같은 시간성은 runtime이 제어한다
  ↓
throw가 아니라 error를 먼저 모델링한다
  ↓
generator는 runtime에게 제어권을 넘기는 장치다
  ↓
Effect.ts는 좋은 아키텍처의 분리를 TypeScript 코드 안에서 명시적으로 표현한다
```
