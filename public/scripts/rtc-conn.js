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
class RtcConnHandler {
    constructor() {
        this.conn = new RTCPeerConnection();
        this.conn.onicecandidate = (e) => {
            // if (e.candidate) {
            //     console.log("ICE Candidate: ", e.candidate);
            // }
            handleCandidate(e.candidate, this.conn, 'pc2: ', 'remote');
        }

        this.conn.ontrack = (e) => {
            if (remoteVideo.srcObject !== e.streams[0]) {
                remoteVideo.srcObject = e.streams[0];
                console.log('received remote stream');
            }
        }
        this.conn.ondatachannel = (e) => {
            // console.log("ondatachannel", e);
        }
        this.conn.onicecandidateerror = (e) => {
            console.log("onicecandidateerror", e);
        }
        this.conn.oniceconnectionstatechange = (e) => {
            // console.log("oniceconnectionstatechange", e);
        }
        this.conn.onicegatheringstatechange = (e) => {
            // console.log("onicegatheringstatechange", e);
        }
        this.conn.onsignalingstatechange = (e) => {
            // console.log("onsignalingstatechange", e);
        }
        this.conn.onnegotiationneeded = (e) => {
            // console.log("onnegotiationneeded", e);
        }
        this.conn.onconnectionstatechange = (e) => {
            // console.log("onconnectionstatechange", e);
        }
        this.conn.onstatsended = (e) => {
            console.log("onstatsended", e);
        }
    }


    async createOffer() {
        // const offer = await peerConnection.createOffer( {
        //     offerToReceiveAudio: true,
        //     offerToReceiveVideo: true
        // });
        // await peerConnection.setLocalDescription(new RTCSessionDescription(offer));

        const offer = await this.conn.createOffer( {
            offerToReceiveAudio: false,
            offerToReceiveVideo: true
        });
        let rtcSessionDescription = new RTCSessionDescription(offer);
        await this.conn.setLocalDescription(offer);
        return offer;
    }

    async createAnswer(offer) {
        // await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
        // const answer = await peerConnection.createAnswer();
        // await peerConnection.setLocalDescription(new RTCSessionDescription(answer));

        let sessionDescription = new RTCSessionDescription(offer);
        await this.conn.setRemoteDescription(offer);

        const answer = await this.conn.createAnswer();
        let rtcSessionDescription = new RTCSessionDescription(answer);
        await this.conn.setLocalDescription(answer);
        return answer;
    }

    async setAnswer(desc) {
        // await peerConnection.setRemoteDescription(
        //     new RTCSessionDescription(data.answer)
        // );
        let rtcSessionDescription = new RTCSessionDescription(desc);
        await this.conn.setRemoteDescription(desc);
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

    getRemoteStream() {
        // return this.conn.getRemoteStreams()[0];
    }

    close() {
        this.conn.close();
    }
}