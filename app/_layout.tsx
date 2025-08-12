import { useConnectionState, useRoomContext } from "@livekit/components-react";
import {
  AudioSession,
  LiveKitRoom,
  registerGlobals,
  setLogLevel,
  useIOSAudioManagement,
  useVoiceAssistant,
} from "@livekit/react-native";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import { LogLevel } from "livekit-client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

registerGlobals();

const enableRinging = true;

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

  const fetchCredentials = useCallback(async () => {
    setLoading(true);
    const res = await fetch(
      `https://bigfoot.giant.org/api/app/get-testing-token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }
    );
    const data = await res.json();
    setCredentials(data);
    setLoading(false);
  }, []);

  const onEndPress = () => {
    setCredentials(undefined);
  };

  return (
    <SafeAreaView>
      {enableRinging && loading && <RingingPlayer />}
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

const RingingPlayer = () => {
  const ringingPlayer = useAudioPlayer(audioSource);
  useEffect(() => {
    ringingPlayer.loop = true;
    ringingPlayer.play();
    setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: "mixWithOthers",
    });
  }, [ringingPlayer]);

  return null;
};
