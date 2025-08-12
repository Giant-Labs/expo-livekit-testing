import { useConnectionState, useRoomContext } from "@livekit/components-react";
import {
  AudioSession,
  LiveKitRoom,
  setLogLevel,
  useIOSAudioManagement,
  useVoiceAssistant,
} from "@livekit/react-native";
import { registerGlobals } from "@livekit/react-native-webrtc";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import { LogLevel } from "livekit-client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

registerGlobals();

const audioSource = require("@/assets/audio/ringing.m4a");
setLogLevel(LogLevel.warn);

function LiveKitRoomWrapper({
  serverUrl,
  token,
}: {
  serverUrl: string;
  token: string;
}) {
  useEffect(() => {
    console.log("starting audio session");
    const start = async () => {
      await AudioSession.configureAudio({
        ios: {
          defaultOutput: "speaker",
        },
      });
      await AudioSession.startAudioSession();
    };

    start();

    return () => {
      AudioSession.stopAudioSession();
    };
  }, []);

  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect={true}
      audio={true}
      video={false}
      onError={(error) => {
        console.error("LiveKitRoom error", error);
      }}
      onMediaDeviceFailure={(failure) => {
        console.error("LiveKitRoom media device failure", failure);
      }}
      onEncryptionError={(error) => {
        console.error("LiveKitRoom encryption error", error);
      }}
    >
      <RoomView />
    </LiveKitRoom>
  );
}
export const RoomView = () => {
  const { agentTranscriptions, state } = useVoiceAssistant();

  const room = useRoomContext();
  useIOSAudioManagement(room, true);

  const messages = useMemo(
    () => agentTranscriptions.map((t) => t.text),
    [agentTranscriptions]
  );

  const connectionState = useConnectionState();

  return (
    <View>
      {messages.map((message) => (
        <Text key={message}>{message}</Text>
      ))}
      <Text>State: {state}</Text>
      <Text>Connection State: {connectionState}</Text>
    </View>
  );
};

export default function App() {
  const [credentials, setCredentials] = useState<{
    serverUrl: string;
    token: string;
  }>();

  const [loading, setLoading] = useState(false);

  const ringingPlayer = useAudioPlayer(audioSource);
  useEffect(() => {
    ringingPlayer.loop = true;

    setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: "mixWithOthers",
    });
  }, [ringingPlayer]);

  const fetchCredentials = useCallback(async () => {
    ringingPlayer.play();
    setLoading(true);
    const res = await fetch(`http://localhost:3000/api/app/get-testing-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    setCredentials(data);
    setLoading(false);
    setTimeout(() => {
      ringingPlayer.pause();
    }, 3000);
  }, [ringingPlayer]);

  const onEndPress = () => {
    setCredentials(undefined);
  };

  return (
    <SafeAreaView>
      {loading ? (
        <Text>Getting credentials... (calling)</Text>
      ) : !credentials ? (
        <Text>No credentials</Text>
      ) : (
        <LiveKitRoomWrapper
          serverUrl={credentials?.serverUrl}
          token={credentials?.token}
        />
      )}
      {credentials ? (
        <Button title="End Call" onPress={onEndPress} />
      ) : (
        <Button title="Start Call" onPress={fetchCredentials} />
      )}
    </SafeAreaView>
  );
}
