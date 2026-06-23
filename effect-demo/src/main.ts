import { Console, Effect } from "effect"
import { submitProfileBad } from "./01-effect-problem/bad.js"
import { demo as effectProblemGood } from "./01-effect-problem/good.js"
import { demoBad as effectAsValueBad } from "./02-effect-as-value/bad.js"
import { demo as effectAsValueGood } from "./02-effect-as-value/good.js"
import { loadUserBad as runtimeLayerBad } from "./03-runtime-layer/bad.js"
import { demo as runtimeLayerGood } from "./03-runtime-layer/good.js"
import { loadUserWithTimeoutBad } from "./04-time-runtime/bad.js"
import { demo as timeRuntimeGood } from "./04-time-runtime/good.js"
import { callerBad as errorModelingBad } from "./05-error-modeling/bad.js"
import { demo as errorModelingGood } from "./05-error-modeling/good.js"
import { demo as errorTypeContract } from "./05-error-modeling/type-contract.js"
import { loadUserAsyncAwait } from "./06-generator-ioc/bad.js"
import { demo as generatorIocGood } from "./06-generator-ioc/good.js"
import { demoMiniRuntime } from "./06-generator-ioc/mini-runtime.js"

type DemoName = keyof typeof demos

const asyncDemo = (run: () => Promise<unknown>) =>
  Effect.tryPromise({
    try: run,
    catch: (error) => error
  }).pipe(
    Effect.flatMap((result) => (result === undefined ? Effect.void : Console.log(result)))
  )

const demos = {
  "01:bad": asyncDemo(() => submitProfileBad({ name: "Ada" })),
  "01:good": effectProblemGood,
  "02:bad": asyncDemo(effectAsValueBad),
  "02:good": effectAsValueGood,
  "03:bad": asyncDemo(runtimeLayerBad),
  "03:good": runtimeLayerGood,
  "04:bad": asyncDemo(loadUserWithTimeoutBad),
  "04:good": timeRuntimeGood,
  "05:bad": asyncDemo(errorModelingBad),
  "05:good": errorModelingGood,
  "05:type-contract": errorTypeContract,
  "06:bad": asyncDemo(loadUserAsyncAwait),
  "06:good": generatorIocGood,
  "06:mini-runtime": asyncDemo(demoMiniRuntime)
} satisfies Record<string, Effect.Effect<void, unknown, never>>

const defaultDemoNames: ReadonlyArray<DemoName> = [
  "01:good",
  "02:good",
  "03:good",
  "04:good",
  "05:good",
  "05:type-contract",
  "06:good",
  "06:mini-runtime"
]

const printUsage = Effect.gen(function* () {
  yield* Console.log("Usage: pnpm start [demo-name]")
  yield* Console.log("")
  yield* Console.log("Examples:")
  yield* Console.log("  pnpm start")
  yield* Console.log("  pnpm start 01:bad")
  yield* Console.log("  pnpm start 06:mini-runtime")
  yield* Console.log("")
  yield* Console.log("Available demo names:")
  for (const name of Object.keys(demos)) {
    yield* Console.log(`  - ${name}`)
  }
})

const runDemo = (name: DemoName) =>
  Effect.gen(function* () {
    yield* Console.log(`\n>>> ${name}`)
    yield* demos[name]
  })

const runSelected = (arg: string | undefined) =>
  Effect.gen(function* () {
    if (arg === "help" || arg === "--help" || arg === "-h") {
      return yield* printUsage
    }

    if (arg) {
      if (Object.hasOwn(demos, arg)) {
        return yield* runDemo(arg as DemoName)
      }

      yield* Console.error(`Unknown demo name: ${arg}`)
      yield* printUsage
      yield* Effect.sync(() => {
        process.exitCode = 1
      })
      return
    }

    yield* Console.log("Effect.ts live coding examples")
    yield* Console.log(
      "슬라이드 흐름에 맞춰 bad/good 예제를 선택해서 실행할 수 있습니다."
    )
    yield* Console.log("개별 실행 예: pnpm start 01:bad, pnpm start 06:mini-runtime")

    for (const name of defaultDemoNames) {
      yield* runDemo(name)
    }
  })

const runCli = (program: Effect.Effect<void, unknown, never>) => {
  Effect.runPromise(program).catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
}

runCli(runSelected(process.argv[2]))
