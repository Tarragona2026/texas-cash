import Foundation
import UIKit
import Photos
import Capacitor

/// Salva una foto nel rullino dell'iPhone (solo "aggiungi", senza poter leggere le altre foto).
/// Serve perché la fotocamera aperta dal web non salva da sola la foto nel rullino.
@objc(TexasPhotosPlugin)
public class TexasPhotosPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "TexasPhotosPlugin"
    public let jsName = "TexasPhotos"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "saveImage", returnType: CAPPluginReturnPromise)
    ]

    @objc func saveImage(_ call: CAPPluginCall) {
        guard var b64 = call.getString("base64") else { call.reject("base64 mancante"); return }
        if let r = b64.range(of: "base64,") { b64 = String(b64[r.upperBound...]) }
        guard let data = Data(base64Encoded: b64, options: .ignoreUnknownCharacters), !data.isEmpty else {
            call.reject("immagine non valida"); return
        }
        PHPhotoLibrary.requestAuthorization(for: .addOnly) { status in
            guard status == .authorized || status == .limited else { call.reject("permesso negato"); return }
            PHPhotoLibrary.shared().performChanges({
                let req = PHAssetCreationRequest.forAsset()
                req.addResource(with: .photo, data: data, options: nil)   // la foto resta com'è, senza ricomprimerla
            }) { ok, error in
                if ok { call.resolve(["saved": true]) }
                else { call.reject(error?.localizedDescription ?? "salvataggio non riuscito") }
            }
        }
    }
}
