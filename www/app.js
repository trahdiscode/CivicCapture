// ============================================================
// STEP 0: Connect to Supabase
// ============================================================
const SUPABASE_URL = "https://jcgixncnuwshktlrnxzu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjZ2l4bmNudXdzaGt0bHJueHp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1NzY4NzcsImV4cCI6MjEwNTE1Mjg3N30.-pO9sbeEudaMwwC-RO0HrqbMZnKjLX1HVKFe4740NqY";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// This will hold the logged-in citizen's row once step 1 is done.
let currentCitizen = null;

// Grab every element we'll need to touch, once, up front.
const citizenNameInput = document.getElementById("citizen-name");
const startBtn = document.getElementById("start-btn");
const citizenStatus = document.getElementById("citizen-status");

const captureSection = document.getElementById("capture-section");
const typeSelection = document.getElementById("type-selection");
const selectPhotoBtn = document.getElementById("select-photo-btn");
const selectVideoBtn = document.getElementById("select-video-btn");
const selectAudioBtn = document.getElementById("select-audio-btn");

const captureUi = document.getElementById("capture-ui");
const switchCameraBtn = document.getElementById("switch-camera-btn");
const takePhotoBtn = document.getElementById("take-photo-btn");
const recordVideoBtn = document.getElementById("record-video-btn");
const stopRecordBtn = document.getElementById("stop-record-btn");
const recordAudioBtn = document.getElementById("record-audio-btn");
const stopAudioBtn = document.getElementById("stop-audio-btn");
const cancelCaptureBtn = document.getElementById("cancel-capture-btn");
const cameraPreview = document.getElementById("camera-preview");
const captureCanvas = document.getElementById("capture-canvas");
const audioVisualizer = document.getElementById("audio-visualizer");
const liveDot = document.getElementById("live-dot");
const recordingTimer = document.getElementById("recording-timer");
const uploadStatus = document.getElementById("upload-status");
const fileIdBox = document.getElementById("file-id-box");
const fileIdValue = document.getElementById("file-id-value");

const historySection = document.getElementById("history-section");
const fileList = document.getElementById("file-list");

