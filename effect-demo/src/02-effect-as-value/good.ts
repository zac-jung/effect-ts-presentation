import { Console, Effect } from "effect"

// =============================================================================
// 02 GOOD. Effect는 실행 결과가 아니라 program value다
// =============================================================================
// Effect.gen은 side effect를 즉시 실행하지 않습니다.
// 아래 `program`은 "실행 가능한 설명서"에 가깝고, runtime에 넘겨질 때 실행됩니다.

// =============================================================================
// 1. Program value 선언: 아직 아무 것도 실행되지 않는다
// =============================================================================

const program = Effect.gen(function* () {
  yield* Console.log("[good] 이제서야 side effect가 실행됨")
  return { id: "1", name: "Ada" }
})

// =============================================================================
// 2. Demo: program을 만든 시점과 실행 시점을 분리해서 보여준다
// =============================================================================

export const demo = Effect.gen(function* () {
  yield* Console.log("\n[02 GOOD] Effect는 실행 결과가 아니라 프로그램 값")
  yield* Console.log("program을 만들었지만 아직 아무 side effect도 실행되지 않았다")

  // `yield* program` 지점에서 runtime이 program을 실행합니다.
  const user = yield* program
  yield* Console.log(`실행 결과: ${JSON.stringify(user)}`)
})
