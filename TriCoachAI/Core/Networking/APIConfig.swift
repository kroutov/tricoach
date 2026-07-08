import Foundation

enum APIConfig {
    /// Branches on simulator-vs-device rather than Debug-vs-Release:
    /// `localhost` is exempt from App Transport Security and, in the
    /// Simulator, resolves to the Mac itself (sharing its network stack),
    /// so it reaches `npm run dev` with no Info.plist exceptions. On a real
    /// device — even a Debug build, which is Xcode's default "Run"
    /// configuration — `localhost` would resolve to the device's own
    /// loopback instead and silently fail to reach anything, so devices
    /// always use the deployed backend.
    static let baseURL: URL = {
        #if targetEnvironment(simulator)
        return URL(string: "http://localhost:3000/api/v1")!
        #else
        return URL(string: "https://tricoach-9ob8.onrender.com/api/v1")!
        #endif
    }()
}
