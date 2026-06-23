type User = { readonly id: string; readonly name: string }

// =============================================================================
// 05 BAD. Promise 타입은 실패를 숨긴다
// =============================================================================
// `Promise<User>`는 성공 타입만 알려줍니다.
// 어떤 실패가 가능한지, 어떤 실패를 호출자가 처리해야 하는지 타입에 남지 않습니다.

// =============================================================================
// 1. 실패가 throw로 흩어진 async function
// =============================================================================

export async function loadUserBad(status: number): Promise<User> {
  if (status === 401) {
    throw new Error("unauthorized")
  }

  if (status >= 500) {
    throw new Error("network failed")
  }

  return { id: "1", name: "Ada" }
}

// =============================================================================
// 2. 호출부: catch의 error는 unknown이다
// =============================================================================
// 호출자는 문자열, instanceof, message parsing 같은 방식에 기대기 쉽습니다.

export async function callerBad() {
  try {
    return await loadUserBad(401)
  } catch (error) {
    // error: unknown
    console.log("어떤 에러인지 문자열/instanceof에 의존해야 함", error)
    return undefined
  }
}
