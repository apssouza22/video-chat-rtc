/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

const startButton = document.getElementById('startButton');
const callButton = document.getElementById('callButton');
const hangupButton = document.getElementById('hangupButton');
callButton.disabled = true;
hangupButton.disabled = true;
startButton.onclick = start;
callButton.onclick = call;
hangupButton.onclick = hangup;

const video1 = document.querySelector('video#video1');
const video2 = document.querySelector('video#video2');
const video3 = document.querySelector('video#video3');

let localStream;
let pc1Local;
let pc1Remote;
let pc2Local;
let pc2Remote;
const offerOptions = {
    offerToReceiveAudio: 1,
    offerToReceiveVideo: 1
};

function gotStream(stream) {
    console.log('Received local stream');
    video1.srcObject = stream;
    localStream = stream;
    callButton.disabled = false;
}

function start() {
    console.log('Requesting local stream');
    startButton.disabled = true;
    navigator.mediaDevices
        .getUserMedia({
            audio: true,
            video: true
        })
        .then(gotStream)
        .catch(e => console.log('getUserMedia() error: ', e));
}

async function call() {
    callButton.disabled = true;
    hangupButton.disabled = false;
    console.log('Starting calls');
    const audioTracks = localStream.getAudioTracks();
    const videoTracks = localStream.getVideoTracks();
    if (audioTracks.length > 0) {
        console.log(`Using audio device: ${audioTracks[0].label}`);
    }
    if (videoTracks.length > 0) {
        console.log(`Using video device: ${videoTracks[0].label}`);
    }
    const servers = null; // Allows for RTC server configuration.
    pc2Remote = new RTCPeerConnection(servers);
    pc2Remote.ontrack = gotRemoteStream2;
    pc2Remote.onicecandidate = iceCallback2Remote;

    pc2Local = new RTCPeerConnection(servers);
    pc2Local.onicecandidate = iceCallback2Local;
    console.log('pc2: created local and remote peer connection objects');
    localStream.getTracks().forEach(track => pc2Local.addTrack(track, localStream));

    console.log('Adding local stream to pc2Local');
    let offer = await pc2Local.createOffer(offerOptions)
    pc2Local.setLocalDescription(offer);

    sendOffer(offer)

    // socket.emit("call-user", {
    //     offer,
    //     to: socketId
    // });
    // sendOffer(offer)
}

let socketId = ""

function updateUserList(socketIds) {
    socketIds.forEach(id => {
        console.log("socket id", id)
        socketId = id
    });
}

const socket = io.connect("localhost:4001");

socket.on("update-user-list", ({users}) => {
    console.log("update user list", users)
    updateUserList(users);
});

socket.on("call-made", async data => {
    console.log("call made", data)
    sendOffer(data.offer)

});

socket.on("answer-made", async data => {
    console.log("answer made", data)
    sendAnswer(data.answer)
});

let answerLocal
let answerSocket
async function sendOffer(desc) {
    pc2Remote.setRemoteDescription(desc);
    let answer = await pc2Remote.createAnswer();
    pc2Remote.setLocalDescription(answer);
    socket.emit("make-answer", {answer, to: socketId});
    answerLocal = answer
    // sendAnswer(answer)
}

function sendAnswer(desc) {
    console.log("send answer")
    pc2Local.setRemoteDescription(desc);
    answerSocket = desc
}

function hangup() {
    console.log('Ending calls');
    pc1Local.close();
    pc1Remote.close();
    pc2Local.close();
    pc2Remote.close();
    pc1Local = pc1Remote = null;
    pc2Local = pc2Remote = null;
    hangupButton.disabled = true;
    callButton.disabled = false;
}

function gotRemoteStream2(e) {
    if (video3.srcObject !== e.streams[0]) {
        video3.srcObject = e.streams[0];
        console.log('pc2: received remote stream');
    }
}

async function iceCallback2Local(e) {
    let candidate = e.candidate;
    if (candidate && !answerSocket) {
        console.log("add remote", candidate)
        await pc2Remote.addIceCandidate(candidate)
        return
    }

    if (candidate && answerSocket) {
        console.log("Add local 3", candidate)
        await pc2Local.addIceCandidate(candidate)
        return;
    }
}

async function iceCallback2Remote(e) {
    let candidate = e.candidate;
    if (candidate  && answerSocket) {
        console.log("Add local", candidate)
        await pc2Local.addIceCandidate(candidate)
        return;
    }
}


