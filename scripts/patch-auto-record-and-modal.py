from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"Missing patch target: {label}")
    return text.replace(old, new, 1)


app_path = Path("app.js")
app = app_path.read_text(encoding="utf-8")

app = replace_once(
    app,
    """    isPitchStable: false,\n    currentFrequency: null,""",
    """    isPitchStable: false,\n    recordingArmed: false,\n    recordingQualifyingFrames: 0,\n    recordingCandidateKey: null,\n    recordingStats: null,\n    discardRecording: false,\n    currentFrequency: null,""",
    "automatic recording state",
)

app = replace_once(
    app,
    """      state.isPitchStable = state.stableFrames >= 8;\n      updatePitchUI(result, note);\n    } else {""",
    """      state.isPitchStable = state.stableFrames >= 8;\n      updatePitchUI(result, note);\n      evaluateAutomaticRecording(result, note, stable);\n    } else {""",
    "automatic recording evaluation for detected pitch",
)

app = replace_once(
    app,
    """      ui.qualityText.textContent = 'بانتظار نغمة واضحة';\n      setStatusDot(ui.qualityDot, false);\n    }\n    state.animationFrame = requestAnimationFrame(analyseAudio);""",
    """      ui.qualityText.textContent = 'بانتظار نغمة واضحة';\n      setStatusDot(ui.qualityDot, false);\n      evaluateAutomaticRecording(null, null, false);\n    }\n    state.animationFrame = requestAnimationFrame(analyseAudio);""",
    "automatic recording evaluation for missing pitch",
)

old_recording_block = """  function prepareRecording() {\n    if (!state.stream) {\n      showToast('شغّل الميكروفون أولًا قبل تجهيز تسجيل النغمة.');\n      return;\n    }\n    if (!window.MediaRecorder) {\n      showToast('التسجيل غير مدعوم في هذا المتصفح.');\n      return;\n    }\n    const durationMs = Math.max(350, (60000 / state.bpm) * state.durationBeats);\n    state.recordingChunks = [];\n    try {\n      state.mediaRecorder = new MediaRecorder(state.stream);\n      state.mediaRecorder.addEventListener('dataavailable', event => { if (event.data.size) state.recordingChunks.push(event.data); });\n      state.mediaRecorder.addEventListener('stop', saveRecording, { once: true });\n      state.mediaRecorder.start();\n      startPcmCapture();\n      $('#prepareButton span').textContent = 'جارٍ تسجيل النغمة…';\n      $('#prepareButton').disabled = true;\n      showToast(`بدأ تسجيل ${state.durationName}. حافظ على النغمة ثابتة.`);\n      state.recordingTimer = setTimeout(() => {\n        if (state.mediaRecorder?.state === 'recording') state.mediaRecorder.stop();\n      }, durationMs);\n    } catch (error) {\n      console.error(error);\n      showToast('تعذر بدء التسجيل.');\n    }\n  }\n\n  function saveRecording() {\n    const pcm = finishPcmCapture();\n    const blob = new Blob(state.recordingChunks, { type: state.mediaRecorder?.mimeType || 'audio/webm' });\n    const url = URL.createObjectURL(blob);\n    const note = state.currentNote || { english: '—', arabic: 'نغمة غير محددة' };\n    state.records.unshift({\n      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,\n      english: note.english,\n      arabic: note.arabic,\n      durationName: state.durationName,\n      type: 'غنة',\n      status: state.isPitchStable ? 'طبيعية' : 'غير ثابتة',\n      frequency: state.currentFrequency || 0,\n      blob,\n      url,\n      pcm,\n      sampleRate: state.audioContext?.sampleRate || 48000,\n      sample: false\n    });\n    $('#prepareButton span').textContent = 'تجهيز تسجيل النغمة';\n    $('#prepareButton').disabled = false;\n    renderRecords();\n    showToast('تم حفظ التسجيل بنجاح.');\n  }"""

