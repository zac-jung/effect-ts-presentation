# intro-to-effect-ts-demo

발표 슬라이드 흐름에 맞춘 Effect.ts + TypeScript + Node 라이브 코딩 예제입니다.

각 주제마다 `bad.ts`와 `good.ts`를 나눴습니다.

- `bad.ts`: 기존 async/Promise 스타일에서 문제가 숨겨지는 모습
- `good.ts`: 같은 문제를 Effect.ts로 success/error/requirements/runtime 관점에서 드러내는 모습

## 실행

처음에는 루트에서 의존성을 설치합니다.

```bash
pnpm install
```

그 다음 루트 디렉터리에서도 실행됩니다.

```bash
pnpm start
```

또는 패키지 디렉터리에서:

```bash
cd effect-demo
pnpm start
```

개별 예제 실행도 모두 `src/main.ts`가 argument를 받아 분기합니다.

```bash
pnpm 01:bad
pnpm 01:good
pnpm 02:bad
pnpm 02:good
pnpm 03:bad
pnpm 03:good
pnpm 04:bad
pnpm 04:good
pnpm 05:bad
pnpm 05:good
pnpm 05:type-contract
pnpm 06:bad
pnpm 06:good
pnpm 06:mini-runtime
```

직접 argument로 실행할 수도 있습니다.

```bash
pnpm start 01:bad
pnpm start 06:mini-runtime
```

타입 체크:

```bash
pnpm typecheck
```

## 슬라이드 ↔ 코드 매핑

| 슬라이드 주제                  | 파일                       | 보여줄 포인트                                                          |
| ------------------------------ | -------------------------- | ---------------------------------------------------------------------- |
| 2. 테스트 가능성과 Effect 문제 | `src/01-effect-problem/*`  | 숨겨진 HTTP/storage/logger/clock dependency를 타입으로 드러내기        |
| 4. Effect as value             | `src/02-effect-as-value/*` | Promise는 호출 즉시 시작, Effect는 실행 전까지 program value           |
| 5. Runtime과 Layer             | `src/03-runtime-layer/*`   | 같은 program을 다른 runtime/layer 위에서 실행                          |
| 6. 시간성을 가진 Effect        | `src/04-time-runtime/*`    | retry/timeout을 business logic과 분리해서 조합                         |
| 7. Error Modeling First        | `src/05-error-modeling/*`  | throw unknown 대신 `Data.TaggedError`, `catchTag`, error type contract |
| 8. Generator와 IoC             | `src/06-generator-ioc/*`   | `yield*`는 runtime에게 제어권을 넘기는 지점, mini runtime 구현         |

## 추천 라이브 코딩 순서

1. `src/01-effect-problem/bad.ts`를 열고 숨겨진 의존성을 표시합니다.
2. `src/01-effect-problem/good.ts`에서 `Effect.Effect<Success, Error, Requirements>` 관점으로 바꿉니다.
3. `src/02-effect-as-value/good.ts`에서 “아직 실행되지 않은 program value”를 보여줍니다.
4. `src/03-runtime-layer/good.ts`에서 runtime만 바꿔 성공/권한실패를 재현합니다.
5. `src/04-time-runtime/good.ts`에서 `retry`/`timeoutFail`을 business flow 바깥에 조합합니다.
6. `src/05-error-modeling/good.ts`에서 `catchTag`로 특정 에러만 복구합니다.
7. `src/05-error-modeling/type-contract.ts`에서 error channel이 compile-time contract가 되는 모습을 보여줍니다.
   - 모델링하지 않은 error를 `yield*`하면 컴파일 에러가 납니다.
   - `@ts-expect-error`를 잠깐 지워서 실제 tsc 에러를 보여줄 수 있습니다.
   - exact error union이 필요한 경우 type-level assertion으로 검증할 수 있습니다.
8. `src/06-generator-ioc/good.ts`에서 generator와 `Effect.gen`을 연결합니다.
9. `src/06-generator-ioc/mini-runtime.ts`에서 아주 작은 TypeTag/runtime/interpreter를 직접 구현해봅니다.
   - `TypeTag<Service>`로 capability를 선언합니다.
   - generator가 `yield* service(HttpClient)` / `yield* asyncStep(...)`을 선언합니다.
   - runtime이 service lookup, async 실행, resume을 담당합니다.
   - 같은 generator program을 live runtime과 mock runtime에서 실행해 복잡한 비동기 프로세스가 어떻게 쉽게 mocking되는지 보여줍니다.

## 코드 구성 원칙

발표용 예제라서 공통 model/error/service/layer를 `_shared`로 빼지 않고 각 파일 안에 펼쳐뒀습니다.

- 파일 하나만 열어도 필요한 타입, 에러, service tag, layer가 모두 보입니다.
- `bad.ts`와 `good.ts`를 나란히 비교하기 쉽습니다.
- 실무 코드라면 중복 제거를 고려할 수 있지만, 이 데모에서는 설명 흐름을 우선합니다.
- `src/main.ts`만 CLI argument를 받아 어떤 예제를 실행할지 분기합니다.
