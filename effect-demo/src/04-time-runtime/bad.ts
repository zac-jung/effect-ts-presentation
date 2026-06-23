type User = { readonly id: string; readonly name: string }

// =============================================================================
// 04 BAD. 시간 제어 정책이 business logic 안에 섞인다
// =============================================================================
// timeout, abort, cleanup은 모두 중요하지만, business flow와 한 함수에 섞이면
// 읽기 어렵고 재사용하기도 어렵습니다.

// =============================================================================
// 1. abort 가능한 fetch 흉내
// =============================================================================

const fetchWithAbort = async (_url: string, _signal: AbortSignal): Promise<User> => ({
  id: "1",
  name: "Ada"
})

// =============================================================================
// 2. 요청 실행 + timeout + abort + cleanup이 한 곳에 있다
// =============================================================================

export async function loadUserWithTimeoutBad(): Promise<User> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5_000)

  try {
    return await fetchWithAbort("/api/user", controller.signal)
  } finally {
    clearTimeout(timeout)
  }
}
