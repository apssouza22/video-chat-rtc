class VideoChatApp {
    #userListComponent;

    constructor(config) {
        this.localVideo = config.localVideo;
        this.setUpUserListComponent(config.userListComponent);
        this.rtcConn = new RtcConnHandler(config.remoteVideo);
        this.socket = config.socket;
        this.addSocketListeners();
    }

    async start() {
        let localUserMediaStream = await window.navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true
        });
        this.localVideo.srcObject = localUserMediaStream;
        this.rtcConn.addStream(localUserMediaStream);
    }

    async callUser(socketId) {
        const offer = await this.rtcConn.createOffer()
        console.log("call user", offer)
        this.socket.emit("call-user", {offer, to: socketId});
        await this.rtcConn.onIceCandidate((candidate) => {
            if (candidate) {
                this.socket.emit("ice-candidate", {candidate, to: socketId});
            }
        });
    }

    setUpUserListComponent(userListComponent) {
        userListComponent.addEventListener(userListComponent.USER_CLICKED_EVENT, this.callUser.bind(this));
        this.#userListComponent = userListComponent;
    }

    addSocketListeners() {
        this.socket.on("call-made", this.onCallMade.bind(this));
        this.socket.on("answer-made", async data => {
            console.log("answer made", data)
            await this.rtcConn.setAnswer(data.answer)
        });

        this.socket.on("ice-candidate-post", async data => {
            await this.rtcConn.addIceCandidate(data.candidate)
        });

        this.socket.on("update-user-list", ({users}) => {
            this.#userListComponent.updateUserList(users);
        });

        this.socket.on("remove-user", ({socketId}) => {
            const elToRemove = document.getElementById(socketId);
            if (elToRemove) {
                elToRemove.remove();
            }
        });
    }

    async onCallMade(data) {
        console.log("call made", data)
        const answer = await this.rtcConn.createAnswer(data.offer)
        this.socket.emit("make-answer", {answer, to: data.socket});
        await this.rtcConn.onIceCandidate((candidate) => {
            if (candidate) {
                this.socket.emit("ice-candidate", {candidate, to: data.socket});
            }
        });
    }
}

class UserListComponent {
    #parentContainer;
    #eventListeners = {};
    USER_CLICKED_EVENT = "userClicked";

    constructor(parentContainer) {
        this.#parentContainer = parentContainer;
    }

    addEventListener(event, callback) {
        this.#eventListeners[event] = callback;
    }

    updateUserList(socketIds) {
        socketIds.forEach(socketId => {
            const alreadyExistingUser = document.getElementById(socketId);
            if (!alreadyExistingUser) {
                const userContainerEl = this.#createUserItemContainer(socketId);
                this.#parentContainer.appendChild(userContainerEl);
            }
        });
    }

    #unselectUsersFromList() {
        const alreadySelectedUser = document.querySelectorAll(
            ".active-user.active-user--selected"
        );

        alreadySelectedUser.forEach(el => {
            el.setAttribute("class", "active-user");
        });
    }

    #createUserItemContainer(socketId) {
        const userContainerEl = document.createElement("div");
        userContainerEl.setAttribute("class", "active-user");
        userContainerEl.setAttribute("id", socketId);

        const usernameEl = document.createElement("p");
        usernameEl.setAttribute("class", "username");
        usernameEl.innerHTML = `User: ${socketId}`;

        userContainerEl.appendChild(usernameEl);

        userContainerEl.addEventListener("click", () => {
            this.#unselectUsersFromList();
            userContainerEl.setAttribute("class", "active-user active-user--selected");
            const talkingWithInfo = document.getElementById("talking-with-info");
            talkingWithInfo.innerHTML = `Talking with: "Socket: ${socketId}"`;
            this.#eventListeners[this.USER_CLICKED_EVENT](socketId);
        });
        return userContainerEl;
    }
}

let app = new VideoChatApp({
    localVideo: document.getElementById("local-video"),
    remoteVideo: document.getElementById("remote-video"),
    userListComponent: new UserListComponent(document.getElementById("active-user-container")),
    socket: io.connect("localhost:4000")
});
app.start();

