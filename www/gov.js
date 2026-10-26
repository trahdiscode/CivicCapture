const SUPABASE_URL = "https://jcgixncnuwshktlrnxzu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjZ2l4bmNudXdzaGt0bHJueHp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1NzY4NzcsImV4cCI6MjEwNTE1Mjg3N30.-pO9sbeEudaMwwC-RO0HrqbMZnKjLX1HVKFe4740NqY";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const requestList = document.getElementById("request-list");
const statusMessage = document.getElementById("status-message");
const refreshBtn = document.getElementById("refresh-btn");

async function loadRequests() {
  statusMessage.textContent = "Loading requests...";
  requestList.innerHTML = "";
  
  const { data, error } = await supabaseClient
    .from("deletion_request")
    .select(`
      request_id,
      file_id,
      citizen_id,
      reason,
      status,
      requested_at,
      file (
        file_id,
        type,
        file_url,
        status
      ),
      citizen (
        citizen_id,
        name
      )
    `)
    .eq("status", "pending")
    .order("requested_at", { ascending: false });
    
  if (error) {
    statusMessage.textContent = "Error loading requests: " + error.message;
    return;
  }
  
  statusMessage.textContent = "";
  
  if (!data || data.length === 0) {
    statusMessage.textContent = "No pending deletion requests.";
    return;
  }
  
  data.forEach((req) => {
    const li = document.createElement("li");
    li.style.display = "flex";
    li.style.flexDirection = "column";
    li.style.marginBottom = "20px";
    li.style.padding = "14px";
    li.style.background = "#fff";
    li.style.border = "1px solid var(--line)";
    
    const citizenName = req.citizen ? req.citizen.name : "Citizen " + req.citizen_id;
    const fileType = req.file ? req.file.type : "file";
    const requestedTime = new Date(req.requested_at).toLocaleString();

    const infoSpan = document.createElement("div");
    infoSpan.innerHTML = `<strong>Citizen:</strong> ${citizenName}<br/>
      <strong>Type:</strong> ${fileType}<br/>
      <strong>File ID:</strong> <code>${req.file_id}</code><br/>
      <strong>Requested At:</strong> ${requestedTime}<br/>
      <strong>Reason:</strong> ${req.reason || "None specified"}`;
    infoSpan.style.lineHeight = "1.6";
    li.appendChild(infoSpan);
    
    // Media preview
    if (req.file && req.file.file_url) {
      const mediaContainer = document.createElement("div");
      mediaContainer.style.marginTop = "10px";
      mediaContainer.style.marginBottom = "6px";

      if (fileType === "photo") {
        const img = document.createElement("img");
        img.src = req.file.file_url;
        img.alt = "Evidence preview";
        img.style.maxWidth = "100%";
        img.style.maxHeight = "260px";
        img.style.objectFit = "contain";
        img.style.border = "1px solid var(--line)";
        img.style.borderRadius = "4px";
        img.style.display = "block";
        mediaContainer.appendChild(img);
      } else if (fileType === "video") {
        const video = document.createElement("video");
        video.src = req.file.file_url;
        video.controls = true;
        video.playsInline = true;
        video.style.maxWidth = "100%";
        video.style.maxHeight = "260px";
        video.style.border = "1px solid var(--line)";
        video.style.borderRadius = "4px";
        video.style.display = "block";
        mediaContainer.appendChild(video);
      } else if (fileType === "audio") {
        const audio = document.createElement("audio");
        audio.src = req.file.file_url;
        audio.controls = true;
        audio.style.width = "100%";
        audio.style.display = "block";
        mediaContainer.appendChild(audio);
      }

      const link = document.createElement("a");
      link.href = req.file.file_url;
      link.target = "_blank";
      link.textContent = "Open Original Media URL ↗";
      link.style.color = "var(--gold)";
      link.style.fontSize = "12px";
      link.style.marginTop = "6px";
      link.style.display = "inline-block";
      mediaContainer.appendChild(link);

      li.appendChild(mediaContainer);
    }
    
    const actionsDiv = document.createElement("div");
    actionsDiv.style.marginTop = "14px";
    actionsDiv.style.display = "flex";
    actionsDiv.style.gap = "10px";
    
    const approveBtn = document.createElement("button");
    approveBtn.textContent = "Approve Deletion";
    approveBtn.classList.add("danger");
    approveBtn.style.padding = "6px 12px";
    approveBtn.style.fontSize = "13px";
    approveBtn.onclick = async () => {
      if (!confirm("Are you sure you want to approve this deletion? The file will be permanently removed from storage and marked deleted.")) {
        return;
      }
      approveBtn.disabled = true;
      rejectBtn.disabled = true;
      approveBtn.textContent = "Deleting...";
      
      // 1. Delete file binary from Supabase Storage
      if (req.file && req.file.file_url) {
        const fileName = req.file.file_url.split('/').pop();
        const { error: storageError } = await supabaseClient.storage
          .from("captures")
          .remove([fileName]);
          
        if (storageError) {
          console.warn("Storage deletion warning: ", storageError.message);
        }
      }
      
      // 2. Update file record to 'deleted' in DB
      const { error: fileError } = await supabaseClient
        .from("file")
        .update({ status: "deleted" })
        .eq("file_id", req.file_id);
        
      if (fileError) {
        alert("Error updating file status: " + fileError.message);
        approveBtn.disabled = false;
        rejectBtn.disabled = false;
        approveBtn.textContent = "Approve Deletion";
        return;
      }

      // 3. Update deletion_request to 'approved'
      const { error: reqError } = await supabaseClient
        .from("deletion_request")
        .update({
          status: "approved",
          decided_at: new Date().toISOString()
        })
        .eq("request_id", req.request_id);

      if (reqError) {
        console.warn("Error updating request: ", reqError.message);
      }

      loadRequests();
    };
    
    const rejectBtn = document.createElement("button");
    rejectBtn.textContent = "Reject Request";
    rejectBtn.style.padding = "6px 12px";
    rejectBtn.style.fontSize = "13px";
    rejectBtn.onclick = async () => {
      if (!confirm("Reject this deletion request? The file will remain active.")) {
        return;
      }
      approveBtn.disabled = true;
      rejectBtn.disabled = true;
      rejectBtn.textContent = "Rejecting...";
      
      // Mark deletion_request as 'rejected'
      const { error: reqError } = await supabaseClient
        .from("deletion_request")
        .update({
          status: "rejected",
          decided_at: new Date().toISOString()
        })
        .eq("request_id", req.request_id);
        
      if (reqError) {
        alert("Error rejecting request: " + error.message);
        approveBtn.disabled = false;
        rejectBtn.disabled = false;
        rejectBtn.textContent = "Reject Request";
      } else {
        loadRequests();
      }
    };
    
    actionsDiv.appendChild(approveBtn);
    actionsDiv.appendChild(rejectBtn);
    li.appendChild(actionsDiv);
    requestList.appendChild(li);
  });
}

refreshBtn.addEventListener("click", loadRequests);

// Initial load
loadRequests();
