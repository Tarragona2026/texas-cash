import Foundation
import Speech
import AVFoundation
import Capacitor

/// Dettatura con il riconoscimento vocale di Apple: parte da sola quando si tocca "Parla", senza passare dal microfono della tastiera.
/// Manda al web il testo mentre si parla (evento "partial") e un evento "end" quando finisce.
/// Ogni ascolto ha un numero (`generation`): le notifiche in ritardo di un ascolto già chiuso vengono ignorate,
/// così non spengono quello nuovo (era il motivo per cui dopo la prima traduzione il microfono non ripartiva).
@objc(TexasSpeechPlugin)
public class TexasSpeechPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "TexasSpeechPlugin"
    public let jsName = "TexasSpeech"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise)
    ]

    private var engine: AVAudioEngine?
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?
    private var generation = 0
    private var active = false          // c'è un ascolto in corso (il microfono è acceso o in chiusura)

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
        teardown()                                   // chiude un eventuale ascolto precedente, senza toccare l'audio del telefono
        generation += 1
        let mine = generation
        guard let recognizer = SFSpeechRecognizer(locale: Locale(identifier: lang)), recognizer.isAvailable else {
            call.reject("riconoscimento vocale non disponibile per questa lingua"); return
        }
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.record, mode: .measurement, options: [.duckOthers])
            try session.setActive(true, options: .notifyOthersOnDeactivation)
            let eng = AVAudioEngine()                // un motore nuovo a ogni ascolto: riusarlo dopo uno stop può restare muto
            let req = SFSpeechAudioBufferRecognitionRequest()
            req.shouldReportPartialResults = true
            let input = eng.inputNode
            input.installTap(onBus: 0, bufferSize: 1024, format: input.outputFormat(forBus: 0)) { buffer, _ in
                req.append(buffer)
            }
            eng.prepare()
            try eng.start()
            engine = eng
            request = req
            active = true
            task = recognizer.recognitionTask(with: req) { [weak self] result, error in
                DispatchQueue.main.async {
                    guard let self = self, self.generation == mine else { return }     // notifica di un ascolto vecchio: si ignora
                    if let r = result {
                        self.notifyListeners("partial", data: ["text": r.bestTranscription.formattedString, "final": r.isFinal])
                        if r.isFinal { self.finish(mine) }
                    }
                    if error != nil { self.finish(mine) }
                }
            }
            call.resolve()
        } catch {
            teardown()
            call.reject(error.localizedDescription)
        }
    }

    /// Smette di registrare. Il testo finale arriva ancora dal riconoscimento, poi `finish` chiude tutto.
    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if self.active {
                self.engine?.stop()
                self.engine?.inputNode.removeTap(onBus: 0)
                self.request?.endAudio()
            }
            call.resolve()
        }
    }

    /// Fine dell'ascolto numero `mine`: ripulisce, rimette l'audio normale (serve alla voce che legge la traduzione) e avvisa il web.
    private func finish(_ mine: Int) {
        guard generation == mine, active else { return }
        teardown()
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [])
        try? AVAudioSession.sharedInstance().setActive(true, options: [])
        notifyListeners("end", data: [:])
    }

    private func teardown() {
        active = false
        if let e = engine { if e.isRunning { e.stop() }; e.inputNode.removeTap(onBus: 0) }
        request?.endAudio()
        task?.cancel()
        engine = nil
        request = nil
        task = nil
    }
}
