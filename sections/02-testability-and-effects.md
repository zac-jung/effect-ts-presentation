# 2. 테스트 가능성과 Effect 문제

## 섹션 목표

테스트 가능성을 좋은 아키텍처의 중요한 신호로 소개하고, 프론트엔드에서 테스트가 어려운 이유가 대부분 Effect 관리에 있음을 설명한다.

## 핵심 메시지

> 테스트 가능성은 좋은 아키텍처의 유일한 기준은 아니지만, 코드가 외부 세계와 얼마나 잘 분리되어 있는지 보여주는 중요한 신호다.

---

## Slide 1. 테스트 가능성을 왜 강조하는가

테스트하기 어려운 코드는 대체로 다음 특성을 가진다.

```txt
- 숨겨진 의존성이 많다
- 외부 환경에 강하게 묶여 있다
- 실패 상황을 재현하기 어렵다
- 시간 흐름을 제어하기 어렵다
- 그래서 불안정하고 변경하기도 어렵다
```

### 핵심 문장

> 테스트하기 어려운 코드는 불안정하고, 변경하기도 어렵다.

---

## Slide 2. 테스트 가능성이란 무엇인가

테스트 가능성은 단순히 mock을 많이 만들 수 있다는 뜻이 아니다.

```txt
테스트 가능성 =
내가 원하는 환경과 상황을
실제 외부 세계 없이
반복 가능하게 시뮬레이션할 수 있는 능력
```

예시:

```txt
- API가 500을 반환한다
- 첫 요청은 timeout, 두 번째 요청은 성공한다
- feature flag가 꺼져 있다
- 사용자가 권한이 없다
- localStorage가 실패한다
- streaming이 중간에 끊긴다
- 5초가 지났다
```

---

## Slide 3. 순수 로직은 비교적 테스트하기 쉽다

```ts
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "success":
      return { ...state, status: "success" };
    case "failure":
      return { ...state, status: "error" };
  }
}
```

이런 코드는 테스트하기 쉽다.

```txt
- 같은 입력이면 같은 출력
- 외부 환경이 필요 없음
- 시간 흐름이 없음
- 실패 상황을 만들기 쉬움
```

### 발표자 노트

프론트엔드에서는 reducer, selector, pure utility, domain function처럼 순수 로직을 격리하려는 시도를 많이 해왔다.

---

## Slide 4. 하지만 실제 어려움은 순수 로직 밖에 있다

실제 서비스 코드의 복잡도는 보통 여기에 있다.

```txt
- API 호출
- 인증 상태
- 권한
- feature flag
- localStorage/sessionStorage
- analytics
- timeout
- retry
- cancellation
- streaming
- resource cleanup
```

### 핵심 문장

> 우리는 순수 로직을 분리하는 방법은 많이 이야기해왔다. 하지만 실제 서비스 코드의 어려움은 대부분 순수 로직 바깥에 있다.

---

## Slide 5. 함수형 프로그래밍에서는 이것을 Effect라고 부른다

넓은 의미의 Effect:

```txt
- 외부 세계와 상호작용하는 작업
- 시간이 걸리는 작업
- 실패할 수 있는 작업
- 중단될 수 있는 작업
- 실행 환경이 필요한 작업
```

예:

```txt
fetch
localStorage
console.log
setTimeout
AbortController
stream reader
analytics.track
```

### 핵심 문장

> Effect란 순수 계산 바깥의 세계와 상호작용하는 모든 작업이다.

---

## Slide 6. 문제 제기

Reducer는 상태 전이를 잘 다룬다. 하지만 질문은 남는다.

```txt
누가 action을 dispatch할 것인가?
API 요청은 어디서 할 것인가?
요청 실패는 어떻게 모델링할 것인가?
retry는 어디에 둘 것인가?
timeout은 누가 관리할 것인가?
streaming 중단은 어떻게 처리할 것인가?
analytics는 어디서 호출할 것인가?
```

### 핵심 문장

> 정말 어려운 것은 순수 로직이 아니라 Effect 관리다.
