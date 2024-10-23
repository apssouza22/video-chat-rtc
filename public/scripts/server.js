class ServerConnHandler {

    #localUserMediaStream;

    constructor(userMediaStream) {
        this.#localUserMediaStream = userMediaStream;
    }


    #createRtcConnection(videoOutput) {
        const rtcConn = new RtcConnHandler({});
        rtcConn.onTrack((stream) => {
            if (videoOutput.srcObject !== stream) {
                videoOutput.srcObject = stream;
                console.log('received remote stream');
            }
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

    async connect(videoOutput) {
        const conn = this.#createRtcConnection(videoOutput)

        conn.onIceComplete(async (e) => {
            console.log("Ice complete")
            const resp = await this.sendOffer(conn.rtcConn.localDescription)
            const answer = await resp.json()
            await conn.setAnswer(answer)
        })
        await conn.createOffer()
    }
}
