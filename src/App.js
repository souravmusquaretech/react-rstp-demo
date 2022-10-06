import React, { useEffect } from 'react';
import { useHook } from './hook';

const App = () => {
  const { clearPlayer, streamPlayUrl, handleNegotiationNeeded, playWebrtc, pushPacket } = useHook();

  useEffect(() => {
    clearPlayer();
    handleNegotiationNeeded();
    playWebrtc();
    pushPacket();
  }, []);

  return (
    <div>
      <video id='videoPlayer' autoplay='' controls='' muted='' playsinline=''></video>
    </div>
  );
};

export default App;
