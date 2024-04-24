const express = require("express");
const { createServer } = require("node:http");
const { Server } = require("socket.io");

const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

app.get("/", (req, res)=>{
  return res.sendFile(__dirname + "/index.html");
})

app.get("/send", (req, res)=>{
  return res.sendFile(__dirname+"/sender.html");
});

app.get("/recieve", (req, res)=>{
  return res.sendFile(__dirname+"/reciever.html");
});

app.get("/stream", (req, res) => {
  res.sendFile(__dirname + "/video_stream.html");
});


io.on("connection", (socket) => {
  console.log("socket connected");

  socket.on("offer", (offer)=>{
    io.except(socket.id).emit('offer', offer);
  })

  socket.on("answer", (answer)=>{
    io.except(socket.id).emit("answer", answer);
  })

  socket.on("icecandidate", (candidate)=>{
    io.except(socket.id).emit("icecandidate", candidate);
  })
});

server.listen(3000, () => {
  console.log("server running on port 3000");
});