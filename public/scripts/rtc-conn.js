class RtcConnHandler {
    remoteDesc;
    ices = [];
    isCaller = false;
    eventHandlers = {
        ontrack: (e) => {
            console.log("onTrack", e);
        },
        onicecandidate: (e) => {
            console.log("onicecandidate", e);
        },
        onicecandidateerror: (e) => {
            console.log("onicecandidateerror", e);
        }
    }

    constructor() {
        const servers = {
            iceServers: [
                {
                    urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
                },
            ],
            iceCandidatePoolSize: 10,
        };
        this.conn = new RTCPeerConnection(servers);
        this.conn.ontrack = (e) => {
            this.eventHandlers["ontrack"](e.streams[0]);
        }
        this.conn.onicecandidateerror = (e) => {
            this.eventHandlers["onicecandidate"](e);
        }
        this.conn.onicecandidate = (e) => {
            this.eventHandlers["onicecandidate"](e.candidate);
        }
    }

    onTrack(sendTrack) {
        this.eventHandlers["ontrack"] = sendTrack;
    }

    onIceCandidate(sendCandidate) {
        this.eventHandlers["onicecandidate"] = sendCandidate;
    }


    async createOffer() {
        // browser 1
        const offer = await this.conn.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
        });
        let rtcSessionDescription = new RTCSessionDescription(offer);
        await this.conn.setLocalDescription(rtcSessionDescription);
        this.isCaller = true;
        return offer;
    }

    async createAnswer(offer) {
        //browser 2
        let sessionDescription = new RTCSessionDescription(offer);
        await this.conn.setRemoteDescription(sessionDescription);

        const answer = await this.conn.createAnswer();
        let rtcSessionDescription = new RTCSessionDescription(answer);
        await this.conn.setLocalDescription(rtcSessionDescription);
        return answer;
    }

    async setAnswer(desc) {
        //widnow 1
        this.remoteDesc = desc;
        let rtcSessionDescription = new RTCSessionDescription(desc);
        await this.conn.setRemoteDescription(rtcSessionDescription);
    }

    addStream(stream) {
        const audioTracks = stream.getAudioTracks();
        const videoTracks = stream.getVideoTracks();
        for (const audioTrack of audioTracks) {
            console.log(`Using audio device: ${audioTrack.label}`);
        }
        for (const videoTrack of videoTracks) {
            console.log(`Using video device: ${videoTrack.label}`);
        }

        stream.getTracks().forEach(track => {
            this.conn.addTrack(track, stream)
        });
    }

    close() {
        this.conn.close();
    }

    async addIceCandidate(candidate) {
        if (this.isCaller && !this.remoteDesc) {
            this.ices.push(candidate);
            return;
        }

        if (this.isCaller && this.remoteDesc) {
            await this.conn.addIceCandidate(candidate);
            return
        }
        await this.conn.addIceCandidate(candidate);
    }
}