new_recording_block = """  function recordingNoteKey(note) {\n    return note ? `${note.english}|${Number(note.target).toFixed(3)}` : null;\n  }\n\n  function resetRecordingQualification() {\n    state.recordingQualifyingFrames = 0;\n    state.recordingCandidateKey = null;\n  }\n\n  function setPrepareButtonState(mode, progress = 0) {\n    const button = $('#prepareButton');\n    const label = button.querySelector('span');\n    button.classList.toggle('is-armed', mode === 'armed');\n    button.classList.toggle('is-recording', mode === 'recording');\n    if (mode === 'armed') label.textContent = progress > 0 ? `تثبيت النغمة ${progress}%` : 'بانتظار نغمة مضبوطة…';\n    else if (mode === 'recording') label.textContent = 'جارٍ التسجيل التلقائي…';\n    else label.textContent = 'تجهيز تسجيل النغمة';\n  }\n\n  function cancelAutomaticRecording() {\n    state.recordingArmed = false;\n    resetRecordingQualification();\n    setPrepareButtonState('idle');\n    showToast('تم إلغاء انتظار التسجيل التلقائي.');\n  }\n\n  function prepareRecording() {\n    if (!state.stream) {\n      showToast('شغّل الميكروفون أولًا قبل تجهيز تسجيل النغمة.');\n      return;\n    }\n    if (!window.MediaRecorder) {\n      showToast('التسجيل غير مدعوم في هذا المتصفح.');\n      return;\n    }\n    if (state.mediaRecorder?.state === 'recording') return;\n    if (state.recordingArmed) {\n      cancelAutomaticRecording();\n      return;\n    }\n    state.recordingArmed = true;\n    state.discardRecording = false;\n    resetRecordingQualification();\n    setPrepareButtonState('armed');\n    showToast('تم تجهيز التسجيل. سيبدأ تلقائيًا بعد ثبات النغمة ودقتها.');\n  }\n\n  function evaluateAutomaticRecording(result, note, stable) {\n    const recorderActive = state.mediaRecorder?.state === 'recording';\n    const tolerance = Number($('#toleranceRange')?.value || 12);\n    const clarityThreshold = .65;\n    const key = recordingNoteKey(note);\n    const validFrame = Boolean(result && note && stable && Math.abs(note.cents) <= tolerance && result.clarity >= clarityThreshold);\n\n    if (recorderActive && state.recordingStats) {\n      const stats = state.recordingStats;\n      stats.totalFrames += 1;\n      const sameNote = key === stats.noteKey;\n      if (validFrame && sameNote) {\n        stats.validFrames += 1;\n        stats.centsSum += Math.abs(note.cents);\n        stats.claritySum += result.clarity;\n        stats.frequencySum += result.frequency;\n      } else {\n        stats.invalidFrames += 1;\n      }\n      return;\n    }\n\n    if (!state.recordingArmed) return;\n\n    if (!validFrame) {\n      resetRecordingQualification();\n      setPrepareButtonState('armed');\n      return;\n    }\n\n    if (state.recordingCandidateKey !== key) {\n      state.recordingCandidateKey = key;\n      state.recordingQualifyingFrames = 1;\n    } else {\n      state.recordingQualifyingFrames += 1;\n    }\n\n    const requiredFrames = 18;\n    const progress = Math.min(100, Math.round(state.recordingQualifyingFrames / requiredFrames * 100));\n    setPrepareButtonState('armed', progress);\n    if (state.recordingQualifyingFrames >= requiredFrames) beginAutomaticRecording(note, result);\n  }\n\n  function beginAutomaticRecording(note, result) {\n    if (!state.recordingArmed || state.mediaRecorder?.state === 'recording') return;\n    const durationMs = Math.max(350, (60000 / state.bpm) * state.durationBeats);\n    state.recordingChunks = [];\n    state.recordingStats = {\n      note: { ...note },\n      noteKey: recordingNoteKey(note),\n      totalFrames: 0,\n      validFrames: 0,\n      invalidFrames: 0,\n      centsSum: 0,\n      claritySum: 0,\n      frequencySum: 0,\n      initialFrequency: result.frequency\n    };\n    state.discardRecording = false;\n    try {\n      state.mediaRecorder = new MediaRecorder(state.stream);\n      state.mediaRecorder.addEventListener('dataavailable', event => { if (event.data.size) state.recordingChunks.push(event.data); });\n      state.mediaRecorder.addEventListener('stop', saveRecording, { once: true });\n      state.mediaRecorder.start();\n      startPcmCapture();\n      setPrepareButtonState('recording');\n      $('#prepareButton').disabled = true;\n      showToast(`النغمة ${note.arabic} مضبوطة. بدأ التسجيل تلقائيًا.`);\n      state.recordingTimer = setTimeout(() => {\n        if (state.mediaRecorder?.state === 'recording') state.mediaRecorder.stop();\n      }, durationMs);\n    } catch (error) {\n      console.error(error);\n      state.recordingStats = null;\n      $('#prepareButton').disabled = false;\n      state.recordingArmed = true;\n      resetRecordingQualification();\n      setPrepareButtonState('armed');\n      showToast('تعذر بدء التسجيل التلقائي.');\n    }\n  }\n\n  function saveRecording() {\n    const pcm = finishPcmCapture();\n    const stats = state.recordingStats;\n    const button = $('#prepareButton');\n    button.disabled = false;\n\n    if (state.discardRecording || !stats) {\n      state.recordingStats = null;\n      state.discardRecording = false;\n      state.recordingArmed = false;\n      resetRecordingQualification();\n      setPrepareButtonState('idle');\n      return;\n    }\n\n    const tolerance = Number($('#toleranceRange')?.value || 12);\n    const validRatio = stats.totalFrames ? stats.validFrames / stats.totalFrames : 0;\n    const averageCents = stats.validFrames ? stats.centsSum / stats.validFrames : Infinity;\n    const averageClarity = stats.validFrames ? stats.claritySum / stats.validFrames : 0;\n    const accepted = stats.totalFrames >= 6 && validRatio >= .85 && averageCents <= tolerance && averageClarity >= .65;\n\n    if (!accepted) {\n      state.recordingStats = null;\n      state.recordingArmed = true;\n      resetRecordingQualification();\n      setPrepareButtonState('armed');\n      showToast('لم يُحفظ التسجيل لأن النغمة فقدت الدقة أو الثبات. ثبّتها وسيعاد التسجيل تلقائيًا.');\n      return;\n    }\n\n    const blob = new Blob(state.recordingChunks, { type: state.mediaRecorder?.mimeType || 'audio/webm' });\n    const url = URL.createObjectURL(blob);\n    const averageFrequency = stats.validFrames ? stats.frequencySum / stats.validFrames : stats.initialFrequency;\n    const note = stats.note;\n    state.records.unshift({\n      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,\n      english: note.english,\n      arabic: note.arabic,\n      durationName: state.durationName,\n      type: 'غنة',\n      status: 'مضبوطة',\n      frequency: averageFrequency || 0,\n      averageCents: Number(averageCents.toFixed(2)),\n      clarity: Number((averageClarity * 100).toFixed(1)),\n      blob,\n      url,\n      pcm,\n      sampleRate: state.audioContext?.sampleRate || 48000,\n      sample: false\n    });\n    state.recordingStats = null;\n    state.recordingArmed = false;\n    resetRecordingQualification();\n    setPrepareButtonState('idle');\n    renderRecords();\n    showToast('تم اعتماد وحفظ التسجيل المضبوط تلقائيًا.');\n  }"""

