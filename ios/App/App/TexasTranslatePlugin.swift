import Foundation
import UIKit
import SwiftUI
import Translation
import Capacitor

/// Traduzione con il motore di Apple (framework Translation, iOS 18 o più recente).
/// Tutto avviene sul telefono. Apple permette di usarlo solo da una vista SwiftUI: qui ne viene messa una invisibile
/// per il tempo di una traduzione. Se la lingua non è ancora scaricata, iOS mostra da solo la richiesta di scaricarla.
@available(iOS 18.0, *)
private struct TranslateHost: View {
    let text: String
    let source: Locale.Language
    let target: Locale.Language
    let done: (Result<String, Error>) -> Void
    @State private var config: TranslationSession.Configuration?

    var body: some View {
        Color.clear
            .frame(width: 1, height: 1)
            .translationTask(config) { session in
                do {
                    let response = try await session.translate(text)
                    done(.success(response.targetText))
                } catch {
                    done(.failure(error))
                }
            }
            .onAppear { config = TranslationSession.Configuration(source: source, target: target) }
    }
}

@objc(TexasTranslatePlugin)
public class TexasTranslatePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "TexasTranslatePlugin"
    public let jsName = "TexasTranslate"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "translate", returnType: CAPPluginReturnPromise)
    ]

    @objc func translate(_ call: CAPPluginCall) {
        guard let text = call.getString("text"), !text.isEmpty,
              let source = call.getString("source"), let target = call.getString("target") else {
            call.reject("testo o lingue mancanti"); return
        }
        guard #available(iOS 18.0, *) else { call.reject("serve iOS 18 o più recente"); return }
        Task { @MainActor in
            // prima si guarda se la coppia di lingue è disponibile: se non lo è, si torna subito al servizio di riserva
            let status = await LanguageAvailability().status(from: Locale.Language(identifier: source), to: Locale.Language(identifier: target))
            if status == .unsupported { call.reject("coppia di lingue non supportata"); return }
            let waitSeconds: Double = (status == .installed) ? 30 : 180     // se la lingua va scaricata, iOS chiede il permesso e serve più tempo
            guard let parent = self.bridge?.viewController else { call.reject("schermata non disponibile"); return }
            var finished = false
            var host: UIHostingController<TranslateHost>?
            let finish: (Result<String, Error>) -> Void = { result in
                DispatchQueue.main.async {
                    if finished { return }
                    finished = true
                    host?.willMove(toParent: nil)
                    host?.view.removeFromSuperview()
                    host?.removeFromParent()
                    host = nil
                    switch result {
                    case .success(let out): call.resolve(["text": out])
                    case .failure(let err): call.reject(err.localizedDescription)
                    }
                }
            }
            let view = TranslateHost(text: text, source: Locale.Language(identifier: source),
                                     target: Locale.Language(identifier: target), done: finish)
            let controller = UIHostingController(rootView: view)
            controller.view.backgroundColor = .clear
            controller.view.frame = CGRect(x: 0, y: 0, width: 1, height: 1)
            parent.addChild(controller)
            parent.view.addSubview(controller.view)
            controller.didMove(toParent: parent)
            host = controller
            DispatchQueue.main.asyncAfter(deadline: .now() + waitSeconds) {
                finish(.failure(NSError(domain: "texas", code: 1, userInfo: [NSLocalizedDescriptionKey: "tempo scaduto"])))
            }
        }
    }
}
