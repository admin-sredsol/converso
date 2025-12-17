"use client";

import { useEffect, useRef, useState } from "react";
import { cn, configureAssistant, getSubjectColor } from "@/lib/utils";
import { vapi } from "@/lib/vapi.sdk";
import Image from "next/image";
import Lottie, { LottieRefCurrentProps } from "lottie-react";
import soundwaves from "@/constants/soundwaves.json";
import { addToSessionHistory } from "@/lib/actions/companion.actions";
import type { Message } from "@/types/vapi";
import type { CompanionComponentProps, SavedMessage } from "@/types";

enum CallStatus {
  INACTIVE = "INACTIVE",
  CONNECTING = "CONNECTING",
  ACTIVE = "ACTIVE",
  FINISHED = "FINISHED",
}

const CompanionComponent = ({
  companionId,
  subject,
  topic,
  name,
  userName,
  userImage,
  style,
  voice,
}: CompanionComponentProps) => {
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const lottieRef = useRef<LottieRefCurrentProps>(null);

  useEffect(() => {
    if (lottieRef) {
      if (isSpeaking) {
        lottieRef.current?.play();
      } else {
        lottieRef.current?.stop();
      }
    }
  }, [isSpeaking, lottieRef]);

  useEffect(() => {
    const onCallStart = () => {
      console.log("Call started - microphone should be active");
      setCallStatus(CallStatus.ACTIVE);
      setIsReconnecting(false);
      setLastError(null);
      setRetryCount(0);
    };

    const onCallEnd = () => {
      console.log("Call ended");
      setCallStatus(CallStatus.FINISHED);
      addToSessionHistory(companionId);
    };

    const onMessage = (message: Message) => {
      console.log("Message received:", message);
      if (message.type === "transcript" && message.transcriptType === "final") {
        const newMessage = { role: message.role, content: message.transcript };
        setMessages((prev) => [newMessage, ...prev]);
      }
    };

    const onSpeechStart = () => {
      console.log("Speech started");
      setIsSpeaking(true);
    };
    const onSpeechEnd = () => {
      console.log("Speech ended");
      setIsSpeaking(false);
    };

    const onVolumeLevel = (level: number) => {
      setVolumeLevel(level);
    };

    const onError = (error: Error) => {
      console.error("Vapi Error:", error);
      setLastError(error?.message ?? "Unknown error");
      if (
        typeof error?.message === "string" &&
        error.message
          .toLowerCase()
          .includes("transport changed to disconnected")
      ) {
        void attemptReconnect();
        return;
      }
      if (
        typeof error?.message === "string" &&
        error.message.toLowerCase().includes("permission")
      ) {
        alert(
          "Microphone permissions are required. Please allow mic access in your browser and restart the session."
        );
      }
    };

    vapi.on("call-start", onCallStart);
    vapi.on("call-end", onCallEnd);
    vapi.on("message", onMessage);
    vapi.on("error", onError);
    vapi.on("speech-start", onSpeechStart);
    vapi.on("speech-end", onSpeechEnd);
    vapi.on("volume-level", onVolumeLevel);

    return () => {
      vapi.off("call-start", onCallStart);
      vapi.off("call-end", onCallEnd);
      vapi.off("message", onMessage);
      vapi.off("error", onError);
      vapi.off("speech-start", onSpeechStart);
      vapi.off("speech-end", onSpeechEnd);
      vapi.off("volume-level", onVolumeLevel);
    };
  }, [companionId]);

  const toggleMicrophone = () => {
    const isMuted = vapi.isMuted();
    vapi.setMuted(!isMuted);
    setIsMuted(!isMuted);
  };

  const startSession = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    console.log("Microphone permission granted", stream.getAudioTracks());

    const assistantOverrides = {
      variableValues: { subject, topic, style },
      clientMessages: [
        "transcript",
        "hang",
        "function-call",
        "speech-update",
        "metadata",
        "conversation-update",
      ],
      serverMessages: [],
    };

    // @ts-expect-error - Vapi types don't match the actual API signature for assistantOverrides
    vapi.start(configureAssistant(voice, style), assistantOverrides);
  };

  const handleCall = async () => {
    try {
      console.log("Starting call...");
      setCallStatus(CallStatus.CONNECTING);
      await startSession();
    } catch (error) {
      console.error("Failed to start call:", error);
      alert(
        "Failed to access microphone. Please allow microphone permissions and try again."
      );
      setCallStatus(CallStatus.INACTIVE);
    }
  };

  const attemptReconnect = async () => {
    if (isReconnecting || retryCount >= 3) return;
    setIsReconnecting(true);
    console.log("Attempting reconnect... (", retryCount + 1, "/ 3 )");
    try {
      vapi.stop();
      await new Promise((r) => setTimeout(r, 500));
      setCallStatus(CallStatus.CONNECTING);
      await startSession();
      setRetryCount((r) => r + 1);
      setIsReconnecting(false);
    } catch (err) {
      console.error("Reconnect failed:", err);
      setIsReconnecting(false);
    }
  };

  const handleDisconnect = () => {
    setCallStatus(CallStatus.FINISHED);
    vapi.stop();
    setIsReconnecting(false);
    setRetryCount(0);
    setLastError(null);
  };

  return (
    <section className="flex flex-col h-[70vh]">
      <section className="flex gap-8 max-sm:flex-col">
        <div className="companion-section">
          <div
            className="companion-avatar"
            style={{ backgroundColor: getSubjectColor(subject) }}
          >
            <div
              className={cn(
                "absolute transition-opacity duration-1000",
                callStatus === CallStatus.FINISHED ||
                  callStatus === CallStatus.INACTIVE
                  ? "opacity-1001"
                  : "opacity-0",
                callStatus === CallStatus.CONNECTING &&
                  "opacity-100 animate-pulse"
              )}
            >
              <Image
                src={`/icons/${subject}.svg`}
                alt={subject}
                width={150}
                height={150}
                className="max-sm:w-fit"
              />
            </div>

            <div
              className={cn(
                "absolute transition-opacity duration-1000",
                callStatus === CallStatus.ACTIVE ? "opacity-100" : "opacity-0"
              )}
            >
              <Lottie
                lottieRef={lottieRef}
                animationData={soundwaves}
                autoplay={false}
                className="companion-lottie"
              />
            </div>
          </div>
          <p className="font-bold text-2xl">{name}</p>
        </div>

        <div className="user-section">
          <div className="user-avatar">
            <Image
              src={userImage}
              alt={userName}
              width={130}
              height={130}
              className="rounded-lg"
            />
            <p className="font-bold text-2xl">{userName}</p>
          </div>
          <button
            className="btn-mic"
            onClick={toggleMicrophone}
            disabled={callStatus !== CallStatus.ACTIVE}
          >
            <Image
              src={isMuted ? "/icons/mic-off.svg" : "/icons/mic-on.svg"}
              alt="mic"
              width={36}
              height={36}
            />
            <p className="max-sm:hidden">
              {isMuted ? "Turn on microphone" : "Turn off microphone"}
            </p>
          </button>
          {callStatus === CallStatus.ACTIVE && (
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span>Mic Level: {Math.round(volumeLevel * 100)}%</span>
            </div>
          )}
          <button
            className={cn(
              "rounded-lg py-2 cursor-pointer transition-colors w-full text-white",
              callStatus === CallStatus.ACTIVE ? "bg-red-700" : "bg-primary",
              callStatus === CallStatus.CONNECTING && "animate-pulse"
            )}
            onClick={
              callStatus === CallStatus.ACTIVE ? handleDisconnect : handleCall
            }
          >
            {callStatus === CallStatus.ACTIVE
              ? "End Session"
              : callStatus === CallStatus.CONNECTING
              ? isReconnecting
                ? "Reconnecting..."
                : "Connecting"
              : "Start Session"}
          </button>
          {callStatus !== CallStatus.ACTIVE && lastError && (
            <div className="mt-2 text-xs text-red-600">
              {lastError}
              {retryCount < 3 && (
                <button
                  className="ml-2 underline text-primary"
                  onClick={() => void attemptReconnect()}
                >
                  Try reconnect
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="transcript">
        <div className="transcript-message no-scrollbar">
          {messages.map((message, index) => {
            const messageKey = `${
              message.role
            }-${index}-${message.content.slice(0, 10)}`;
            if (message.role === "assistant") {
              return (
                <p key={messageKey} className="max-sm:text-sm">
                  {name.split(" ")[0].replace("/[.,]/g, ", "")}:{" "}
                  {message.content}
                </p>
              );
            } else {
              return (
                <p key={messageKey} className="text-primary max-sm:text-sm">
                  {userName}: {message.content}
                </p>
              );
            }
          })}
        </div>

        <div className="transcript-fade" />
      </section>
    </section>
  );
};

export default CompanionComponent;
