import { useState } from 'react';
import axios from 'axios';

export const useHook = () => {
  const [active, setActive] = useState(false);
  // const [mse, setMse] = useState(null);
  // const [type, setType] = useState('live');
  const [hls, setHls] = useState(null);
  const [ws, setWs] = useState(null);
  const [mseSourceBuffer, setMseSourceBuffer] = useState(null);
  const [mseQueue, setMseQueue] = useState([]);
  const [mseStreamingStarted, setMseStreamingStarted] = useState(false);
  const [webrtc, setWebrtc] = useState(null);
  const [webrtcSendChannel, setWebrtcSendChannel] = useState(null);
  const [webrtcSendChannelInterval, setWebrtcSendChannelInterval] = useState(null);
  const [uuid, setUuid] = useState(null);

  const clearPlayer = () => {
    if (active) {
      if (hls != null) {
        hls.destroy();
        setHls(null);
      }
      if (ws != null) {
        //close WebSocket connection if opened
        ws.close(1000);
        setWs(null);
      }
      if (webrtc != null) {
        clearInterval(webrtcSendChannelInterval);
        setWebrtc(null);
      }
      // $('#videoPlayer')[0].src = '';
      // $('#videoPlayer')[0].load();

      setActive(false);
    }
  };

  const streamPlayUrl = () => {
    return `http://10.64.0.25:8083/stream/${uuid}/channel/0/webrtc?uuid=${uuid}`;
  };

  const handleNegotiationNeeded = async () => {
    const offer = await webrtc.createOffer();
    await webrtc.setLocalDescription(offer);
    await axios.post(
      streamPlayUrl('webrtc'),
      {
        data: btoa(webrtc.localDescription.sdp),
      },
      function (data) {
        //console.log(data)
        try {
          webrtc.setRemoteDescription(
            new RTCSessionDescription({
              type: 'answer',
              sdp: atob(data),
            })
          );
        } catch (e) {
          console.warn(e);
        }
      }
    );
  };

  const playWebrtc = () => {
    setWebrtc(
      new RTCPeerConnection({
        iceServers: [
          {
            urls: ['stun:stun.l.google.com:19302'],
          },
        ],
      })
    );
    webrtc.onnegotiationneeded = handleNegotiationNeeded;
    webrtc.ontrack = function (event) {
      // console.log(event.streams.length + ' track is delivered');
      // $('#videoPlayer')[0].srcObject = event.streams[0];
      // $('#videoPlayer')[0].play();
    };
    webrtc.addTransceiver('video', {
      direction: 'sendrecv',
    });
    setWebrtcSendChannel(webrtc.createDataChannel('foo'));
    webrtcSendChannel.onclose = () => console.log('sendChannel has closed');
    webrtcSendChannel.onopen = () => {
      console.log('sendChannel has opened');
      webrtcSendChannel.send('ping');
      webrtcSendChannelInterval = setInterval(() => {
        webrtcSendChannel.send('ping');
      }, 1000);
    };

    webrtcSendChannel.onmessage = (e) => console.log(e.data);
  };

  const pushPacket = () => {
    if (mseSourceBuffer.updating) {
      if (mseQueue.length > 0) {
        const packet = mseQueue.shift();
        const view = new Uint8Array(packet);
        mseSourceBuffer.appendBuffer(packet);
      } else {
        setMseStreamingStarted(false);
      }
    }
  };

  const readPacket = (packet) => {
    if (!mseStreamingStarted) {
      mseSourceBuffer.appendBuffer(packet);
      setMseStreamingStarted(true);
      return;
    }
    setMseQueue(mseQueue.push(packet));

    if (mseSourceBuffer.updating) {
      pushPacket();
    }
  };

  const livePlayer = (type, uuid) => {
    clearPlayer();
    setUuid(uuid);
    setActive(true);
    playWebrtc();
  };

  return { clearPlayer, streamPlayUrl, handleNegotiationNeeded, playWebrtc, pushPacket };
};
