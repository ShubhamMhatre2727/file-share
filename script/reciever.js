const socket = io();
const peerConnection = new RTCPeerConnection();
let dataChannel;

const connect = document.querySelector("#connect");
const status1 = document.querySelector("#status1");
const status2 = document.querySelector("#status2");

socket.on("offer", async (offer) => {
    peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit("answer", answer);
});

socket.on("icecandidate", async (candidate) => {
    try {
    await peerConnection.addIceCandidate(candidate);
    } catch (error) {
    console.log(error);
    }
});

peerConnection.addEventListener("connectionstatechange", (event) => {
    if (peerConnection.connectionState === "connected") {
        status1.innerText = "connected";
    }
});

// Receiver side
let metaData;
let receivedChunks = [];
let receivedSize = 0;
const fileChunks = [];



peerConnection.addEventListener("datachannel", (event) => {
  dataChannel = event.channel;

  dataChannel.addEventListener("open", () => {
    console.log("data channel opened");
  });
  dataChannel.addEventListener("close", () => {
    console.log("data channl closed");
  });

  dataChannel.addEventListener("message", (event) => {
    const data = event.data;

    if (typeof data === "string") {
      // code for metadata of file
      metaData = JSON.parse(data);

      status1.innerText = "file size : " + (metaData.size / (1024 * 1024)).toFixed(4) + " MB";
    } else {
      // handling data chuncks
      receiveDataChunk(data);
    }
  });
});

function receiveDataChunk(chunk) {
  receivedChunks.push(chunk);
  receivedSize += chunk.byteLength;
  status2.innerText = "Recieving : " + (receivedSize / metaData.size * 100).toFixed(0) + " %";

  if (receivedSize === metaData.size) {
    // All chunks received, reconstruct the file
    const blob = new Blob(receivedChunks);
    fileChunks.push(blob);
    const reconstructedFile = new Blob(fileChunks, { type: metaData.type });
    // Now you have the reconstructed file, you can save it or process it further
    saveReconstructedFile(reconstructedFile);
    status2.innerText = "done !, " + (receivedSize / metaData.size * 100).toFixed(0) + " %";
    console.log("File reconstruction complete.");
    receivedSize = 0;
  }

  dataChannel.send("ack");
}

function saveReconstructedFile(reconstructedFile) {
  const url = URL.createObjectURL(reconstructedFile);

  // Create a link element
  const a = document.createElement("a");
  a.href = url;
  a.download = metaData.name; // Set the desired file name
  a.style.display = "none";

  // Append the link to the body and trigger the download
  document.body.appendChild(a);
  a.click();

  // Clean up by removing the link and revoking the URL
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}