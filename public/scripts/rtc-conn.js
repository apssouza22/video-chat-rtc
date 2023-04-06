

class RtcConnHandler {
    remoteDesc;
    ices = [];
    isCaller = false;

    constructor() {
        const servers = {
            iceServers: [
                {
                    urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
                },
            ],
            iceCandidatePoolSize: 10,
        };
        this.conn = new RTCPeerConnection(servers );
        this.conn.ontrack = (e) => {
            if (remoteVideo.srcObject !== e.streams[0]) {
                remoteVideo.srcObject = e.streams[0];
                console.log('received remote stream');
            }
        }
        this.conn.onicecandidateerror = (e) => {
            console.log("onicecandidateerror", e);
        }
    }

    async onIceCandidate(sendCandidate) {
        this.conn.onicecandidate = async (e) => {
            sendCandidate(e.candidate);
        }
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
        console.log("atd Candidate: ", this.ices.length);
        // for (const ice of this.ices) {
        //     console.log("Add ICE Candidate later: ", ice);
        //     await this.conn.addIceCandidate(ice);
        // }
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
            console.log("Add ice to caller", candidate )
            await this.conn.addIceCandidate(candidate);
            return
        }

        console.log("Add ice to called", candidate )
        await this.conn.addIceCandidate(candidate);
    }
}