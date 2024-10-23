class ServerConnHandler {

    #localUserMediaStream;

    constructor(userMediaStream) {
        this.#localUserMediaStream = userMediaStream;
    }


    #createRtcConnection(videoOutput, audioOutput) {
        const rtcConn = new RtcConnHandler({});
        rtcConn.onTrack((evt) => {
            if (evt.track.kind === 'video') {
                videoOutput.srcObject = evt.streams[0];
                return
            }
            //TODO: Disabled audio output for now.
            // audioOutput.srcObject = evt.streams[0];

        });
        rtcConn.onIceCandidate(async (candidate) => {
            if (candidate) {
                await rtcConn.addIceCandidate(candidate)
            }
        });
        rtcConn.addStream(this.#localUserMediaStream);
        return rtcConn;
    }

    async sendOffer(offer) {
        return fetch('/offer', {
            body: JSON.stringify({
                sdp: offer.sdp,
                type: offer.type,
                video_transform: ""
            }),
            headers: {
                'Content-Type': 'application/json'
            },
            method: 'POST'
        });
    }

    async connect(videoOutput, audioOutput) {
        const conn = this.#createRtcConnection(videoOutput, audioOutput)

        conn.onIceComplete(async (e) => {
            console.log("Ice complete")
            const resp = await this.sendOffer(conn.rtcConn.localDescription)
            const answer = await resp.json()
            await conn.setAnswer(answer)
        })
        await conn.createOffer()
    }
}
