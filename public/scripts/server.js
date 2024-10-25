class ServerConnHandler {

    #localUserMediaStream;
    #userId;

    constructor(userMediaStream, userId) {
        this.#localUserMediaStream = userMediaStream;
        this.#userId = userId;
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
        rtcConn.onIceCandidate(async (e) => {
            if (e.candidate) {
                await rtcConn.addIceCandidate(e.candidate)
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
                stream_id: this.#userId,
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
            const resp = await this.sendOffer(conn.rtcConn.localDescription)
            const answer = await resp.json()
            await conn.setAnswer(answer)
        })
        await conn.createOffer()
    }
}
