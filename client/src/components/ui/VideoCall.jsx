import { useEffect, useRef, useState, useCallback } from "react";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

/**
 * VideoCall component
 *
 * Props:
 *  socket        – socket.io socket instance
 *  requestId     – the service request ID (used as room key)
 *  isCaller      – true if this user initiates the call
 *  onEnd         – callback when call ends/is rejected
 *  remoteLabel   – display name of the remote participant
 */
export default function VideoCall({ socket, requestId, isCaller, onEnd, remoteLabel = "Remote", initialOffer = null }) {
  const [callState, setCallState] = useState(isCaller ? "calling" : "incoming"); // calling | incoming | active | ended
  const [micMuted, setMicMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [error, setError] = useState("");
  const [callDuration, setCallDuration] = useState(0);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const timerRef = useRef(null);
  const iceCandidatesQueue = useRef([]);

  // ── Utility: cleanup everything ──
  const cleanup = useCallback(() => {
    clearInterval(timerRef.current);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
  }, []);

  // ── Create RTCPeerConnection and wire up events ──
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        socket.emit("video:ice", { requestId, candidate });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("[VideoCall] ICE state:", pc.iceConnectionState);
      if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
        setError("Connection lost. Please try again.");
      }
    };

    pc.ontrack = (e) => {
      if (remoteVideoRef.current && e.streams[0]) {
        remoteVideoRef.current.srcObject = e.streams[0];
        setCallState("active");
        // Start timer
        let s = 0;
        timerRef.current = setInterval(() => setCallDuration(++s), 1000);
      }
    };

    return pc;
  }, [socket, requestId]);

  // ── Get user media ──
  const getMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      setError("Camera/microphone access denied. Please allow permissions.");
      throw err;
    }
  }, []);

  // ── Start call (caller side) ──
  const startCall = useCallback(async () => {
    try {
      const stream = await getMedia();
      const pc = createPeerConnection();
      pcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      // Signal incoming ring to remote
      socket.emit("video:ring", { requestId });

      // Create and send offer
      const offer = await pc.createOffer({ offerToReceiveVideo: true, offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);
      socket.emit("video:offer", { requestId, offer });
    } catch (err) {
      console.error("[VideoCall] startCall error:", err);
    }
  }, [getMedia, createPeerConnection, socket, requestId]);

  // ── Accept call (callee side) ──
  const acceptCall = useCallback(async (offer) => {
    try {
      setCallState("calling");
      const stream = await getMedia();
      const pc = createPeerConnection();
      pcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      // Drain queued ICE candidates
      for (const c of iceCandidatesQueue.current) {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      }
      iceCandidatesQueue.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("video:answer", { requestId, answer });
    } catch (err) {
      console.error("[VideoCall] acceptCall error:", err);
      setError("Failed to connect call.");
    }
  }, [getMedia, createPeerConnection, socket, requestId]);

  // Ref to store the received offer before user accepts.
  // Pre-populated with initialOffer when the dashboard captured the offer before VideoCall mounted.
  const pendingOfferRef = useRef(initialOffer);

  // ── Socket event listeners ──
  useEffect(() => {
    const handleOffer = async ({ offer }) => {
      pendingOfferRef.current = offer;
      if (callState === "incoming") {
        // Wait for user to click Accept (handled in acceptCall)
      }
    };

    const handleAnswer = async ({ answer }) => {
      if (pcRef.current) {
        try {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (err) {
          console.error("[VideoCall] setRemoteDescription error:", err);
        }
      }
    };

    const handleIce = async ({ candidate }) => {
      if (pcRef.current && pcRef.current.remoteDescription) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch {
          // Queue if remote desc not ready yet
          iceCandidatesQueue.current.push(candidate);
        }
      } else {
        iceCandidatesQueue.current.push(candidate);
      }
    };

    const handleEnd = () => {
      setCallState("ended");
      cleanup();
      setTimeout(() => onEnd?.(), 1500);
    };

    const handleReject = () => {
      setCallState("ended");
      cleanup();
      setTimeout(() => onEnd?.(), 1500);
    };

    socket.on("video:offer", handleOffer);
    socket.on("video:answer", handleAnswer);
    socket.on("video:ice", handleIce);
    socket.on("video:end", handleEnd);
    socket.on("video:reject", handleReject);

    return () => {
      socket.off("video:offer", handleOffer);
      socket.off("video:answer", handleAnswer);
      socket.off("video:ice", handleIce);
      socket.off("video:end", handleEnd);
      socket.off("video:reject", handleReject);
    };
  }, [socket, callState, cleanup, onEnd]);

  // ── Auto-start for caller; auto-accept for callee when offer was pre-captured ──
  useEffect(() => {
    if (isCaller) {
      startCall();
    } else if (initialOffer) {
      // The offer arrived before VideoCall mounted (banner was shown in dashboard).
      // Skip the incoming screen and connect immediately.
      acceptCall(initialOffer);
    }
    return () => {
      cleanup();
    };
  }, []); // intentionally run once

  const handleEndCall = () => {
    socket.emit("video:end", { requestId });
    cleanup();
    onEnd?.();
  };

  const handleRejectCall = () => {
    socket.emit("video:reject", { requestId });
    cleanup();
    onEnd?.();
  };

  const handleAccept = () => {
    if (pendingOfferRef.current) {
      acceptCall(pendingOfferRef.current);
    }
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = micMuted;
      });
      setMicMuted(!micMuted);
    }
  };

  const toggleCam = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => {
        t.enabled = camOff;
      });
      setCamOff(!camOff);
    }
  };

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="video-call-overlay">
      {/* ── Incoming call screen ── */}
      {callState === "incoming" && (
        <div className="incoming-call">
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "linear-gradient(135deg,#34d399,#059669)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              margin: "0 auto 16px",
              boxShadow: "0 0 0 16px rgba(52,211,153,0.1), 0 0 0 32px rgba(52,211,153,0.05)",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          >
            📹
          </div>
          <h3 style={{ fontSize: 20, fontWeight: 800, color: "#f1f5f9", marginBottom: 6 }}>
            Incoming Video Call
          </h3>
          <p style={{ fontSize: 14, color: "#64748b", marginBottom: 28 }}>
            {remoteLabel} wants to start a video call
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
            <button
              onClick={handleRejectCall}
              className="video-btn video-btn-end"
              title="Decline"
              style={{ width: 64, height: 64, fontSize: 26 }}
            >
              📵
            </button>
            <button
              onClick={handleAccept}
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
                background: "#22c55e",
                color: "white",
                boxShadow: "0 4px 15px rgba(34,197,94,0.4)",
                transition: "all 0.2s",
              }}
              title="Accept"
            >
              📞
            </button>
          </div>
        </div>
      )}

      {/* ── Calling / connecting screen ── */}
      {callState === "calling" && (
        <div style={{ textAlign: "center", color: "#f1f5f9" }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "linear-gradient(135deg,#60a5fa,#7c3aed)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              margin: "0 auto 20px",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          >
            📹
          </div>
          <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            {isCaller ? "Calling..." : "Connecting..."}
          </h3>
          <p style={{ color: "#64748b", marginBottom: 32 }}>{remoteLabel}</p>
          <button onClick={handleEndCall} className="video-btn video-btn-end" title="Cancel">
            📵
          </button>
        </div>
      )}

      {/* ── Active call screen ── */}
      {(callState === "active" || callState === "calling") && (
        <div style={{ width: "100%", maxWidth: 960, padding: "0 16px" }}>
          {/* Duration bar */}
          {callState === "active" && (
            <div style={{ textAlign: "center", marginBottom: 12, fontSize: 13, color: "#94a3b8" }}>
              <span style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 100, padding: "3px 12px", color: "#4ade80", fontWeight: 600 }}>
                🟢 {formatTime(callDuration)} · {remoteLabel}
              </span>
            </div>
          )}

          {/* Video area */}
          <div className="video-main">
            {/* Remote video (full area) */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{ width: "100%", height: "100%", objectFit: "cover", background: "#0f172a" }}
            />

            {/* Placeholder if remote not connected yet */}
            {callState !== "active" && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#0f172a",
                  color: "#475569",
                }}
              >
                <span style={{ fontSize: 48, marginBottom: 12 }}>👤</span>
                <p style={{ fontSize: 14 }}>Waiting for {remoteLabel}...</p>
              </div>
            )}

            {/* Self video (PiP) */}
            <div className="video-self">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
              />
              {camOff && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "#1e293b",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 24,
                  }}
                >
                  🚫
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="video-controls">
            <button
              onClick={toggleMic}
              className={`video-btn ${micMuted ? "video-btn-muted" : "video-btn-mute"}`}
              title={micMuted ? "Unmute" : "Mute"}
            >
              {micMuted ? "🔇" : "🎙️"}
            </button>

            <button
              onClick={handleEndCall}
              className="video-btn video-btn-end"
              title="End call"
              style={{ width: 68, height: 68, fontSize: 26 }}
            >
              📵
            </button>

            <button
              onClick={toggleCam}
              className={`video-btn ${camOff ? "video-btn-muted" : "video-btn-mute"}`}
              title={camOff ? "Turn on camera" : "Turn off camera"}
            >
              {camOff ? "🚫" : "📷"}
            </button>
          </div>

          {error && (
            <p style={{ color: "#f87171", marginTop: 12, fontSize: 13, textAlign: "center" }}>{error}</p>
          )}
        </div>
      )}

      {/* ── Call ended ── */}
      {callState === "ended" && (
        <div style={{ textAlign: "center", color: "#f1f5f9" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📵</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Call ended</h3>
          <p style={{ color: "#64748b" }}>Duration: {formatTime(callDuration)}</p>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 16px rgba(96,165,250,0.1), 0 0 0 32px rgba(96,165,250,0.05); }
          50% { box-shadow: 0 0 0 20px rgba(96,165,250,0.15), 0 0 0 38px rgba(96,165,250,0.07); }
        }
      `}</style>
    </div>
  );
}
