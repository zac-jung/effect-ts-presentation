// =============================================================================
// 0. 이 파일의 목적
// =============================================================================
// Effect.ts 내부 구현을 그대로 재현하는 것이 아니라,
// generator 기반 IoC가 어떤 모양으로 동작하는지 보여주는 아주 작은 runtime입니다.
//
// 핵심 흐름:
// 1. TypeTag로 "필요한 capability"를 선언한다.
// 2. generator program은 직접 실행하지 않고 Instruction을 yield 한다.
// 3. runtime이 Instruction을 해석한다.
// 4. runtime이 service lookup / async 실행 / generator resume을 담당한다.
// 5. 같은 program을 live runtime과 mock runtime에서 실행한다.

// =============================================================================
// 1. Domain model: 프로그램이 최종적으로 다루는 데이터
// =============================================================================

type User = {
  readonly id: string
  readonly name: string
}

// =============================================================================
// 2. Service capability: 프로그램이 필요로 하는 외부 능력들
// =============================================================================
// 여기서는 구현체를 만들지 않습니다.
// "이런 능력이 필요하다"는 interface만 먼저 선언합니다.

type HttpClient = {
  readonly getUser: () => Promise<User>
  readonly getPermissions: (userId: string) => Promise<ReadonlyArray<string>>
}

type Logger = {
  readonly info: (message: string) => void | Promise<void>
}

type Analytics = {
  readonly track: (event: string, payload: unknown) => void | Promise<void>
}

// =============================================================================
// 3. TypeTag: service를 runtime context에서 찾기 위한 typed key
// =============================================================================
// Effect.ts의 Context.Tag를 아주 작게 흉내낸 것입니다.
//
// 중요한 점:
// - TypeTag는 런타임에서는 key를 가진 객체입니다.
// - 타입 레벨에서는 TypeTag<Service>가 어떤 Service를 가리키는지 기억합니다.
// - 아래 구현은 Map key로 tag object 자체를 쓰므로 singleton처럼 같은 tag 값을 공유해야 합니다.

class TypeTag<Service> {
  // phantom field: 타입 정보만 남기기 위한 필드입니다.
  // declare를 사용했기 때문에 JavaScript 런타임 필드로 emit되지 않습니다.
  declare readonly _Service: Service

  constructor(readonly key: string) {}
}

const tag = <Service>(key: string) => new TypeTag<Service>(key)

// 이 세 값이 mini runtime의 service identifier입니다.
const HttpClient = tag<HttpClient>("HttpClient")
const Logger = tag<Logger>("Logger")
const Analytics = tag<Analytics>("Analytics")

// =============================================================================
// 4. RuntimeContext: runtime이 들고 있는 service registry
// =============================================================================
// program은 context를 직접 받지 않습니다.
// 대신 `yield* service(HttpClient)` 같은 Instruction을 만들고,
// runtime이 context에서 실제 구현체를 찾아 generator 안으로 넣어줍니다.

type RuntimeContext = {
  readonly get: <Service>(tag: TypeTag<Service>) => Service
}

// =============================================================================
// 5. Instruction: generator가 runtime에게 넘기는 명령
// =============================================================================
// generator는 실제 side effect를 실행하지 않고 Instruction을 yield합니다.
// runtime은 Instruction의 kind/label을 보고 무엇을 할지 결정합니다.
//
// `[Symbol.iterator]`를 구현한 이유:
// - `yield* service(HttpClient)` 문법을 쓰기 위해서입니다.
// - generator가 Instruction을 yield하고 멈춥니다.
// - runtime이 Instruction 실행 결과를 `iterator.next(result)`로 다시 넣어줍니다.
// - 그러면 `yield* service(HttpClient)` 표현식의 결과가 Service 타입으로 보입니다.

type InstructionKind = "service" | "async"

class Instruction<A> {
  constructor(
    readonly kind: InstructionKind,
    readonly label: string,
    readonly run: (context: RuntimeContext) => Promise<A>
  ) {}

  *[Symbol.iterator](): Generator<Instruction<A>, A, unknown> {
    const value = yield this
    return value as A
  }
}

// =============================================================================
// 6. Instruction constructor: program에서 사용할 작은 DSL
// =============================================================================
// service(...)
// - runtime context에서 service implementation을 가져오는 Instruction입니다.
//
// asyncStep(...)
// - Promise/async 작업을 runtime에게 맡기는 Instruction입니다.

const service = <Service>(tag: TypeTag<Service>) =>
  new Instruction("service", tag.key, async (context) => context.get(tag))

const asyncStep = <A>(label: string, run: () => A | Promise<A>) =>
  new Instruction("async", label, async () => run())

// =============================================================================
// 7. Runtime interpreter: Instruction을 실제로 실행하는 주체
// =============================================================================
// program은 Generator입니다.
// runtime은 generator를 한 step씩 진행하면서 다음 일을 반복합니다.
//
// 1. iterator.next()로 다음 Instruction을 받는다.
// 2. Instruction을 실행한다.
// 3. 실행 결과를 iterator.next(result)로 generator 안에 다시 넣는다.
// 4. generator가 done 될 때까지 반복한다.
//
// 이 예제는 설명용 mini runtime이라 happy path 중심입니다.
// 실제 Effect runtime은 failure, interruption, finalizer, scope 등을 훨씬 정교하게 다룹니다.

