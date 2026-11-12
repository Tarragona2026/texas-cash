import Foundation
import UIKit
import Vision
import Capacitor

/// Lettura del testo di una foto con il motore di Apple (Vision). Tutto avviene sul telefono: la foto non esce dall'app.
/// Restituisce le righe trovate con la loro posizione (coordinate tra 0 e 1, origine in basso a sinistra).
@objc(TexasOcrPlugin)
public class TexasOcrPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "TexasOcrPlugin"
    public let jsName = "TexasOcr"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "detectText", returnType: CAPPluginReturnPromise)
    ]

    @objc func detectText(_ call: CAPPluginCall) {
        guard var b64 = call.getString("base64") else { call.reject("base64 mancante"); return }
        if let r = b64.range(of: "base64,") { b64 = String(b64[r.upperBound...]) }
        guard let data = Data(base64Encoded: b64, options: .ignoreUnknownCharacters),
              let image = UIImage(data: data), let cg = image.cgImage else {
            call.reject("immagine non valida"); return
        }
        DispatchQueue.global(qos: .userInitiated).async {
            let request = VNRecognizeTextRequest { request, error in
                if let error = error { call.reject(error.localizedDescription); return }
                let observations = (request.results as? [VNRecognizedTextObservation]) ?? []
                var lines: [[String: Any]] = []
                for o in observations {
                    guard let c = o.topCandidates(1).first else { continue }
                    let b = o.boundingBox
                    lines.append(["text": c.string, "x": Double(b.minX), "y": Double(b.minY),
                                  "w": Double(b.width), "h": Double(b.height), "conf": Double(c.confidence)])
                }
                call.resolve(["lines": lines])
            }
            request.recognitionLevel = .accurate
            request.usesLanguageCorrection = false          // sugli scontrini contano cifre e sigle: la correzione "da dizionario" le rovina
            request.recognitionLanguages = ["en-US", "it-IT"]
            do { try VNImageRequestHandler(cgImage: cg, orientation: .up, options: [:]).perform([request]) }
            catch { call.reject(error.localizedDescription) }
        }
    }
}
