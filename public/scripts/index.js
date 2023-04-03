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

socket.on("call-made", async data => {
    console.log("call made", data)
    const answer = await rtcConn.createAnswer(data.offer)
    socket.emit("make-answer", {answer, to: data.socket});
    await rtcConn.onIceCandidate((candidate) => {
        if (candidate) {
            socket.emit("ice-candidate", {candidate, to: data.socket});
        }
    });
});

socket.on("answer-made", async data => {
    console.log("answer made", data)
    await rtcConn.setAnswer(data.answer)
});

socket.on("ice-candidate-post", async data => {
    await rtcConn.addIceCandidate(data.candidate)
});

socket.on("update-user-list", ({users}) => {
    updateUserList(users);
});

socket.on("remove-user", ({socketId}) => {
    const elToRemove = document.getElementById(socketId);

    if (elToRemove) {
        elToRemove.remove();
    }
});

const remoteVideo = document.getElementById("remote-video");
const localVideo = document.getElementById("local-video");
let localStream;
const rtcConn = new RtcConnHandler();


async function callUser(socketId) {
    const offer = await rtcConn.createOffer()
    console.log("call user", offer)
    socket.emit("call-user", {offer, to: socketId});
    await rtcConn.onIceCandidate((candidate) => {
        if (candidate) {
            socket.emit("ice-candidate", {candidate, to: socketId});
        }
    });
}

async function start() {
    localStream = await window.navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
    });
    if (localVideo) {
        localVideo.srcObject = localStream;
    }
    rtcConn.addStream(localStream);
}

start()

remoteVideo.addEventListener("loadedmetadata", () => {
    console.log("remote loadedmetadata")
});

