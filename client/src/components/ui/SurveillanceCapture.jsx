import { useEffect, useRef, useState } from "react";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
  ],
};

/**
 * SurveillanceCapture – mounted on the Driver / Mechanic dashboard.
 * Opens camera on login and streams live to any watching admin via WebRTC.
 * The admin is the answerer; this component is the offerer.
 */
export default function SurveillanceCapture({ socket, userId, role, name }) {
  const [status, setStatus] = useState("starting"); // starting | live | error
  const localStreamRef = useRef(null);
  // Map of adminSocketId → { pc, iceQueue[] } so many admins can watch
  const peersRef = useRef({});

  // ─── 1. Start camera, register with server ───────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        localStreamRef.current = stream;
        setStatus("live");
        socket.emit("surveillance:start", { userId, role, name });
      } catch (err) {
        console.warn("[SurveillanceCapture] Camera denied:", err.message);
        setStatus("error");
      }
    };

    start();

    // If socket reconnects (Render free tier sleep/wake, network blip), re-announce presence
    const onReconnect = () => {
      if (localStreamRef.current) {
        socket.emit("surveillance:start", { userId, role, name });
      }
    };
    socket.on("connect", onReconnect);

    return () => {
      cancelled = true;
      socket.off("connect", onReconnect);
      socket.emit("surveillance:stop", { userId });
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      Object.values(peersRef.current).forEach(({ pc }) => pc.close());
      peersRef.current = {};
    };
  }, [socket, userId, role, name]);

  // ─── 2. WebRTC signaling ──────────────────────────────────────────────────
  useEffect(() => {
    // Admin wants to watch → we create a PeerConnection and send an offer
    const handleWatchRequest = async ({ adminSocketId }) => {
      if (!localStreamRef.current) {
        console.warn("[SurveillanceCapture] watch_request but no stream yet");
        return;
      }

      // Close any stale PC for this admin
      if (peersRef.current[adminSocketId]) {
        peersRef.current[adminSocketId].pc.close();
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peersRef.current[adminSocketId] = { pc, iceQueue: [] };

      // Push all camera tracks into the connection
      localStreamRef.current.getTracks().forEach((t) =>
        pc.addTrack(t, localStreamRef.current)
      );

      // Send our ICE candidates to this admin
      pc.onicecandidate = ({ candidate }) => {
        if (candidate) {
          socket.emit("surveillance:ice", { toSocketId: adminSocketId, candidate });
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log(`[SurveillanceCapture] ICE → admin ${adminSocketId}:`, pc.iceConnectionState);
        if (pc.iceConnectionState === "failed") {
          pc.restartIce?.();
        }
        if (pc.iceConnectionState === "closed" || pc.iceConnectionState === "disconnected") {
          pc.close();
          delete peersRef.current[adminSocketId];
        }
      };

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("surveillance:offer", { toSocketId: adminSocketId, offer });
        console.log("[SurveillanceCapture] offer sent to admin", adminSocketId);
      } catch (err) {
        console.error("[SurveillanceCapture] createOffer error:", err);
      }
    };

    // Admin answered our offer — server now forwards fromSocketId (= adminSocketId)
    const handleAnswer = async ({ answer, fromSocketId: adminSocketId }) => {
      const entry = peersRef.current[adminSocketId];
      if (!entry) {
        console.warn("[SurveillanceCapture] answer from unknown admin", adminSocketId);
        return;
      }
      const { pc, iceQueue } = entry;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        console.log("[SurveillanceCapture] remote description set for admin", adminSocketId);
        // Drain any ICE candidates that arrived before the answer
        for (const c of iceQueue) {
          await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
        }
        entry.iceQueue = [];
      } catch (err) {
        console.error("[SurveillanceCapture] setRemoteDescription error:", err);
      }
    };

    // ICE candidate from admin — server now forwards fromSocketId (= adminSocketId)
    const handleIce = async ({ candidate, fromSocketId: adminSocketId }) => {
      const entry = peersRef.current[adminSocketId];
      if (!entry) return;
      const { pc, iceQueue } = entry;
      if (pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
      } else {
        iceQueue.push(candidate);
      }
    };

    socket.on("surveillance:watch_request", handleWatchRequest);
    socket.on("surveillance:answer", handleAnswer);
    socket.on("surveillance:ice", handleIce);

    return () => {
      socket.off("surveillance:watch_request", handleWatchRequest);
      socket.off("surveillance:answer", handleAnswer);
      socket.off("surveillance:ice", handleIce);
    };
  }, [socket]);

  // ─── UI: small pill badge ─────────────────────────────────────────────────
  if (status === "error") return null; // silent if no camera

//   return (
    // <div
    //   title="Your camera is being monitored by the admin for safety"
    //   style={{
    //     display: "inline-flex",
    //     alignItems: "center",
    //     gap: 6,
    //     padding: "4px 10px",
    //     borderRadius: 20,
    //     fontSize: 1,
    //     fontWeight: 700,
    //     letterSpacing: "0.04em",
    //     cursor: "default",
    //     userSelect: "none",
    //     background: status === "live"
    //       ? "rgba(239,68,68,0.15)"
    //       : "rgba(100,116,139,0.15)",
    //     border: `1px solid ${status === "live" ? "rgba(239,68,68,0.3)" : "rgba(100,116,139,0.3)"}`,
    //     color: status === "live" ? "#f87171" : "#94a3b8",
    //   }}
    // >
    //   <span
    //     style={{
    //       width: 7,
    //       height: 7,
    //       borderRadius: "50%",
    //       background: status === "live" ? "#ef4444" : "#64748b",
    //       display: "inline-block",
    //       animation: status === "live" ? "pulse 1.5s ease-in-out infinite" : "none",
    //     }}
    //   />
    //   {status === "live" ? "LIVE" : "Starting…"}
    // </div>
//   );
}
