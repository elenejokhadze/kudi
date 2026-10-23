// Registers Kudi's own native plugins with Capacitor. Main.storyboard uses this class for the app's view controller.
import Capacitor
import UIKit

class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(LiveActivityPlugin())
    }
}
