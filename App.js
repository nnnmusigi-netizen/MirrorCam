import React, { useState, useRef, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';

export default function App() {
  const [facing, setFacing] = useState('front');
  const [zoom, setZoom] = useState(0);
  const [mirrorMode, setMirrorMode] = useState(true);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mediaPermission, setMediaPermission] = useState(null);
  const [flashMessage, setFlashMessage] = useState('');
  const cameraRef = useRef(null);
  const lastDistance = useRef(0);
  const currentZoom = useRef(0);

  const ensureMediaPermission = async () => {
    if (!mediaPermission) {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      setMediaPermission(status === 'granted');
      return status === 'granted';
    }
    return mediaPermission;
  };

  const showFlash = (msg) => {
    setFlashMessage(msg);
    setTimeout(() => setFlashMessage(''), 2000);
  };

  const getDistance = (touches) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].pageX - touches[1].pageX;
    const dy = touches[0].pageY - touches[1].pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchMove = useCallback((event) => {
    const { touches } = event.nativeEvent;
    if (touches.length === 2) {
      const distance = getDistance(touches);
      if (lastDistance.current > 0) {
        const delta = (distance - lastDistance.current) / 500;
        let newZoom = currentZoom.current + delta;
        newZoom = Math.max(0, Math.min(1, newZoom));
        currentZoom.current = newZoom;
        setZoom(newZoom);
      }
      lastDistance.current = distance;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    lastDistance.current = 0;
  }, []);

  const toggleCamera = () => {
    setFacing((prev) => (prev === 'front' ? 'back' : 'front'));
    setZoom(0);
    currentZoom.current = 0;
  };

  const toggleMirror = () => {
    setMirrorMode((prev) => !prev);
    showFlash(!mirrorMode ? '거울 모드 ON' : '거울 모드 OFF');
  };

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        mirror: facing === 'front' && mirrorMode,
      });
      const hasPermission = await ensureMediaPermission();
      if (hasPermission) {
        await MediaLibrary.saveToLibraryAsync(photo.uri);
        showFlash('📸 사진 저장 완료!');
      } else {
        showFlash('갤러리 권한이 필요합니다');
      }
    } catch (error) {
      showFlash('사진 촬영 실패');
    }
  };

  const zoomIn = () => {
    const n = Math.min(1, zoom + 0.05);
    setZoom(n);
    currentZoom.current = n;
  };

  const zoomOut = () => {
    const n = Math.max(0, zoom - 0.05);
    setZoom(n);
    currentZoom.current = n;
  };

  if (!cameraPermission) return <View style={styles.container} />;

  if (!cameraPermission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>카메라 권한 필요</Text>
        <Text style={styles.permissionText}>사진을 찍으려면 카메라 접근 권한이 필요합니다</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestCameraPermission}>
          <Text style={styles.permissionButtonText}>권한 허용하기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const zoomPct = Math.round(zoom * 100);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.cameraContainer} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        <CameraView
          ref={cameraRef}
          style={[styles.camera, facing === 'front' && mirrorMode && styles.mirrored]}
          facing={facing}
          zoom={zoom}
        />
        {flashMessage !== '' && (
          <View style={styles.flashContainer}>
            <Text style={styles.flashText}>{flashMessage}</Text>
          </View>
        )}
        <View style={styles.topBar}>
          <View style={styles.infoChip}>
            <Text style={styles.infoText}>{facing === 'front' ? '전면' : '후면'}</Text>
          </View>
          {mirrorMode && facing === 'front' && (
            <View style={[styles.infoChip, styles.mirrorChip]}>
              <Text style={styles.infoText}>거울</Text>
            </View>
          )}
          <View style={styles.infoChip}>
            <Text style={styles.infoText}>{zoomPct > 0 ? zoomPct + '%' : '1x'}</Text>
          </View>
        </View>
      </View>
      <View style={styles.controlsContainer}>
        <View style={styles.zoomRow}>
          <TouchableOpacity style={styles.zoomButton} onPress={zoomOut}>
            <Text style={styles.zoomButtonText}>-</Text>
          </TouchableOpacity>
          <View style={styles.zoomBarContainer}>
            <View style={[styles.zoomBarFill, { width: zoomPct + '%' }]} />
          </View>
          <TouchableOpacity style={styles.zoomButton} onPress={zoomIn}>
            <Text style={styles.zoomButtonText}>+</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.sideButton, mirrorMode && styles.sideButtonActive]} onPress={toggleMirror}>
            <Text style={styles.sideButtonIcon}>🪞</Text>
            <Text style={styles.sideButtonLabel}>거울</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shutterButton} onPress={takePhoto}>
            <View style={styles.shutterInner} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.sideButton} onPress={toggleCamera}>
            <Text style={styles.sideButtonIcon}>🔄</Text>
            <Text style={styles.sideButtonLabel}>전환</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  permissionContainer: { flex: 1, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center', padding: 30 },
  permissionTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 15 },
  permissionText: { fontSize: 16, color: '#aaa', textAlign: 'center', marginBottom: 30 },
  permissionButton: { backgroundColor: '#4a6cf7', paddingHorizontal: 40, paddingVertical: 15, borderRadius: 30 },
  permissionButtonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  cameraContainer: { flex: 1, position: 'relative' },
  camera: { flex: 1 },
  mirrored: { transform: [{ scaleX: -1 }] },
  topBar: { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 10 },
  infoChip: { backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  mirrorChip: { backgroundColor: 'rgba(74,108,247,0.7)' },
  infoText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  flashContainer: { position: 'absolute', top: '45%', alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 25 },
  flashText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  controlsContainer: { backgroundColor: '#1a1a2e', paddingTop: 15, paddingBottom: Platform.OS === 'ios' ? 40 : 25, paddingHorizontal: 20 },
  zoomRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 12 },
  zoomButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  zoomButtonText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  zoomBarContainer: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, overflow: 'hidden' },
  zoomBarFill: { height: '100%', backgroundColor: '#4a6cf7', borderRadius: 3 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  sideButton: { alignItems: 'center', padding: 12, borderRadius: 15, minWidth: 70 },
  sideButtonActive: { backgroundColor: 'rgba(74,108,247,0.3)' },
  sideButtonIcon: { fontSize: 28, marginBottom: 4 },
  sideButtonLabel: { color: '#fff', fontSize: 12, fontWeight: '500' },
  shutterButton: { width: 75, height: 75, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff' },
  shutterInner: { width: 60, height: 60, borderRadius: 32, backgroundColor: '#fff' },
});