app = replace_once(app, old_recording_block, new_recording_block, "automatic recording workflow")

app = replace_once(
    app,
    """  async function stopMicrophone() {\n    if (state.mediaRecorder?.state === 'recording') state.mediaRecorder.stop();""",
    """  async function stopMicrophone() {\n    state.recordingArmed = false;\n    resetRecordingQualification();\n    if (state.mediaRecorder?.state === 'recording') {\n      state.discardRecording = true;\n      state.mediaRecorder.stop();\n    }""",
    "discard recording when microphone stops",
)

app = replace_once(
    app,
    """    Object.assign(state, { stream: null, audioContext: null, analyser: null, source: null, animationFrame: null, stableFrames: 0, isPitchStable: false });\n    updateMicrophoneUI(false);""",
    """    Object.assign(state, { stream: null, audioContext: null, analyser: null, source: null, animationFrame: null, stableFrames: 0, isPitchStable: false, recordingStats: null });\n    $('#prepareButton').disabled = false;\n    setPrepareButtonState('idle');\n    updateMicrophoneUI(false);""",
    "reset automatic recording UI on microphone stop",
)

app_path.write_text(app, encoding="utf-8")

index_path = Path("index.html")
index = index_path.read_text(encoding="utf-8")
index = index.replace("styles.css?v=2026-08-06-r3", "styles.css?v=2026-08-06-r4")
index = index.replace("calibration.css?v=2026-08-06-r3", "calibration.css?v=2026-08-06-r4")
index = index.replace("app.js?v=2026-08-06-r3", "app.js?v=2026-08-06-r4")
index = index.replace("<div><h2>التسجيل</h2><p>ابدأ بعد استقرار النغمة</p></div>", "<div><h2>التسجيل</h2><p>يبدأ تلقائيًا بعد ثبات النغمة ودقتها</p></div>")
index_path.write_text(index, encoding="utf-8")

calibration_path = Path("calibration.css")
calibration = calibration_path.read_text(encoding="utf-8")
marker = "/* Advanced modal containment and automatic recording — 2026-08-06 */"
if marker in calibration:
    calibration = calibration.split(marker, 1)[0].rstrip()
