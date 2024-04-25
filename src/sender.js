const reader = new FileReader();
const socket = io();
const peerConnection = new RTCPeerConnection();
const dataChannel = peerConnection.createDataChannel("channel");

const connect = document.getElementById("connect");
const fileInput = document.querySelector("#fileInput");
const sendFile = document.querySelector("#sendFile");
const status = document.querySelector("#status");
const wrapper = document.querySelector("#wrapper");
const progress = document.querySelector("progress");

let file;
const chunkSize = 256 * 1024; // 256 KB MAX
let offset = 0;




connect.addEventListener("click", () => {
  peerConnection.createOffer().then(async (offer) => {
    await peerConnection.setLocalDescription(offer);
    socket.emit("offer", offer);
  });

  socket.on("answer", async (answer) => {
    const remoteDesc = new RTCSessionDescription(answer);
    await peerConnection.setRemoteDescription(remoteDesc);
  });

  // Listen for local ICE candidates on the local RTCPeerConnection
  peerConnection.onicecandidate = function (event) {
    if (event.candidate) {
      socket.emit("icecandidate", event.candidate);
    }
  };

  peerConnection.addEventListener("connectionstatechange", (event) => {
    if (peerConnection.connectionState === "connected") {
      connect.innerText = "connected ✔️";
      connect.style.backgroundColor = "rgb(43, 163, 83)";
      connect.disabled = true;

      document.querySelector("#wrapper").style.display = "flex";
    }
  });
});

// getting file data
fileInput.addEventListener("change", () => {
  file = fileInput.files[0];
  status.innerText = "file size : " + (file.size / (1024 * 1024)).toFixed(4) + " MB";
});

sendFile.addEventListener("click", () => {
  if (file) {
    // sending metadata first
    dataChannel.send(
      JSON.stringify({
        name: file.name,
        type: file.type,
        size: file.size,
      }),
    );

    wrapper.style.display = "none";
    status.innerText = file.size;
    progress.style.opacity = 1;
    readNextChunk();
  } else {
    console.error("No file selected.");
  }
});

// waiting for acknowledgment
dataChannel.onmessage = function () {
  status.innerText = "sending : " + (offset / file.size * 100).toFixed(0) + " %";
  progress.value = (offset / file.size * 100).toFixed(0);
  if (offset < file.size) {
    readNextChunk();
  } else {
    wrapper.style.display = "flex";
    status.innerText = "File transfer complete";
    offset = 0;
  }
};

reader.onload = function () {
  const chunk = reader.result;
  sendDataChunk(chunk);
  offset += chunk.byteLength;
};

function readNextChunk() {
  const slice = file.slice(offset, offset + chunkSize);
  reader.readAsArrayBuffer(slice);
}

function sendDataChunk(chunk) {
  // Send chunk over WebRTC data channel
  dataChannel.send(chunk);
}