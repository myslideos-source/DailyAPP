import Foundation

/// The small, privacy-conscious data snapshot the main dayli app writes into
/// the shared App Group container after every relevant change, and the
/// only thing this WidgetKit extension ever reads. Deliberately excludes
/// notes, full calendar history, or anything else the widget doesn't
/// render — see AGENTS/spec §11. Field-for-field mirror of the TypeScript
/// `WidgetSnapshotPayload` in lib/widget-snapshot.ts; keep both in sync by
/// hand, there is no shared schema generator between the two languages.
struct DayliWidgetSnapshot: Codable {
    let generatedAt: Date
    let userName: String
    let nextEvent: WidgetEvent?
    let openTasks: [WidgetTask]
    let openTaskCount: Int
}

struct WidgetEvent: Codable, Identifiable {
    let id: String
    /// Empty string means "suppressed by a privacy setting" (see
    /// lib/widget-snapshot.ts) — render only the time in that case, never
    /// a placeholder like "(kein Titel)" which would look like a real
    /// empty title rather than an intentionally hidden one.
    let title: String
    let startDate: Date
    let endDate: Date?
    let isAllDay: Bool
    /// "domenico" | "elisabeth" | "gemeinsam"
    let assignee: String
    let category: String?
}

struct WidgetTask: Codable, Identifiable {
    let id: String
    let title: String
    let dueDate: Date?
    let assignee: String
    let isCompleted: Bool
}

// MARK: - Shared storage

/// Reads/writes the snapshot file in the App Group container both the host
/// app and this extension belong to. The extension only ever calls
/// `load()` — writing is exclusively the host app's job (via
/// DayliWidgetBridgePlugin), so there is no risk of the widget and the app
/// racing to write the same file.
enum DayliWidgetStore {
    /// Must match the App Group ID entered in BOTH targets' "Signing &
    /// Capabilities" → "App Groups" in Xcode. See ios/README.md step 4.
    static let appGroupId = "group.com.dayli.app"
    private static let snapshotFileName = "widget-snapshot.json"

    private static var containerURL: URL? {
        FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroupId)
    }

    static func load() -> DayliWidgetSnapshot? {
        guard let url = containerURL?.appendingPathComponent(snapshotFileName),
              let data = try? Data(contentsOf: url) else { return nil }
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try? decoder.decode(DayliWidgetSnapshot.self, from: data)
    }

    /// Called by the host app (via DayliWidgetBridgePlugin), never by the
    /// widget extension itself.
    static func save(_ snapshot: DayliWidgetSnapshot) throws {
        guard let url = containerURL?.appendingPathComponent(snapshotFileName) else {
            throw CocoaError(.fileNoSuchFile)
        }
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let data = try encoder.encode(snapshot)
        try data.write(to: url, options: .atomic)
    }

    /// Called on sign-out so a stale personal snapshot never lingers on a
    /// logged-out device's home screen.
    static func clear() {
        guard let url = containerURL?.appendingPathComponent(snapshotFileName) else { return }
        try? FileManager.default.removeItem(at: url)
    }
}
