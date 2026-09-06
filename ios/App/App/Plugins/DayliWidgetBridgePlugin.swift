import Capacitor
import WidgetKit

/// The native side of lib/native/widget-bridge.ts. Registered with
/// Capacitor via the `CAPBridgedPlugin` conformance below (Capacitor 5+'s
/// Swift-only plugin registration — no separate Objective-C `.m` bridge
/// file needed).
///
/// Relies on `DayliWidgetSnapshot.swift` (ios/DayliWidget/) for the
/// `DayliWidgetSnapshot`/`DayliWidgetStore` types — that file must be added
/// to BOTH this app target's and the DayliWidget extension target's
/// membership in Xcode (checkboxes in the File Inspector), not duplicated,
/// so the JSON shape can never drift between the two. See ios/README.md
/// step 5.
@objc(DayliWidgetBridgePlugin)
public class DayliWidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "DayliWidgetBridgePlugin"
    public let jsName = "DayliWidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "writeSnapshot", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearSnapshot", returnType: CAPPluginReturnPromise),
    ]

    @objc func writeSnapshot(_ call: CAPPluginCall) {
        guard let json = call.getString("json"), let data = json.data(using: .utf8) else {
            call.reject("Missing or invalid \"json\" argument")
            return
        }
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        do {
            let snapshot = try decoder.decode(DayliWidgetSnapshot.self, from: data)
            try DayliWidgetStore.save(snapshot)
            WidgetCenter.shared.reloadTimelines(ofKind: "DayliWidget")
            call.resolve()
        } catch {
            // A failed write must surface to the JS side (which already
            // swallows it as best-effort) rather than crash the app —
            // never force-try here.
            call.reject("Failed to save widget snapshot: \(error.localizedDescription)")
        }
    }

    @objc func clearSnapshot(_ call: CAPPluginCall) {
        DayliWidgetStore.clear()
        WidgetCenter.shared.reloadTimelines(ofKind: "DayliWidget")
        call.resolve()
    }
}
