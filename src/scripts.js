var rtspPlayer = {
    active: false,
    type: 'live',
    hls: null,
    ws: null,
    mseSourceBuffer: null,
    mse: null,
    mseQueue: [],
    mseStreamingStarted: false,
    webrtc: null,
    webrtcSendChannel: null,
    webrtcSendChannelInterval: null,
    uuid: null,
    clearPlayer: function () {
        if (this.active) {

            if (this.hls != null) {
                this.hls.destroy();
                this.hls = null;
            }
            if (this.ws != null) {
                //close WebSocket connection if opened
                this.ws.close(1000);
                this.ws = null;
            }
            if (this.webrtc != null) {
                clearInterval(this.webrtcSendChannelInterval);

                this.webrtc = null;
            }
            $('#videoPlayer')[0].src = '';
            $('#videoPlayer')[0].load();


            this.active = false;
        }
    },
    livePlayer: function (type, uuid) {
        this.clearPlayer();
        this.uuid = uuid;
        this.active = true;

        this.playWebrtc();

    },
    playWebrtc: function () {
        var _this = this;
        this.webrtc = new RTCPeerConnection({
            iceServers: [{
                urls: ["stun:stun.l.google.com:19302"]
            }]
        });
        this.webrtc.onnegotiationneeded = this.handleNegotiationNeeded;
        this.webrtc.ontrack = function (event) {
            console.log(event.streams.length + ' track is delivered');
            $("#videoPlayer")[0].srcObject = event.streams[0];
            $("#videoPlayer")[0].play();
        }
        this.webrtc.addTransceiver('video', {
            'direction': 'sendrecv'
        });
        this.webrtcSendChannel = this.webrtc.createDataChannel('foo');
        this.webrtcSendChannel.onclose = () => console.log('sendChannel has closed');
        this.webrtcSendChannel.onopen = () => {
            console.log('sendChannel has opened');
            this.webrtcSendChannel.send('ping');
            this.webrtcSendChannelInterval = setInterval(() => {
                this.webrtcSendChannel.send('ping');
            }, 1000)
        }

        this.webrtcSendChannel.onmessage = e => console.log(e.data);
    },
    handleNegotiationNeeded: async function () {
        var _this = rtspPlayer;

        offer = await _this.webrtc.createOffer();
        await _this.webrtc.setLocalDescription(offer);
        $.post(_this.streamPlayUrl('webrtc'), {
            data: btoa(_this.webrtc.localDescription.sdp)
        }, function (data) {
            //console.log(data)
            try {

                _this.webrtc.setRemoteDescription(new RTCSessionDescription({
                    type: 'answer',
                    sdp: atob(data)
                }))



            } catch (e) {
                console.warn(e);
            }

        });
    },
    readPacket: function (packet) {
        if (!this.mseStreamingStarted) {
            this.mseSourceBuffer.appendBuffer(packet);
            this.mseStreamingStarted = true;
            return;
        }
        this.mseQueue.push(packet);

        if (!this.mseSourceBuffer.updating) {
            this.pushPacket();
        }
    },
    pushPacket: function () {
        var _this = rtspPlayer;
        if (!_this.mseSourceBuffer.updating) {
            if (_this.mseQueue.length > 0) {
                packet = _this.mseQueue.shift();
                var view = new Uint8Array(packet);
                _this.mseSourceBuffer.appendBuffer(packet);
            } else {
                _this.mseStreamingStarted = false;
            }
        }
    },
    streamPlayUrl: function (type) {

        return "http://10.64.0.25:8083/stream/" + this.uuid + "/channel/0/webrtc?uuid=" + this.uuid;
    }

}
