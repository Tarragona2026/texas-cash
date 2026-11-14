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
        CAPPluginMethod(name: "saveImage", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "capture", returnType: CAPPluginReturnPromise)
    ]
    private var cam: CameraDelegate?

    /// Fotocamera di iOS con il flash SPENTO (quella aperta dal web lo mette in automatico).
    /// Foto e video si scelgono dentro la fotocamera. Restituisce il percorso di un file temporaneo.
    @objc func capture(_ call: CAPPluginCall) {
        let wantVideo = call.getBool("video", true)
        let toRoll = call.getBool("saveToRoll", false)
        DispatchQueue.main.async {
            guard UIImagePickerController.isSourceTypeAvailable(.camera) else { call.reject("fotocamera non disponibile"); return }
            let picker = UIImagePickerController()
            picker.sourceType = .camera
            picker.mediaTypes = wantVideo ? ["public.image", "public.movie"] : ["public.image"]
            picker.cameraFlashMode = .off
            picker.videoQuality = .typeHigh
            self.bridge?.saveCall(call)
            let d = CameraDelegate(call: call, toRoll: toRoll) { [weak self] in self?.bridge?.releaseCall(call); self?.cam = nil }
            self.cam = d
            picker.delegate = d
            picker.modalPresentationStyle = .fullScreen
            guard let vc = self.bridge?.viewController else { call.reject("schermata non disponibile"); return }
            vc.present(picker, animated: true)
        }
    }

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


final class CameraDelegate: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
    private let call: CAPPluginCall
    private let toRoll: Bool
    private let done: () -> Void
    init(call: CAPPluginCall, toRoll: Bool, done: @escaping () -> Void) { self.call = call; self.toRoll = toRoll; self.done = done }

    func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
        picker.dismiss(animated: true) { self.call.resolve(["cancelled": true]); self.done() }
    }

    func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
        let tmp = URL(fileURLWithPath: NSTemporaryDirectory())
        var out: [String: Any]? = nil
        if let movie = info[.mediaURL] as? URL {
            let dest = tmp.appendingPathComponent("cam-\(UUID().uuidString).mov")
            try? FileManager.default.removeItem(at: dest)
            if (try? FileManager.default.copyItem(at: movie, to: dest)) != nil {
                out = ["kind": "video", "path": dest.path]
                if toRoll { save(url: dest, video: true) }
            }
        } else if let img = info[.originalImage] as? UIImage, let data = img.jpegData(compressionQuality: 0.92) {
            let dest = tmp.appendingPathComponent("cam-\(UUID().uuidString).jpg")
            if (try? data.write(to: dest)) != nil {
                out = ["kind": "photo", "path": dest.path]
                if toRoll { save(url: dest, video: false) }
            }
        }
        picker.dismiss(animated: true) {
            if let o = out { self.call.resolve(o) } else { self.call.reject("scatto non riuscito") }
            self.done()
        }
    }

    private func save(url: URL, video: Bool) {
        PHPhotoLibrary.requestAuthorization(for: .addOnly) { status in
            guard status == .authorized || status == .limited else { return }
            PHPhotoLibrary.shared().performChanges({
                if video { PHAssetCreationRequest.creationRequestForAssetFromVideo(atFileURL: url) }
                else { PHAssetCreationRequest.forAsset().addResource(with: .photo, fileURL: url, options: nil) }
            }, completionHandler: nil)
        }
    }
}
