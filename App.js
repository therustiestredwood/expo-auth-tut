import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View, Image, Platform, Button } from "react-native";
import * as Google from "expo-auth-session/providers/google";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as AuthSession from "expo-auth-session";

const ANDROID_CLIENT_ID =
  "492747431877-gjbhr6on1beghkpqrrvrlmihmi3a1fcb.apps.googleusercontent.com";
const IOS_CLIENT_ID =
  "492747431877-khnippq79h5ghdhmvlcn7kc5ears6uq7.apps.googleusercontent.com";
const EXPO_CLIENT_ID =
  "492747431877-pf7flu855lkn4hleblpq29q0q0smqk8u.apps.googleusercontent.com";

export default function App() {
  // AsyncStorage.clear();
  const [userInfo, setUserInfo] = useState();
  const [auth, setAuth] = useState();
  const [requireRefresh, setRequireRefresh] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: ANDROID_CLIENT_ID,
    iosClientId: IOS_CLIENT_ID,
    expoClientId: EXPO_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === "success") {
      setAuth(response.authentication);

      const persistAuth = async () => {
        await AsyncStorage.setItem(
          "auth",
          JSON.stringify(response.authentication)
        );
      };
      persistAuth();
    }
  }, [response]);

  useEffect(() => {
    const getPersistedAuth = async () => {
      const jsonValue = await AsyncStorage.getItem("auth");
      if (jsonValue != null) {
        const authFromJson = JSON.parse(jsonValue);

        setAuth(authFromJson);
        setRequireRefresh(
          !AuthSession.TokenResponse.isTokenFresh({
            expiresIn: authFromJson.expiresIn,
            issuedAt: authFromJson.issuedAt,
          })
        );
      }
    };
    getPersistedAuth();
  }, []);

  const getUserData = async () => {
    let userInfoResponse = await fetch(
      "https://www.googleapis.com/userinfo/v2/me",
      {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      }
    );

    userInfoResponse.json().then((data) => {
      setUserInfo(data);
    });
  };

  const showUserData = () => {
    if (userInfo) {
      return (
        <View style={styles.userInfo}>
          <Image source={{ uri: userInfo.picture }} style={styles.userPic} />
          <Text>Welcome {userInfo.name}</Text>
          <Text>{userInfo.email}</Text>
        </View>
      );
    }
  };

  const getClientId = () => {
    if (Platform.OS === "ios") {
      return IOS_CLIENT_ID;
    } else if (Platform.OS === "android") {
      return ANDROID_CLIENT_ID;
    } else {
      console.log("Invalid Platform - not handled");
    }
  };

  const refreshToken = async () => {
    const clientID = getClientId();

    const tokenResult = await AuthSession.refreshAsync(
      {
        clientId: clientID,
        refreshToken: auth.refreshToken,
      },
      {
        tokenEndpoint: "https://www.googleapis.com/oauth2/v4/token",
      }
    );

    tokenResult.refreshToken = auth.refreshToken;

    setAuth(tokenResult);
    await AsyncStorage.setItem("auth", JSON.stringify(tokenResult));
    setRequireRefresh(false);
  };

  if (requireRefresh) {
    return (
      <View style={styles.container}>
        <Text>Token requires refresh...</Text>
        <Button title="Refresh Token" onPress={refreshToken} />
      </View>
    );
  }

  const logout = async () => {
    await AuthSession.revokeAsync(
      {
        token: auth.accessToken,
      },
      {
        revocationEndpoint: "https://oauth2.googleapis.com/revoke",
      }
    );

    setAuth(undefined);
    setUserInfo(undefined);
    await AsyncStorage.removeItem("auth");
  };

  return (
    <View style={styles.container}>
      {showUserData()}
      <Text>Helllo</Text>
      <Button
        title={auth ? "Get User Data" : "Login"}
        onPress={
          auth
            ? getUserData
            : () => promptAsync({ useProxy: false, showInRecents: true })
        }
      />
      {auth ? <Button title='logout' onPress={logout}/> : undefined}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  userPic: {
    width: 50,
    height: 50,
    backgroundColor: "black",
  },
  userInfo: {
    alignItems: "center",
    justifyContent: "center",
  },
});
