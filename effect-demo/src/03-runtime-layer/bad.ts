type User = { readonly id: string; readonly name: string }

// =============================================================================
// 03 BAD. business logic이 runtime 구현체를 직접 선택한다
// =============================================================================
// 이 예제에서는 loadUserBad가 어떤 HTTP client와 logger를 쓸지 직접 결정합니다.
// 테스트에서 다른 구현체를 쓰고 싶으면 함수 내부를 바꾸거나 monkey patch가 필요해집니다.

// =============================================================================
// 1. 구체 runtime 구현체
// =============================================================================

const realHttpGet = async (_url: string): Promise<User> => ({ id: "1", name: "Ada" })
const realLogger = (message: string) => console.log(message)

// =============================================================================
// 2. Program과 runtime이 섞인 함수
// =============================================================================
// 이 함수는 "user를 로드한다"는 business flow와
// "어떤 HTTP/logger 구현체를 쓸 것인가"라는 runtime 선택을 동시에 합니다.

export async function loadUserBad(): Promise<User> {
  realLogger("loading user")
  const user = await realHttpGet("/api/user")
  realLogger(`loaded ${user.name}`)
  return user
}