calibration += r'''

/* Advanced modal containment and automatic recording — 2026-08-06 */
.modal.modal--advanced {
  width: min(980px, calc(100vw - 24px));
  max-width: calc(100vw - 24px);
  max-height: calc(100dvh - 24px);
  margin: auto;
  padding: 0;
  overflow: hidden;
  overscroll-behavior: contain;
}

.modal--advanced form {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  max-height: calc(100dvh - 24px);
  padding: 0;
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-gutter: stable;
}

.modal--advanced form > header {
  position: sticky;
  top: 0;
  z-index: 5;
  margin: 0;
  padding: 18px 20px 14px;
  border-bottom: 1px solid rgba(215, 157, 69, .24);
  background: rgba(1, 29, 32, .97);
  backdrop-filter: blur(12px);
}

.modal--advanced .advanced-settings-grid {
  width: 100%;
  min-width: 0;
  margin: 0;
  padding: 14px 18px;
}

.modal--advanced .settings-section,
.modal--advanced .settings-section > *,
.modal--advanced .inline-settings,
.modal--advanced .inline-settings > *,
.modal--advanced .diagnostics-panel,
.modal--advanced .diagnostics-panel > * {
  min-width: 0;
  max-width: 100%;
}

.modal--advanced .settings-section {
  overflow: hidden;
}

.modal--advanced .settings-section select,
.modal--advanced .settings-section input[type="number"],
.modal--advanced .settings-section input[type="text"],
.modal--advanced .settings-section input[type="range"] {
  width: 100%;
  max-width: 100%;
}

.modal--advanced .range-setting span,
.modal--advanced .diagnostics-panel div {
  min-width: 0;
  flex-wrap: wrap;
}

.modal--advanced .diagnostics-panel strong {
  min-width: 0;
  max-width: 100%;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.modal--advanced .advanced-footer {
  position: sticky;
  bottom: 0;
  z-index: 5;
  margin: 0;
  padding: 12px 18px 16px;
  border-top: 1px solid rgba(215, 157, 69, .24);
  background: rgba(1, 29, 32, .97);
  backdrop-filter: blur(12px);
}

.modal--advanced .advanced-footer .primary-button {
  width: min(300px, 100%);
  margin: 0;
}

.gold-button.is-armed {
  border-color: rgba(67, 222, 212, .82);
  background: linear-gradient(145deg, rgba(14, 105, 102, .96), rgba(4, 65, 65, .98));
  box-shadow: 0 0 0 3px rgba(67, 222, 212, .1), 0 0 22px rgba(67, 222, 212, .22);
}

.gold-button.is-recording {
  border-color: rgba(82, 217, 138, .9);
  background: linear-gradient(145deg, rgba(25, 131, 90, .98), rgba(6, 78, 57, .98));
  box-shadow: 0 0 0 3px rgba(82, 217, 138, .1), 0 0 24px rgba(82, 217, 138, .28);
}

@media (max-width: 900px) {
  .modal.modal--advanced {
    width: min(720px, calc(100vw - 16px));
    max-width: calc(100vw - 16px);
    max-height: calc(100dvh - 16px);
  }

  .modal--advanced form {
    max-height: calc(100dvh - 16px);
  }

  .modal--advanced .advanced-settings-grid {
    grid-template-columns: minmax(0, 1fr);
    padding-inline: 12px;
  }

  .modal--advanced .settings-section--admin {
    grid-column: auto;
  }
}

@media (max-width: 640px) {
  .modal.modal--advanced {
    width: calc(100vw - 8px);
    max-width: calc(100vw - 8px);
    max-height: calc(100dvh - 8px);
    border-radius: 14px;
  }

  .modal--advanced form {
    max-height: calc(100dvh - 8px);
  }

  .modal--advanced form > header {
    padding: 13px 12px 11px;
  }

  .modal--advanced .advanced-settings-grid {
    gap: 9px;
    padding: 10px 8px;
  }

  .modal--advanced .settings-section {
    padding: 11px;
  }

  .modal--advanced .admin-actions,
  .modal--advanced .inline-settings,
  .modal--advanced .diagnostics-panel {
    grid-template-columns: minmax(0, 1fr);
  }

  .modal--advanced .advanced-footer {
    padding: 10px 8px 12px;
  }

  .modal--advanced .advanced-footer .primary-button {
    width: 100%;
  }
}
'''
calibration_path.write_text(calibration, encoding="utf-8")

check_path = Path("scripts/check.mjs")
check = check_path.read_text(encoding="utf-8")
check = check.replace(
    '"applySettings"]',
    '"applySettings", "recordingArmed", "evaluateAutomaticRecording", "beginAutomaticRecording"]',
)
check_path.write_text(check, encoding="utf-8")
