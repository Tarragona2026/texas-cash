import UIKit
import Capacitor

/// Schermata principale dell'app: uguale a quella di Capacitor, più i piccoli componenti nativi scritti per questa app.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(TexasOcrPlugin())
    }
}
