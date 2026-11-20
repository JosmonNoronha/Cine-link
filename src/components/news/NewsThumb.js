import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

/** Thumbnail with a neutral placeholder when there is no image or it fails to load. */
const NewsThumb = ({ uri, style, iconSize = 28 }) => {
  const [failed, setFailed] = useState(false);
  if (!uri || failed) {
    return (
      <View style={[styles.ph, style]}>
        <Ionicons name="newspaper-outline" size={iconSize} color="rgba(255,255,255,0.45)" />
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={style}
      contentFit="cover"
      transition={150}
      cachePolicy="memory-disk"
      recyclingKey={uri}
      onError={() => setFailed(true)}
    />
  );
};
export default React.memo(NewsThumb);

const styles = StyleSheet.create({
  ph: { backgroundColor: "#1c1f26", alignItems: "center", justifyContent: "center" },
});
