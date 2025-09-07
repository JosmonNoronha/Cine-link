// components/CreateWatchlistModal.js
import React from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  Dimensions,
  StyleSheet,
} from "react-native";
import { useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import LoadingButton from "./LoadingButton";

const { width } = Dimensions.get("window");

const CreateWatchlistModal = ({
  visible,
  onClose,
  newName,
  setNewName,
  onSubmit,
  isLoading,
}) => {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => !isLoading && onClose()}
    >
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={() => !isLoading && onClose()}
        />
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={["#667eea", "#764ba2"]}
                style={styles.iconGradient}
              >
                <Ionicons name="add-circle-outline" size={24} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              Create New Watchlist
            </Text>
          </View>

          <TextInput
            placeholder="Enter watchlist name"
            placeholderTextColor={colors.text + "66"}
            value={newName}
            onChangeText={setNewName}
            style={[
              styles.input,
              {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
            autoFocus
            editable={!isLoading}
          />

          <View style={styles.buttons}>
            <Pressable
              style={[styles.button, styles.cancelButton]}
              onPress={() => {
                if (!isLoading) {
                  onClose();
                  setNewName("");
                }
              }}
              disabled={isLoading}
            >
              <Text
                style={[
                  styles.cancelButtonText,
                  { opacity: isLoading ? 0.5 : 1 },
                ]}
              >
                Cancel
              </Text>
            </Pressable>

            <LoadingButton
              loading={isLoading}
              onPress={onSubmit}
              style={[styles.button, styles.createButton]}
              disabled={!newName.trim() || isLoading}
              loadingText="Creating..."
            >
              <Text style={styles.createButtonText}>Create</Text>
            </LoadingButton>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#00000099",
  },
  container: {
    borderRadius: 20,
    padding: 24,
    width: width - 40,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  iconContainer: {
    marginBottom: 16,
  },
  iconGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
  },
  input: {
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 16,
    textAlign: "center",
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  cancelButton: {
    backgroundColor: "#f5f5f5",
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#666",
    fontWeight: "600",
    fontSize: 16,
  },
  createButton: {
    overflow: "hidden",
  },
  createButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default CreateWatchlistModal;
