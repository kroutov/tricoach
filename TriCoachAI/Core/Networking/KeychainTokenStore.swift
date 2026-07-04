import Foundation
import Security

/// Stores the backend session JWT in the Keychain (survives app restarts,
/// not synced to iCloud, cleared on sign-out).
final class KeychainTokenStore {
    static let shared = KeychainTokenStore()

    private let service = "com.tricoach.ai.session"
    private let account = "jwt"
    /// Keychain access-group entitlements require code signing. A build
    /// with no configured Apple Developer Team (e.g. Simulator-only, no
    /// signing identity available) can't write to the Keychain at all —
    /// `SecItemAdd` fails with `errSecMissingEntitlement`. Falling back to
    /// UserDefaults keeps the app usable in that case; a properly signed
    /// build always succeeds on the Keychain path and never touches this.
    private let fallbackDefaultsKey = "com.tricoach.ai.session.jwt.fallback"

    var token: String? {
        readToken() ?? UserDefaults.standard.string(forKey: fallbackDefaultsKey)
    }

    func save(_ token: String) {
        let query = baseQuery()
        SecItemDelete(query as CFDictionary)
        var attributes = query
        attributes[kSecValueData as String] = Data(token.utf8)
        // Never migrates to a different device (no iCloud Keychain sync,
        // no unencrypted device-backup restore elsewhere) and only readable
        // once the device has been unlocked at least once since boot —
        // appropriate for a session token that's meaningless off-device.
        attributes[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        let status = SecItemAdd(attributes as CFDictionary, nil)
        if status == errSecSuccess {
            UserDefaults.standard.removeObject(forKey: fallbackDefaultsKey)
        } else {
            UserDefaults.standard.set(token, forKey: fallbackDefaultsKey)
        }
    }

    func clear() {
        SecItemDelete(baseQuery() as CFDictionary)
        UserDefaults.standard.removeObject(forKey: fallbackDefaultsKey)
    }

    private func readToken() -> String? {
        var query = baseQuery()
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess, let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    private func baseQuery() -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
    }
}
