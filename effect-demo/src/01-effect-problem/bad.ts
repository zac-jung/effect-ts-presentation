const fetch = async (_url: string, _body: unknown) => ({
  ok: true,
  json: async (): Promise<SubmitResult> => ({
    id: "submit-1",
    savedAt: Date.now()
  })
})

const localStorage = {
  setItem: (key: string, value: string) => {
    console.log(`[localStorage] ${key}=${value}`)
  }
}

// =============================================================================
// 01 BAD. 함수 타입에 숨겨진 Effect
// =============================================================================
// 이 파일은 "일반 async 함수가 왜 테스트/변경에 취약해질 수 있는지" 보여줍니다.
// 함수 타입은 `Promise<SubmitResult>`뿐이지만, 실제로는 많은 외부 세계에 묶입니다.

// =============================================================================
// 1. 이 예제에서 필요한 model만 파일 안에 선언한다
// =============================================================================
// 발표용 예제에서는 shared model로 이동하지 않고 파일 안에 펼쳐둡니다.
// 그래야 이 파일 하나만 열어도 전체 맥락이 보입니다.

type ProfileInput = {
  readonly name: string
}

type SubmitResult = {
  readonly id: string
  readonly savedAt: number
}

// =============================================================================
// 2. 구체 구현체가 파일 안에 바로 박혀 있다
// =============================================================================
// 실제 코드에서는 fetch, localStorage, console, Date.now 같은 platform API가
// 이런 식으로 business flow 안쪽까지 들어오는 경우가 많습니다.

// =============================================================================
// 3. 호출자는 Promise<SubmitResult>만 볼 수 있다
// =============================================================================
// 타입만 보면 이 함수가 다음을 사용한다는 사실이 드러나지 않습니다.
// - HTTP
// - storage
// - console logging
// - current time
// - throw/rejected promise error policy

export async function submitProfileBad(input: ProfileInput): Promise<SubmitResult> {
  const response = await fetch("/api/profile", input)

  if (!response.ok) {
    throw new Error("submit failed")
  }

  const result = await response.json()
  localStorage.setItem("lastSubmit", String(Date.now()))
  console.log("profile submitted")

  return result
}
