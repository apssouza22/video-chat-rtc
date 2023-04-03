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
let caller;
let receiver;
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

function call() {
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
    // Create an RTCPeerConnection via the polyfill.
    const servers = null;
    // pc1Local = new RTCPeerConnection(servers);
    // pc1Remote = new RTCPeerConnection(servers);
    // pc1Remote.ontrack = gotRemoteStream1;
    // pc1Local.onicecandidate = iceCallback1Local;
    // pc1Remote.onicecandidate = iceCallback1Remote;
    // console.log('pc1: created local and remote peer connection objects');

    receiver = new RTCPeerConnection(servers);
    receiver.ontrack = gotRemoteStream2;
    receiver.onicecandidate = iceCallback2Remote;

    caller = new RTCPeerConnection(servers);
    caller.onicecandidate = iceCallback2Local;
    console.log('pc2: created local and remote peer connection objects');

    // localStream.getTracks().forEach(track => pc1Local.addTrack(track, localStream));
    // console.log('Adding local stream to pc1Local');
    // pc1Local
    //     .createOffer(offerOptions)
    //     .then(gotDescription1Local, onCreateSessionDescriptionError);

    localStream.getTracks().forEach(track => caller.addTrack(track, localStream));
    console.log('Adding local stream to caller');
    caller.createOffer(offerOptions)
        .then(gotDescription2Local, onCreateSessionDescriptionError);
}

function onCreateSessionDescriptionError(error) {
    console.log(`Failed to create session description: ${error.toString()}`);
}


function gotDescription2Local(desc) {
    caller.setLocalDescription(desc);
    console.log(`Offer from pc2Local\n${desc.sdp}`);

    receiver.setRemoteDescription(desc);
    // Since the 'remote' side has no media stream we need
    // to pass in the right constraints in order for it to
    // accept the incoming offer of audio and video.
    receiver.createAnswer().then(gotDescription2Remote, onCreateSessionDescriptionError);
}

function gotDescription2Remote(desc) {
    receiver.setLocalDescription(desc);
    console.log(`Answer from pc2Remote\n${desc.sdp}`);
    caller.setRemoteDescription(desc);
}

function hangup() {
    console.log('Ending calls');
    pc1Local.close();
    pc1Remote.close();
    caller.close();
    receiver.close();
    pc1Local = pc1Remote = null;
    caller = receiver = null;
    hangupButton.disabled = true;
    callButton.disabled = false;
}

function gotRemoteStream1(e) {
    if (video2.srcObject !== e.streams[0]) {
        video2.srcObject = e.streams[0];
        console.log('pc1: received remote stream');
    }
}

function gotRemoteStream2(e) {
    if (video3.srcObject !== e.streams[0]) {
        video3.srcObject = e.streams[0];
        console.log('pc2: received remote stream');
    }
}

function iceCallback2Local(event) {
    handleCandidate(event.candidate, receiver, 'pc2: ', 'local');
}

function iceCallback2Remote(event) {
    handleCandidate(event.candidate, caller, 'pc2: ', 'remote');
}

function handleCandidate(candidate, dest, prefix, type) {
    dest.addIceCandidate(candidate)
        .then(onAddIceCandidateSuccess, onAddIceCandidateError);
    console.log(`${prefix}New ${type} ICE candidate: ${candidate ? candidate.candidate : '(null)'}`);
}

function onAddIceCandidateSuccess() {
    console.log('AddIceCandidate success.');
}

function onAddIceCandidateError(error) {
    console.log(`Failed to add ICE candidate: ${error.toString()}`);
}