type Program<A> = Generator<Instruction<unknown>, A, unknown>

type Runtime = {
  readonly run: <A>(program: () => Program<A>) => Promise<A>
}

const makeRuntime = (services: ReadonlyMap<TypeTag<unknown>, unknown>): Runtime => {
  const context: RuntimeContext = {
    get: <Service>(tag: TypeTag<Service>) => {
      if (!services.has(tag)) {
        throw new Error(`Missing service: ${tag.key}`)
      }
      return services.get(tag) as Service
    }
  }

  return {
    run: async (program) => {
      const iterator = program()
      let state = iterator.next()

      while (!state.done) {
        const instruction = state.value

        // runtime이 지금 어떤 Instruction을 해석하는지 보여주기 위한 trace입니다.
        console.log(`[runtime] ${instruction.kind}: ${instruction.label}`)

        const result = await instruction.run(context)
        state = iterator.next(result)
      }

      return state.value
    }
  }
}

const sleep = (millis: number) => new Promise((resolve) => setTimeout(resolve, millis))

// =============================================================================
// 8. Program: business flow는 구현체를 모른다
// =============================================================================
// 이 함수가 발표에서 가장 중요한 부분입니다.
//
// loadUserDashboard는 다음을 모릅니다.
// - HTTP가 실제 네트워크인지 mock인지
// - Logger가 console인지 memory array인지
// - Analytics가 실제 SDK인지 테스트 recorder인지
//
// generator program은 오직 필요한 capability와 실행 순서만 선언합니다.

function* loadUserDashboard() {
  // 1) 필요한 capability를 runtime에게 요청한다.
  const http = yield* service(HttpClient)
  const logger = yield* service(Logger)
  const analytics = yield* service(Analytics)

  // 2) 복잡한 async process를 순서대로 읽히는 코드로 작성한다.
  yield* asyncStep("logger.info(start)", () => logger.info("start dashboard load"))

  const user = yield* asyncStep("http.getUser", () => http.getUser())
  const permissions = yield* asyncStep("http.getPermissions", () =>
    http.getPermissions(user.id)
  )

  yield* asyncStep("analytics.track", () =>
    analytics.track("dashboard_loaded", { userId: user.id, permissions })
  )

  // 3) business result만 반환한다.
  return {
    user,
    canManageUsers: permissions.includes("admin")
  }
}

// =============================================================================
// 9. Live runtime: 실제처럼 동작하는 구현체를 제공한다
// =============================================================================
// 같은 program에 어떤 service map을 제공하느냐에 따라 실행 세계가 바뀝니다.

const makeLiveRuntime = () =>
  makeRuntime(
    new Map<TypeTag<unknown>, unknown>([
      [
        HttpClient,
        {
          getUser: async () => {
            await sleep(100)
            return { id: "1", name: "Ada" }
          },
          getPermissions: async (_userId: string) => {
            await sleep(100)
            return ["read", "admin"]
          }
        } satisfies HttpClient
      ],
      [
        Logger,
        { info: (message) => console.log(`[live logger] ${message}`) } satisfies Logger
      ],
      [
        Analytics,
        {
          track: (event, payload) =>
            console.log(`[live analytics] ${event} ${JSON.stringify(payload)}`)
        } satisfies Analytics
      ]
    ])
  )

// =============================================================================
// 10. Mock runtime: 같은 program을 테스트하기 쉬운 세계에서 실행한다
// =============================================================================
// program 코드는 그대로 두고 runtime만 교체합니다.
//
// 여기서는:
// - HTTP 응답을 즉시 반환한다.
// - logger는 console 대신 memory array에 기록한다.
// - analytics도 실제 SDK 호출 대신 memory array에 기록한다.
//
// 이것이 "복잡한 비동기 프로세스를 쉽게 mocking한다"는 의미입니다.

const makeMockRuntime = () => {
  const logs: Array<string> = []
  const events: Array<{ readonly event: string; readonly payload: unknown }> = []

  const runtime = makeRuntime(
    new Map<TypeTag<unknown>, unknown>([
      [
        HttpClient,
        {
          getUser: async () => ({ id: "test-user", name: "Mock Ada" }),
          getPermissions: async (_userId: string) => ["read"]
        } satisfies HttpClient
      ],
      [
        Logger,
        {
          info: (message) => {
            logs.push(message)
          }
        } satisfies Logger
      ],
      [
        Analytics,
        {
          track: (event, payload) => {
            events.push({ event, payload })
          }
        } satisfies Analytics
      ]
    ])
  )

  return { runtime, logs, events }
}

// =============================================================================
// 11. Demo runner: live runtime과 mock runtime을 비교해서 실행한다
// =============================================================================

export const demoMiniRuntime = async () => {
  console.log("\n[06 MINI RUNTIME] TypeTag + runtime + generator IoC 직접 구현")

  const liveResult = await makeLiveRuntime().run(loadUserDashboard)
  console.log("live result", liveResult)

  console.log("\n[06 MINI RUNTIME] 같은 generator program을 mock runtime에서 실행")
  const mock = makeMockRuntime()
  const mockResult = await mock.runtime.run(loadUserDashboard)
  console.log("mock result", mockResult)
  console.log("mock logs", mock.logs)
  console.log("mock analytics events", mock.events)
}
