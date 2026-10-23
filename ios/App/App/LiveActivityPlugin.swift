// Lets the web app start, update and end Kudi's Live Activity (Dynamic Island).
// JS: Capacitor.Plugins.LiveActivity.start({petName, title, subtitle, dueAt, isLate}) / .end()
import ActivityKit
import Capacitor
import Foundation

@objc(LiveActivityPlugin)
public class LiveActivityPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LiveActivityPlugin"
    public let jsName = "LiveActivity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "end", returnType: CAPPluginReturnPromise),
    ]

    @objc func start(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else { return call.resolve(["started": false]) }
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return call.resolve(["started": false]) }
        let state = KudiActivityAttributes.ContentState(
            title: call.getString("title") ?? "",
            subtitle: call.getString("subtitle") ?? "",
            dueAt: Date(timeIntervalSince1970: (call.getDouble("dueAt") ?? Date().timeIntervalSince1970 * 1000) / 1000),
            isLate: call.getBool("isLate") ?? false
        )
        Task {
            // one Kudi activity at a time: update it if it is already running
            if let current = Activity<KudiActivityAttributes>.activities.first {
                await current.update(ActivityContent(state: state, staleDate: nil))
                return call.resolve(["started": true, "updated": true])
            }
            do {
                _ = try Activity.request(attributes: KudiActivityAttributes(petName: call.getString("petName") ?? ""),
                                         content: ActivityContent(state: state, staleDate: nil))
                call.resolve(["started": true])
            } catch {
                call.reject("Could not start the Live Activity", nil, error)
            }
        }
    }

    @objc func end(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else { return call.resolve() }
        Task {
            for activity in Activity<KudiActivityAttributes>.activities {
                await activity.end(nil, dismissalPolicy: .immediate)
            }
            call.resolve()
        }
    }
}
