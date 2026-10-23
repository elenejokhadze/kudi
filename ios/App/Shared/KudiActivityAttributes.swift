// Shared by the app and the KudiWidget extension (add this file to both targets in Xcode).
// Describes what a Kudi Live Activity shows: the pet, the next care task and when it is due.
import ActivityKit
import Foundation

@available(iOS 16.1, *)
struct KudiActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var title: String      // "Dinner for Bubu"
        var subtitle: String   // "Puppy kibble · 110 g"
        var dueAt: Date        // countdown target
        var isLate: Bool
    }
    var petName: String
}
