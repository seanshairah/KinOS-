import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useSession } from "@/lib/session";
import { T } from "@/lib/theme";

export default function Gate() {
  const { token, ready } = useSession();
  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: T.paper }}>
        <ActivityIndicator color={T.dusk2} />
      </View>
    );
  }
  return <Redirect href={token ? "/(tabs)/orbit" : "/sign-in"} />;
}
