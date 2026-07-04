import Foundation

enum APIConfig {
    /// `localhost` is exempt from App Transport Security by default, so
    /// Debug builds (Simulator, or a device on the same network as the Mac
    /// running `npm run dev`) talk to it with no Info.plist exceptions.
    ///
    /// A Release/Archive build must not silently point at `localhost` —
    /// replace the string below with the real deployed backend URL from
    /// `tricoach-backend/docs/DEPLOYMENT.md` before shipping. Left as an
    /// obvious placeholder rather than a working default so that shipping
    /// without updating it fails at first launch instead of failing subtly.
    static let baseURL: URL = {
        #if DEBUG
        return URL(string: "http://localhost:3000/api/v1")!
        #else
        let releaseBaseURLString = "https://REPLACE_ME_BEFORE_SHIPPING.example.com/api/v1"
        guard let url = URL(string: releaseBaseURLString), !releaseBaseURLString.contains("REPLACE_ME") else {
            fatalError("APIConfig.baseURL still points at the placeholder Release URL — set it to the deployed backend before archiving.")
        }
        return url
        #endif
    }()
}
