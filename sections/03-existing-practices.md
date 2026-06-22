# 3. 우리는 이미 이 문제를 풀고 있었다

## 섹션 목표

기존 코드베이스와 Effect.ts를 1:1 비교하지 않고, 팀이 이미 사용하던 best practice가 Effect 관리 문제를 해결하려는 시도였음을 환기한다.

## 핵심 메시지

> 우리는 이미 구현체에 직접 묶이지 않는 코드를 만들기 위해 노력해왔다.

---

## Slide 1. 우리가 이미 사용하던 설계 원칙들

팀이 이미 익숙한 개념들:

```txt
- Program to interface, not implementation
- Service interface
- React Context
- BFF contract
- Controller context
- Global error handler
- Mock implementation
- Composition root
```

### 발표자 노트

이 섹션은 “이건 Effect.ts에서는 이렇게 된다”라고 1:1 매핑하지 않는다.  
목적은 “이 개념이 완전히 낯선 게 아니다”라는 공감대를 만드는 것이다.

---

## Slide 2. 우리가 해오던 시도들

예를 들어:

```txt
BFF에서는 contract를 먼저 정의한다.
Controller는 context를 통해 필요한 capability를 받는다.
React Context는 하위 트리에 runtime value를 주입한다.
Service interface와 mock 구현체를 둔다.
Global error handler로 boundary error policy를 둔다.
```

### 핵심 문장

> 이런 패턴들은 모두 코드가 외부 세계에 너무 빨리 붙지 않게 하려는 시도다.

---

## Slide 3. 하지만 여전히 어렵다

현재 방식의 어려움:

```txt
- dependency가 함수 타입에 충분히 드러나지 않는다
- error가 Promise 타입에 표현되지 않는다
- provider/context 누락은 런타임에 발견된다
- timeout/retry/abort/cleanup 정책이 흩어진다
- 좋은 원칙이 컨벤션과 리뷰에 의존한다
```

### 전환 질문

> 이 문제를 더 일반적인 모델로 설명할 수 없을까?

---

## Slide 4. Effect.ts로 넘어가는 다리

Effect.ts가 등장하는 지점:

```txt
우리가 하던 best practice를 대체하기 위해서가 아니라,
그 best practice들이 해결하려던 문제를 더 고수준으로 설명하기 위해서.
```

### 핵심 문장

> Effect.ts는 새로운 원칙을 발명한다기보다, 우리가 이미 중요하게 생각하던 분리를 더 명시적인 모델로 표현한다.
