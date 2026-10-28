import React from 'react';
import { Platform, TextInput, StyleSheet } from 'react-native';
import { requireNativeViewManager } from 'expo-modules-core';

let NativeRichText = null;
if (Platform.OS === 'android') {
  try {
    NativeRichText = requireNativeViewManager('FloatingDotOverlay', 'DotyRichTextView');
  } catch (e) {
    console.warn('Native DotyRichTextView not available:', e);
  }
}

/**
 * DotyRichTextEditor
 * 
 * Reusable inline Rich-Text Editor for DotyNotes.
 * On Android native builds, renders real native Android Spannable spans (bold, italic, underline,
 * checklist, bullet) without inserting raw asterisks or HTML markers into the text.
 * Dispatches canonical HTML on content change and notifies active styles at cursor position.
 */
export default function DotyRichTextEditor({
  html = '',
  placeholder = 'Write your thoughts here...',
  textColor = '#1C1917',
  fontSize = 15,
  action = null,
  onContentChange,
  onActiveStylesChange,
  style,
  ...rest
}) {
  const isNative = Platform.OS === 'android' && Boolean(NativeRichText);

  if (isNative) {
    return (
      <NativeRichText
        style={[styles.nativeEditor, style]}
        html={html || ''}
        placeholder={placeholder}
        textColor={textColor}
        fontSize={fontSize}
        action={action}
        onContentChange={(e) => {
          if (onContentChange && e?.nativeEvent) {
            onContentChange(e.nativeEvent);
          }
        }}
        onActiveStylesChange={(e) => {
          if (onActiveStylesChange && e?.nativeEvent) {
            onActiveStylesChange(e.nativeEvent);
          }
        }}
        {...rest}
      />
    );
  }

  // Graceful fallback for web, tests, and Expo Go
  return (
    <TextInput
      style={[
        styles.fallbackEditor,
        { color: textColor, fontSize },
        style,
      ]}
      placeholder={placeholder}
      placeholderTextColor="rgba(0, 0, 0, 0.35)"
      value={html ? html.replace(/<[^>]+>/g, '') : ''}
      onChangeText={(text) => {
        if (onContentChange) {
          onContentChange({ html: text, plainText: text });
        }
      }}
      multiline
      scrollEnabled={true}
      textAlignVertical="top"
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  nativeEditor: {
    flex: 1,
    width: '100%',
  },
  fallbackEditor: {
    flex: 1,
    width: '100%',
    textAlignVertical: 'top',
    padding: 0,
    lineHeight: 22,
  },
});
