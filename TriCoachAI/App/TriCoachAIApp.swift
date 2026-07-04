import SwiftUI

@main
struct TriCoachAIApp: App {
    private let container: DependencyContainer

    init() {
        // UI tests launch with this flag to start from a clean, in-memory
        // store instead of whatever was persisted by a previous run.
        let isUITesting = ProcessInfo.processInfo.arguments.contains("-uiTestReset")
        container = DependencyContainer(modelContainer: PersistenceContainer.make(inMemory: isUITesting))
    }

    var body: some Scene {
        WindowGroup {
            RootView(container: container)
        }
    }
}