let timerInterval = null;
let recordingSeconds = 0;

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function startTimer() {
  recordingSeconds = 0;
  recordingTimer.textContent = "00:00";
  recordingTimer.classList.remove("hidden");
  timerInterval = setInterval(() => {
    recordingSeconds++;
    recordingTimer.textContent = formatTime(recordingSeconds);
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  recordingTimer.classList.add("hidden");
}

// ============================================================
// STEP 1: Identify the citizen
// ============================================================
startBtn.addEventListener("click", async () => {
  const name = citizenNameInput.value.trim();
  if (!name) {
    citizenStatus.textContent = "Please enter your name.";
    return;
  }

  citizenStatus.textContent = "Looking you up...";

  const { data: existing, error: findError } = await supabaseClient
    .from("citizen")
    .select("*")
    .eq("name", name)
    .limit(1);

  if (findError) {
    citizenStatus.textContent = "Error: " + findError.message;
    return;
  }

  if (existing && existing.length > 0) {
    currentCitizen = existing[0];
  } else {
    const { data: created, error: insertError } = await supabaseClient
      .from("citizen")
      .insert({ name: name })
      .select()
      .single();

    if (insertError) {
      citizenStatus.textContent = "Error: " + insertError.message;
      return;
    }
    currentCitizen = created;
  }

  citizenStatus.textContent = "Welcome, " + currentCitizen.name + "!";
  captureSection.classList.remove("hidden");
  historySection.classList.remove("hidden");
  loadFileHistory();
});

// ============================================================
// STEP 2: Open the camera
// ============================================================
let currentFacingMode = "environment";
let videoStream = null;
let currentCaptureMode = null;

async function startCamera(mode) {
  currentCaptureMode = mode;
  uploadStatus.textContent = "";
  if (videoStream) {
    videoStream.getTracks().forEach(track => track.stop());
  }
  
  const constraints = {
    video: (mode === 'photo' || mode === 'video') ? { facingMode: currentFacingMode } : false,
    audio: (mode === 'video' || mode === 'audio')
  };

  try {
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (initialErr) {
      if (mode === 'video') {
        // Fallback to video only if audio fails
        constraints.audio = false;
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        uploadStatus.textContent = "Warning: Audio could not be started. Recording video only.";
      } else {
        throw initialErr;
      }
    }
    videoStream = stream;
    
    fileIdBox.classList.add("hidden");
    
    typeSelection.classList.add("hidden");
    captureUi.classList.remove("hidden");
    liveDot.classList.remove("hidden");
    
    // Hide all action buttons first
    takePhotoBtn.classList.add("hidden");
    recordVideoBtn.classList.add("hidden");
    recordAudioBtn.classList.add("hidden");
    switchCameraBtn.classList.add("hidden");
    
    if (mode === 'photo' || mode === 'video') {
      cameraPreview.srcObject = stream;
      cameraPreview.classList.remove("hidden");
      audioVisualizer.style.display = "none";
      switchCameraBtn.classList.remove("hidden");
      
      if (mode === 'photo') takePhotoBtn.classList.remove("hidden");
      if (mode === 'video') recordVideoBtn.classList.remove("hidden");
    } else if (mode === 'audio') {
      cameraPreview.classList.add("hidden");
      audioVisualizer.style.display = "flex";
      recordAudioBtn.classList.remove("hidden");
    }
  } catch (err) {
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      uploadStatus.textContent = "Permission denied: Please enable microphone/camera access in Android settings.";
    } else {
      uploadStatus.textContent = "Hardware error (" + err.name + "): " + err.message + ". Check if another app is using the mic.";
    }
  }
}

selectPhotoBtn.addEventListener("click", () => startCamera('photo'));
selectVideoBtn.addEventListener("click", () => startCamera('video'));
selectAudioBtn.addEventListener("click", () => startCamera('audio'));

cancelCaptureBtn.addEventListener("click", () => {
  if (videoStream) {
    videoStream.getTracks().forEach(track => track.stop());
    videoStream = null;
  }
  captureUi.classList.add("hidden");
  typeSelection.classList.remove("hidden");
});

switchCameraBtn.addEventListener("click", () => {
  currentFacingMode = currentFacingMode === "environment" ? "user" : "environment";
  if (currentCaptureMode) startCamera(currentCaptureMode);
});

// ============================================================
// STEP 3: Capture a photo or video from the live feed
// ============================================================
takePhotoBtn.addEventListener("click", async () => {
  uploadStatus.textContent = "Saving photo...";

  const context = captureCanvas.getContext("2d");
  captureCanvas.width = cameraPreview.videoWidth;
  captureCanvas.height = cameraPreview.videoHeight;
  context.drawImage(cameraPreview, 0, 0);

  captureCanvas.toBlob(async (blob) => {
    await uploadAndSaveFile(blob, "jpg", "photo");
  }, "image/jpeg");
});

let mediaRecorder;
let recordedChunks = [];

recordVideoBtn.addEventListener("click", () => {
  recordedChunks = [];
  try {
    mediaRecorder = new MediaRecorder(videoStream, { mimeType: 'video/webm' });
  } catch (e) {
    try {
      mediaRecorder = new MediaRecorder(videoStream, { mimeType: 'video/mp4' });
    } catch (e2) {
      mediaRecorder = new MediaRecorder(videoStream);
    }
  }
  
  mediaRecorder.ondataavailable = function(event) {
    if (event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };
  
  mediaRecorder.onstop = async function() {
    uploadStatus.textContent = "Saving video...";
    const blob = new Blob(recordedChunks, { type: mediaRecorder.mimeType || 'video/webm' });
    let ext = "webm";
    if (blob.type.includes("mp4")) ext = "mp4";
    await uploadAndSaveFile(blob, ext, "video");
  };

  mediaRecorder.start();
  startTimer();
  recordVideoBtn.classList.add("hidden");
  switchCameraBtn.classList.add("hidden");
  cancelCaptureBtn.classList.add("hidden");
  stopRecordBtn.classList.remove("hidden");
  uploadStatus.textContent = "Recording...";
});

stopRecordBtn.addEventListener("click", () => {
  stopTimer();
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
  stopRecordBtn.classList.add("hidden");
  recordVideoBtn.classList.remove("hidden");
  switchCameraBtn.classList.remove("hidden");
  cancelCaptureBtn.classList.remove("hidden");
});

let audioRecorder;
let recordedAudioChunks = [];

recordAudioBtn.addEventListener("click", () => {
  recordedAudioChunks = [];
  const audioTracks = videoStream.getAudioTracks();
  if (audioTracks.length === 0) {
    uploadStatus.textContent = "No microphone found.";
    return;
  }
  const audioTrack = audioTracks[0];
  const audioStream = new MediaStream([audioTrack]);
  
  try {
    audioRecorder = new MediaRecorder(audioStream, { mimeType: 'audio/webm' });
  } catch (e) {
    try {
      audioRecorder = new MediaRecorder(audioStream, { mimeType: 'audio/mp4' });
    } catch (e2) {
      audioRecorder = new MediaRecorder(audioStream);
    }
  }
  
  audioRecorder.ondataavailable = function(event) {
    if (event.data.size > 0) {
      recordedAudioChunks.push(event.data);
    }
  };
  
  audioRecorder.onstop = async function() {
    uploadStatus.textContent = "Saving audio...";
    const blob = new Blob(recordedAudioChunks, { type: audioRecorder.mimeType || 'audio/webm' });
    let ext = "webm";
    if (blob.type.includes("mp4")) ext = "mp4";
    await uploadAndSaveFile(blob, ext, "audio");
  };

  audioRecorder.start();
  startTimer();
  recordAudioBtn.classList.add("hidden");
  cancelCaptureBtn.classList.add("hidden");
  stopAudioBtn.classList.remove("hidden");
  uploadStatus.textContent = "Recording audio...";
});

stopAudioBtn.addEventListener("click", () => {
  stopTimer();
  if (audioRecorder && audioRecorder.state !== "inactive") {
    audioRecorder.stop();
  }
  stopAudioBtn.classList.add("hidden");
  recordAudioBtn.classList.remove("hidden");
  cancelCaptureBtn.classList.remove("hidden");
});

// ============================================================
// STEP 4: Upload to Supabase Storage + write to "file" table
// ============================================================
async function uploadAndSaveFile(blob, ext = "jpg", fileType = "photo") {
  const fileName = `${currentCitizen.citizen_id}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabaseClient.storage
    .from("captures")
    .upload(fileName, blob);

  if (uploadError) {
    uploadStatus.textContent = "Upload failed: " + uploadError.message;
    return;
  }

  const { data: urlData } = supabaseClient.storage
    .from("captures")
    .getPublicUrl(fileName);

  const { data: fileRow, error: insertError } = await supabaseClient
    .from("file")
    .insert({
      citizen_id: currentCitizen.citizen_id,
      type: fileType,
      file_url: urlData.publicUrl,
      status: "active",
    })
    .select()
    .single();

  if (insertError) {
    uploadStatus.textContent = "Save failed: " + insertError.message;
    return;
  }

  uploadStatus.textContent = "Saved!";
  fileIdValue.textContent = fileRow.file_id;
  fileIdBox.classList.remove("hidden");

  loadFileHistory();
  
  // Reset UI back to type selection
  if (videoStream) {
    videoStream.getTracks().forEach(track => track.stop());
    videoStream = null;
  }
  captureUi.classList.add("hidden");
  typeSelection.classList.remove("hidden");
}

// ============================================================
// STEP 5: List this citizen's past captures
// ============================================================
async function loadFileHistory() {
  const { data, error } = await supabaseClient
    .from("file")
    .select("*, deletion_request(*)")
    .eq("citizen_id", currentCitizen.citizen_id)
    .order("capture_time", { ascending: false });

  if (error) {
    console.error("Error loading history:", error);
    return;
  }

  fileList.innerHTML = "";
  data.forEach((f) => {
    const li = document.createElement("li");
    li.style.display = "flex";
    li.style.flexDirection = "column";
    li.style.gap = "6px";
    li.style.padding = "10px 0";

    // Find any pending or rejected deletion requests
    const pendingReq = f.deletion_request && f.deletion_request.find(r => r.status === "pending");
    const rejectedReq = f.deletion_request && f.deletion_request.find(r => r.status === "rejected");

    let statusLabel = f.status;
    if (f.status === "deleted") {
      statusLabel = "deleted (verified)";
    } else if (pendingReq) {
      statusLabel = "deletion requested";
    }

    const rowTop = document.createElement("div");
    rowTop.style.display = "flex";
    rowTop.style.justifyContent = "space-between";
    rowTop.style.alignItems = "center";
    rowTop.style.flexWrap = "wrap";
    rowTop.style.gap = "8px";

    const textSpan = document.createElement("span");
    textSpan.textContent = `${f.type} — ${statusLabel} — ${f.file_id}`;
    rowTop.appendChild(textSpan);

    if (f.status === "active") {
      if (pendingReq) {
        const badge = document.createElement("span");
        badge.textContent = "[Pending Official Verification]";
        badge.style.color = "var(--gold)";
        badge.style.fontSize = "12px";
        badge.style.fontFamily = "var(--font-mono)";
        rowTop.appendChild(badge);
      } else {
        const delBtn = document.createElement("button");
        delBtn.textContent = rejectedReq ? "Re-request Deletion" : "Request Deletion";
        delBtn.style.padding = "4px 10px";
        delBtn.style.fontSize = "12px";
        delBtn.onclick = async () => {
          if (!confirm("Request deletion of this file? It will be sent to government officials for verification before removal.")) {
            return;
          }
          delBtn.disabled = true;
          delBtn.textContent = "Requesting...";
          const { error: reqError } = await supabaseClient
            .from("deletion_request")
            .insert({
              file_id: f.file_id,
              citizen_id: currentCitizen.citizen_id,
              reason: "Citizen requested deletion",
              status: "pending"
            });
            
          if (!reqError) {
            loadFileHistory();
          } else {
            delBtn.disabled = false;
            delBtn.textContent = rejectedReq ? "Re-request Deletion" : "Request Deletion";
            alert("Error requesting deletion: " + reqError.message);
          }
        };
        rowTop.appendChild(delBtn);
      }
    }

    li.appendChild(rowTop);

    if (rejectedReq && !pendingReq && f.status === "active") {
      const rejectNote = document.createElement("div");
      rejectNote.textContent = "Notice: Previous deletion request was rejected by officials.";
      rejectNote.style.fontSize = "11px";
      rejectNote.style.color = "var(--ink-soft)";
      rejectNote.style.fontStyle = "italic";
      li.appendChild(rejectNote);
    }
    
    fileList.appendChild(li);
  });
}


