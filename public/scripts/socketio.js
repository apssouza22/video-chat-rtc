class SocketIo {

    constructor(socket){
        this.socket = socket;
        this.eventListeners = {};
        this.#addSocketListeners();
    }

    on(event, callback) {
        this.eventListeners[event] = callback;
    }

    emit(event, data) {
        this.socket.send(JSON.stringify({ event, data }));
    }

    #addSocketListeners() {
        this.socket.addEventListener('open', (event) => {
            console.log('Connected to the WebSocket server');
            this.socket.send(JSON.stringify({ event: 'join', data: 'Hello Server!' }));
        });

        this.socket.addEventListener('message', (event) => {
            const message = JSON.parse(event.data);
            console.log('Message from server:', message);
            if (this.eventListeners[message.event]) {
                this.eventListeners[message.event](message.data);
            }
        })

        this.socket.addEventListener('close', (event) => {
            if (this.eventListeners['close']) {
                this.eventListeners['close'](event);
            }
        });

        this.socket.addEventListener('error', (event) => {
            if (this.eventListeners['error']) {
                this.eventListeners['error'](event);
            }
        });
    }
}
