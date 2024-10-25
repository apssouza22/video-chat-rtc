class RtcConnHandler {
    #hasAnswerReceived;
    // STUN is a lightweight protocol that is used to discover the Public IP address and Port number of a client.
    // The client discovers its public IP address and port number and then tries to establish a direct connection with another device across the internet
    #stunServers = {urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']};
    #isCaller = false;
    #eventHandlers = {
        onicecandidateerror: (e) => {
            console.log(e);
        }
    }

    /**
     *
     * @param config {{
     *     stunServers: RTCIceServer[]
     *     turnServers: RTCIceServer[]
     * }}
     */
    constructor(config) {
        let iceServers = [config.stunServers ?? this.#stunServers];
        //The TURN server allocates a public IP address and port number for the client. This allocation acts as a relay endpoint through which all the communication will be sent and received.
        // With TURN servers you get guaranteed connectivity, dispite of several NAT and firewall restrictions include deep packet inspection firewalls that block most traffic you get the connectivity with TURN servers
        if (config.turnServers) {
            iceServers.push(config.turnServers);
        }
        const servers = {
            iceServers: iceServers,
            iceCandidatePoolSize: 10,
            sdpSemantics: 'unified-plan',
        };
        this.rtcConn = new RTCPeerConnection(servers);
        this.rtcConn.ontrack = (e) => {
            this.#eventHandlers["ontrack"](e);
        }
        this.rtcConn.onicecandidateerror = (e) => {
            this.#eventHandlers["onicecandidateerror"](e);
        }
        this.rtcConn.onicecandidate = (e) => {
            this.#eventHandlers["onicecandidate"](e.candidate);
        }
        this.rtcConn.onicegatheringstatechange = (e) => {
            console.log(this.rtcConn.iceGatheringState);
            if (this.rtcConn.iceGatheringState === 'complete') {
                if (this.#eventHandlers["onicecomplete"])
                    this.#eventHandlers["onicecomplete"](e);
            }
        }
        this.rtcConn.onsignalingstatechange = () => {
            console.log(this.rtcConn.signalingState);
        }
    }

    onIceComplete(iceCompleteListener) {
        this.#eventHandlers["onicecomplete"] = iceCompleteListener
    }

    onTrack(trackListener) {
        this.#eventHandlers["ontrack"] = trackListener;
    }

    onIceCandidate(sendCandidate) {
        this.#eventHandlers["onicecandidate"] = sendCandidate;
    }

    async createOffer() {
        const offer = await this.rtcConn.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
        });
        let rtcSessionDescription = new RTCSessionDescription(offer);
        await this.rtcConn.setLocalDescription(rtcSessionDescription);
        this.#isCaller = true;
        return offer;
    }

    async createAnswer(offer) {
        let sessionDescription = new RTCSessionDescription(offer);
        await this.rtcConn.setRemoteDescription(sessionDescription);

        const answer = await this.rtcConn.createAnswer();
        let rtcSessionDescription = new RTCSessionDescription(answer);
        await this.rtcConn.setLocalDescription(rtcSessionDescription);
        return answer;
    }

    async setAnswer(desc) {
        this.#hasAnswerReceived = desc;
        if (desc instanceof RTCSessionDescription) {
            await this.rtcConn.setRemoteDescription(desc);
            return
        }

        let rtcSessionDescription = new RTCSessionDescription(desc);
        await this.rtcConn.setRemoteDescription(rtcSessionDescription);
    }

    /**
     *
     * @param {MediaStream} userUserMediaStream
     */
    addStream(userUserMediaStream) {
        const audioTracks = userUserMediaStream.getAudioTracks();
        const videoTracks = userUserMediaStream.getVideoTracks();
        for (const audioTrack of audioTracks) {
            console.log(`Using audio device: ${audioTrack.label}`);
        }
        for (const videoTrack of videoTracks) {
            console.log(`Using video device: ${videoTrack.label}`);
        }

        userUserMediaStream.getTracks().forEach(track => {
            this.rtcConn.addTrack(track, userUserMediaStream)
        });
    }

    /**
     * Replace the track of the same kind with the new track
     * Used to replace the current video stream with something else. Ex screen sharing
     *
     * @param {MediaStreamTrack} track
     */
    replaceTrack(track) {
        this.rtcConn.getSenders().forEach(async sender => {
            if (sender.track.kind === track.kind) {
                await sender.replaceTrack(track);
            }
        });
    }

    close() {
        this.rtcConn.close();
    }

    async addIceCandidate(candidate) {
        if (this.#isCaller && !this.#hasAnswerReceived) {
            return;
        }

        if (this.#isCaller && this.#hasAnswerReceived) {
            await this.rtcConn.addIceCandidate(candidate);
            return
        }
        await this.rtcConn.addIceCandidate(candidate);
    }
}