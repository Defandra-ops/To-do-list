import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LocalizedText as Text } from '@/components/LocalizedText';
import { theme } from '@/constants/Colors';

type ScanPage = {
  id: string;
  uri: string;
  width: number;
  height: number;
};

type ImageFormat = 'pdf' | 'png' | 'jpg';

const imageFormats: ImageFormat[] = ['pdf', 'png', 'jpg'];

const createFilename = (extension: string) =>
  `todo-document-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${extension}`;

async function saveToDocuments(uri: string, extension: string) {
  if (!FileSystem.documentDirectory) {
    throw new Error('App storage is unavailable for saving the document.');
  }
  const destination = `${FileSystem.documentDirectory}${createFilename(extension)}`;
  await FileSystem.copyAsync({ from: uri, to: destination });
  return destination;
}

async function shareFile(uri: string) {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing files is not available on this device.');
  }
  await Sharing.shareAsync(uri);
}

async function createPdf(pages: ScanPage[]) {
  if (pages.length === 0) {
    throw new Error('Add at least one page before creating a PDF.');
  }

  const pageImages = await Promise.all(
    pages.map(async (page) => {
      const maxDimension = 1800;
      const resize = Math.max(page.width, page.height) > maxDimension
        ? [{
            resize: page.width >= page.height
              ? { width: maxDimension }
              : { height: maxDimension },
          }]
        : [];
      const result = await ImageManipulator.manipulateAsync(page.uri, resize, {
        base64: true,
        compress: 0.82,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      if (!result.base64) {
        throw new Error('Could not prepare an image for the PDF.');
      }
      return `<section class="page"><img src="data:image/jpeg;base64,${result.base64}" /></section>`;
    })
  );

  const html = `<!doctype html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          @page { size: A4 portrait; margin: 0; }
          html, body { margin: 0; padding: 0; }
          .page {
            width: 595px;
            height: 842px;
            display: flex;
            align-items: center;
            justify-content: center;
            page-break-after: always;
            break-after: page;
          }
          .page:last-child { page-break-after: auto; break-after: auto; }
          img { width: 100%; height: 100%; object-fit: contain; }
        </style>
      </head>
      <body>${pageImages.join('')}</body>
    </html>`;
  const result = await Print.printToFileAsync({
    html,
    width: 595,
    height: 842,
    margins: { top: 0, right: 0, bottom: 0, left: 0 },
  });
  return saveToDocuments(result.uri, 'pdf');
}

export default function DocumentsScreen() {
  const [scanPages, setScanPages] = useState<ScanPage[]>([]);
  const [scanFormat, setScanFormat] = useState<ImageFormat>('pdf');
  const [scanExportFiles, setScanExportFiles] = useState<Array<{ uri: string; page: number }>>([]);
  const [selectedImage, setSelectedImage] = useState<ScanPage | null>(null);
  const [imageFormat, setImageFormat] = useState<ImageFormat>('pdf');
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const runAction = async (action: () => Promise<void>, errorLabel: string) => {
    setIsBusy(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      await action();
    } catch (error) {
      console.error(errorLabel, error);
      setErrorMessage(error instanceof Error ? error.message : errorLabel);
    } finally {
      setIsBusy(false);
    }
  };

  const capturePage = async () => {
    if (Platform.OS !== 'android') {
      setErrorMessage('Document scanning is available in the Android app.');
      return;
    }

    await runAction(async () => {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Camera permission is needed to scan a document.');
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.9,
      });
      const page = result.assets?.[0];
      if (result.canceled || !page) return;
      setScanPages((current) => [
        ...current,
        { id: `${Date.now()}-${current.length}`, uri: page.uri, width: page.width, height: page.height },
      ]);
      setScanExportFiles([]);
    }, 'Could not capture a document page.');
  };

  const pickImage = async () => {
    await runAction(async () => {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });
      const asset = result.assets?.[0];
      if (result.canceled || !asset) return;
      setSelectedImage({
        id: `${Date.now()}`,
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
      });
    }, 'Could not select an image.');
  };

  const exportScan = async () => {
    await runAction(async () => {
      if (scanFormat === 'pdf') {
        const pdfUri = await createPdf(scanPages);
        await shareFile(pdfUri);
        setSuccessMessage('PDF is ready to share.');
        return;
      }

      const format = scanFormat === 'png'
        ? ImageManipulator.SaveFormat.PNG
        : ImageManipulator.SaveFormat.JPEG;
      const files = await Promise.all(
        scanPages.map(async (page, index) => {
          const result = await ImageManipulator.manipulateAsync(page.uri, [], {
            compress: 1,
            format,
          });
          return {
            uri: await saveToDocuments(result.uri, scanFormat),
            page: index + 1,
          };
        })
      );
      setScanExportFiles(files);
      setSuccessMessage('Scanned images are ready to share.');
    }, 'Could not export the scanned pages.');
  };

  const convertImage = async () => {
    if (!selectedImage) {
      setErrorMessage('Choose an image to convert first.');
      return;
    }
    await runAction(async () => {
      if (imageFormat === 'pdf') {
        const pdfUri = await createPdf([selectedImage]);
        await shareFile(pdfUri);
      } else {
        const format = imageFormat === 'png'
          ? ImageManipulator.SaveFormat.PNG
          : ImageManipulator.SaveFormat.JPEG;
        const result = await ImageManipulator.manipulateAsync(selectedImage.uri, [], {
          compress: 1,
          format,
        });
        const imageUri = await saveToDocuments(result.uri, imageFormat);
        await shareFile(imageUri);
      }
      setSuccessMessage('Converted file is ready to share.');
    }, 'Could not convert the selected image.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heading}>
          <Text style={styles.title}>Document tools</Text>
          <Text style={styles.subtitle}>Scan paper documents and convert image files on this device.</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeading}>
            <View style={styles.iconBox}>
              <Ionicons name="scan-outline" size={21} color={theme.colors.buttonDark} />
            </View>
            <View style={styles.cardHeadingCopy}>
              <Text style={styles.cardTitle}>Scan to PDF</Text>
              <Text style={styles.cardDescription}>Take photos of one or more pages and combine them into a PDF.</Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={isBusy}
            style={[styles.secondaryButton, isBusy && styles.disabled]}
            onPress={() => void capturePage()}>
            <Ionicons name="camera-outline" size={18} color={theme.colors.buttonDark} />
            <Text style={styles.secondaryButtonText}>Scan page</Text>
          </Pressable>
          {scanPages.length > 0 ? (
            <>
              <Text style={styles.selectionLabel}>{scanPages.length} page{scanPages.length === 1 ? '' : 's'} scanned</Text>
              <View style={styles.thumbnailRow}>
                {scanPages.map((page, index) => (
                  <View key={page.id} style={styles.thumbnailWrap}>
                    <Image source={{ uri: page.uri }} style={styles.thumbnail} />
                    <Text style={styles.pageNumber}>{index + 1}</Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove page ${index + 1}`}
                      style={styles.removePage}
                      disabled={isBusy}
                      onPress={() => {
                        setScanPages((current) => current.filter((item) => item.id !== page.id));
                        setScanExportFiles([]);
                      }}>
                      <Ionicons name="close" size={14} color="#FFFFFF" />
                    </Pressable>
                  </View>
                ))}
              </View>
              <Text style={styles.selectionLabel}>Scan output format</Text>
              <View style={styles.formatRow}>
                {imageFormats.map((format) => (
                  <Pressable
                    key={format}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: scanFormat === format }}
                    style={[styles.formatOption, scanFormat === format && styles.formatOptionSelected]}
                    onPress={() => {
                      setScanFormat(format);
                      setScanExportFiles([]);
                    }}>
                    <Text style={[styles.formatText, scanFormat === format && styles.formatTextSelected]}>
                      {format.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Pressable
                accessibilityRole="button"
                disabled={isBusy}
                style={[styles.primaryButton, isBusy && styles.disabled]}
                onPress={() => void exportScan()}>
                <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Export scanned pages</Text>
              </Pressable>
              {scanExportFiles.map(({ uri, page }) => (
                <Pressable
                  key={uri}
                  accessibilityRole="button"
                  disabled={isBusy}
                  style={[styles.secondaryButton, isBusy && styles.disabled]}
                  onPress={() => void runAction(
                    () => shareFile(uri),
                    'Could not share the scanned image.'
                  )}>
                  <Ionicons name="share-outline" size={17} color={theme.colors.buttonDark} />
                  <Text style={styles.secondaryButtonText}>Share page {page}</Text>
                </Pressable>
              ))}
            </>
          ) : null}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeading}>
            <View style={[styles.iconBox, styles.convertIcon]}>
              <Ionicons name="image-outline" size={21} color={theme.colors.buttonDark} />
            </View>
            <View style={styles.cardHeadingCopy}>
              <Text style={styles.cardTitle}>Convert an image</Text>
              <Text style={styles.cardDescription}>Choose a picture and export it as PDF, PNG, or JPG.</Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={isBusy}
            style={[styles.secondaryButton, isBusy && styles.disabled]}
            onPress={() => void pickImage()}>
            <Ionicons name="images-outline" size={18} color={theme.colors.buttonDark} />
            <Text style={styles.secondaryButtonText}>{selectedImage ? 'Choose another image' : 'Choose image'}</Text>
          </Pressable>
          {selectedImage ? (
            <>
              <Image source={{ uri: selectedImage.uri }} style={styles.preview} resizeMode="contain" />
              <Text style={styles.selectionLabel}>Output format</Text>
              <View style={styles.formatRow}>
                {imageFormats.map((format) => (
                  <Pressable
                    key={format}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: imageFormat === format }}
                    style={[styles.formatOption, imageFormat === format && styles.formatOptionSelected]}
                    onPress={() => setImageFormat(format)}>
                    <Text style={[styles.formatText, imageFormat === format && styles.formatTextSelected]}>
                      {format.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Pressable
                accessibilityRole="button"
                disabled={isBusy}
                style={[styles.primaryButton, isBusy && styles.disabled]}
                onPress={() => void convertImage()}>
                <Ionicons name="swap-horizontal-outline" size={18} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Convert and share</Text>
              </Pressable>
            </>
          ) : null}
        </View>

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        {successMessage ? <Text style={styles.success}>{successMessage}</Text> : null}
        <Text style={styles.note}>Files are created locally. Use the share menu to save them to your device or send them to another app.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 18, gap: 14 },
  heading: { marginBottom: 2 },
  title: { color: theme.colors.textPrimary, fontSize: 25, fontFamily: 'Nunito_800ExtraBold' },
  subtitle: { marginTop: 4, color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18, fontFamily: 'Nunito_500Medium' },
  card: {
    padding: 15,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardBackground,
    gap: 10,
  },
  cardHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardHeadingCopy: { flex: 1 },
  iconBox: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#E8F4F7' },
  convertIcon: { backgroundColor: '#EAF5EF' },
  cardTitle: { color: theme.colors.textPrimary, fontSize: 15, fontFamily: 'Nunito_800ExtraBold' },
  cardDescription: { marginTop: 2, color: theme.colors.textSecondary, fontSize: 11, lineHeight: 16, fontFamily: 'Nunito_500Medium' },
  secondaryButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    backgroundColor: '#F7FBFC',
  },
  secondaryButtonText: { color: theme.colors.buttonDark, fontSize: 12, fontFamily: 'Nunito_800ExtraBold' },
  primaryButton: {
    minHeight: 43,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 13,
    backgroundColor: theme.colors.buttonDark,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 12, fontFamily: 'Nunito_800ExtraBold' },
  disabled: { opacity: 0.55 },
  selectionLabel: { color: theme.colors.textSecondary, fontSize: 11, fontFamily: 'Nunito_700Bold' },
  thumbnailRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumbnailWrap: { position: 'relative' },
  thumbnail: { width: 66, height: 76, borderRadius: 8, backgroundColor: '#EEF2F4' },
  pageNumber: {
    position: 'absolute',
    left: 4,
    bottom: 4,
    minWidth: 19,
    paddingHorizontal: 4,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 8,
  },
  removePage: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: theme.colors.accent,
  },
  preview: { width: '100%', height: 190, borderRadius: 10, backgroundColor: '#F3F6F7' },
  formatRow: { flexDirection: 'row', gap: 8 },
  formatOption: {
    minWidth: 64,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 18,
    backgroundColor: '#F7FBFC',
  },
  formatOptionSelected: { borderColor: theme.colors.primary, backgroundColor: '#E8F4F7' },
  formatText: { color: theme.colors.textSecondary, fontSize: 11, fontFamily: 'Nunito_700Bold' },
  formatTextSelected: { color: theme.colors.buttonDark },
  error: { color: theme.colors.accent, fontSize: 12, fontFamily: 'Nunito_700Bold' },
  success: { color: theme.colors.success, fontSize: 12, fontFamily: 'Nunito_700Bold' },
  note: { color: theme.colors.textMuted, fontSize: 11, lineHeight: 16, fontFamily: 'Nunito_500Medium' },
});
