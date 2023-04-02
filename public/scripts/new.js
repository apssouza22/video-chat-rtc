let isAlreadyCalling = false;
let getCalled = false;

const existingCalls = [];

const {RTCPeerConnection, RTCSessionDescription} = window;

const peerConnection = new RTCPeerConnection();

function unselectUsersFromList() {
    const alreadySelectedUser = document.querySelectorAll(
        ".active-user.active-user--selected"
    );

    alreadySelectedUser.forEach(el => {
        el.setAttribute("class", "active-user");
    });
}

function createUserItemContainer(socketId) {
    const userContainerEl = document.createElement("div");

    const usernameEl = document.createElement("p");

    userContainerEl.setAttribute("class", "active-user");
    userContainerEl.setAttribute("id", socketId);
    usernameEl.setAttribute("class", "username");
    usernameEl.innerHTML = `Socket: ${socketId}`;

    userContainerEl.appendChild(usernameEl);

    userContainerEl.addEventListener("click", () => {
        unselectUsersFromList();
        userContainerEl.setAttribute("class", "active-user active-user--selected");
        const talkingWithInfo = document.getElementById("talking-with-info");
        talkingWithInfo.innerHTML = `Talking with: "Socket: ${socketId}"`;
        callUser(socketId);
    });

    return userContainerEl;
}

async function callUser(socketId) {
    const offerOptions = {
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
    };

    const offer = await peerConnection.createOffer(offerOptions);
    await peerConnection.setLocalDescription(new RTCSessionDescription(offer));

    socket.emit("call-user", {
        offer,
        to: socketId
    });
}

function updateUserList(socketIds) {
    const activeUserContainer = document.getElementById("active-user-container");

    socketIds.forEach(socketId => {
        const alreadyExistingUser = document.getElementById(socketId);
        if (!alreadyExistingUser) {
            const userContainerEl = createUserItemContainer(socketId);

            activeUserContainer.appendChild(userContainerEl);
        }
    });
}

const socket = io.connect("localhost:4000");

socket.on("update-user-list", ({users}) => {
    updateUserList(users);
});

socket.on("remove-user", ({socketId}) => {
    const elToRemove = document.getElementById(socketId);

    if (elToRemove) {
        elToRemove.remove();
    }
});

socket.on("call-made", async data => {
    if (getCalled) {
        const confirmed = confirm(
            `User "Socket: ${data.socket}" wants to call you. Do accept this call?`
        );

        if (!confirmed) {
            socket.emit("reject-call", {
                from: data.socket
            });

            return;
        }
    }

    await peerConnection.setRemoteDescription(
        new RTCSessionDescription(data.offer)
    );
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(new RTCSessionDescription(answer));

    socket.emit("make-answer", {
        answer,
        to: data.socket
    });
    getCalled = true;
});

socket.on("answer-made", async data => {
    await peerConnection.setRemoteDescription(
        new RTCSessionDescription(data.answer)
    );

    if (!isAlreadyCalling) {
        callUser(data.socket);
        isAlreadyCalling = true;
    }
});

socket.on("call-rejected", data => {
    alert(`User: "Socket: ${data.socket}" rejected your call.`);
    unselectUsersFromList();
});

const remoteVideo = document.getElementById("remote-video");
// peerConnection.ontrack = function ({streams: [stream]}) {
//     // console.log("ontrack", stream)
//     if (remoteVideo) {
//         remoteVideo.srcObject = stream;
//     }
// };

const localVideo = document.getElementById("local-video");
async function beforeAnswer(peerConnection) {
    const localStream = await window.navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
    });
    if (localVideo) {
        localVideo.srcObject = localStream;
    }
    localStream.getTracks().forEach(track => {
        // peerConnection.addTrack(track, localStream)
        peerConnection.addTransceiver(track, {direction: 'sendrecv'}    )
    });

    let mediaStreamTracks = peerConnection.getReceivers().map(receiver => receiver.track);
    const remoteStream = new MediaStream(mediaStreamTracks);
    if (remoteVideo) {
        remoteVideo.srcObject = remoteStream;
    }
}

beforeAnswer(peerConnection)

remoteVideo.addEventListener("loadedmetadata", () => {
    console.log("remote loadedmetadata")
});

peerConnection.addEventListener("connectionstatechange", event => {
    console.log("connectionstatechange", event)
});

