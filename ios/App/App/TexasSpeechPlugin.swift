import Foundation
import Speech
import AVFoundation
import Capacitor

/// Dettatura con il riconoscimento vocale di Apple: parte da sola quando si tocca "Parla", senza passare dal microfono della tastiera.
/// Manda al web il testo mentre si parla (evento "partial") e un evento "end" quando finisce.
@objc(TexasSpeechPlugin)
public class TexasSpeechPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "TexasSpeechPlugin"
    public let jsName = "TexasSpeech"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise)
    ]

    private let engine = AVAudioEngine()
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?
    private var running = false

    @objc func start(_ call: CAPPluginCall) {
        let lang = call.getString("lang") ?? "it-IT"
        SFSpeechRecognizer.requestAuthorization { status in
            guard status == .authorized else { call.reject("permesso al riconoscimento vocale negato"); return }
            AVAudioSession.sharedInstance().requestRecordPermission { granted in
                guard granted else { call.reject("permesso al microfono negato"); return }
                DispatchQueue.main.async { self.begin(lang: lang, call: call) }
            }
        }
    }

    private func begin(lang: String, call: CAPPluginCall) {
        finishInternal(notify: false)
        guard let recognizer = SFSpeechRecognizer(locale: Locale(identifier: lang)), recognizer.isAvailable else {
            call.reject("riconoscimento vocale non disponibile per questa lingua"); return
        }
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.record, mode: .measurement, options: [.duckOthers])
            try session.setActive(true, options: .notifyOthersOnDeactivation)
            let req = SFSpeechAudioBufferRecognitionRequest()
            req.shouldReportPartialResults = true
            request = req
            let input = engine.inputNode
            input.removeTap(onBus: 0)
            input.installTap(onBus: 0, bufferSize: 1024, format: input.outputFormat(forBus: 0)) { [weak self] buffer, _ in
                self?.request?.append(buffer)
            }
            engine.prepare()
            try engine.start()
            running = true
            task = recognizer.recognitionTask(with: req) { [weak self] result, error in
                guard let self = self else { return }
                if let r = result {
                    self.notifyListeners("partial", data: ["text": r.bestTranscription.formattedString, "final": r.isFinal])
                    if r.isFinal { self.finishInternal(notify: true) }
                }
                if error != nil { self.finishInternal(notify: true) }
            }
            call.resolve()
        } catch {
            finishInternal(notify: false)
            call.reject(error.localizedDescription)
        }
    }

    /// Chiude l'ascolto. Il testo finale arriva ancora dal riconoscimento, poi si chiude tutto.
    @objc func stop(_ call: CAPPluginCall) {
        if running {
            engine.stop()
            engine.inputNode.removeTap(onBus: 0)
            request?.endAudio()
        }
        call.resolve()
    }

    private func finishInternal(notify: Bool) {
        let wasRunning = running
        running = false
        if engine.isRunning { engine.stop() }
        engine.inputNode.removeTap(onBus: 0)
        request?.endAudio()
        task?.cancel()
        request = nil
        task = nil
        // la voce che legge la traduzione ha bisogno dell'audio normale, non di quello del microfono
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [])
        try? AVAudioSession.sharedInstance().setActive(true, options: [])
        if notify && wasRunning { notifyListeners("end", data: [:]) }
    }
}
