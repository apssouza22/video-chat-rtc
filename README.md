# Video-chat-app

This is a video chat app using WebRTC and WebSockets. It is built using Node.js, Express, and Socket.io.


## Getting started
- `npm install`
- `npm start`
- Access the http://localhost:8881 from two different browsers
- Click on the one of the active users to start a video chat

## WebRTC Flow
<img src="webrtc-flow.jpeg">

## Video Chat App
<img src="video-chat.png">


## Docker
- `docker build -t video-chat-app .`
- `docker run -p 8881:8881 video-chat-app`



