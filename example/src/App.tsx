import { useState } from 'react';
import {
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  usePermission,
  usePermissions,
  type PermissionName,
} from 'react-native-permission-gate';

type Mode = 'single' | 'multi';

export default function App() {
  const [mode, setMode] = useState<Mode>('single');

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>permission-gate</Text>
        <Text style={styles.subtitle}>headless permission flow</Text>

        <View style={styles.tabs}>
          <Tab
            label="Single"
            active={mode === 'single'}
            onPress={() => setMode('single')}
          />
          <Tab
            label="Media (multi)"
            active={mode === 'multi'}
            onPress={() => setMode('multi')}
          />
        </View>

        {mode === 'single' ? <SinglePanel /> : <MultiPanel />}
      </View>
    </SafeAreaView>
  );
}

/* ----------------------------- Single permission ----------------------------- */

const OPTIONS: PermissionName[] = [
  'camera',
  'microphone',
  'photoLibrary',
  'notifications',
];

function SinglePanel() {
  const [selected, setSelected] = useState<PermissionName>('camera');
  const perm = usePermission(selected, {
    rationale: true,
    onStatusChange: (status) => console.log(`[${selected}] -> ${status}`),
  });

  return (
    <>
      <View style={styles.chips}>
        {OPTIONS.map((name) => (
          <Pressable
            key={name}
            onPress={() => setSelected(name)}
            style={[styles.chip, selected === name && styles.chipActive]}
          >
            <Text
              style={[
                styles.chipText,
                selected === name && styles.chipTextActive,
              ]}
            >
              {name}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.card}>
        <Row label="status" value={perm.status} />
        <Row label="phase" value={perm.phase} />
      </View>

      <Pressable style={styles.button} onPress={() => perm.request()}>
        <Text style={styles.buttonText}>Request "{selected}"</Text>
      </Pressable>

      {perm.isBlocked && (
        <Pressable
          style={[styles.button, styles.secondary]}
          onPress={perm.openSettings}
        >
          <Text style={styles.buttonText}>Blocked → Open Settings</Text>
        </Pressable>
      )}

      <RationaleSheet
        visible={perm.phase === 'rationale'}
        title={`Allow "${selected}"?`}
        body={`This feature needs ${selected} access. You can change it anytime in Settings.`}
        onConfirm={perm.confirmRationale}
        onCancel={perm.cancelRationale}
      />
    </>
  );
}

/* --------------------------- Multiple permissions --------------------------- */

const MEDIA: PermissionName[] = ['camera', 'microphone'];

function MultiPanel() {
  const media = usePermissions(MEDIA, { rationale: true });

  return (
    <>
      <Text style={styles.sectionNote}>
        Camera + microphone, acquired together - one shared rationale, one
        request.
      </Text>

      <View style={styles.card}>
        {MEDIA.map((name) => (
          <Row key={name} label={name} value={media.statuses[name] ?? '-'} />
        ))}
        <Row label="allGranted" value={String(media.allGranted)} />
      </View>

      <Pressable style={styles.button} onPress={() => media.request()}>
        <Text style={styles.buttonText}>Request camera + microphone</Text>
      </Pressable>

      {media.anyBlocked && (
        <Pressable
          style={[styles.button, styles.secondary]}
          onPress={media.openSettings}
        >
          <Text style={styles.buttonText}>Blocked → Open Settings</Text>
        </Pressable>
      )}

      <RationaleSheet
        visible={media.phase === 'rationale'}
        title="Allow camera & microphone?"
        body="Recording video needs both. You can change this anytime in Settings."
        onConfirm={media.confirmRationale}
        onCancel={media.cancelRationale}
      />
    </>
  );
}

/* --------------------------------- Shared UI -------------------------------- */

function Tab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tab, active && styles.tabActive]}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function RationaleSheet({
  visible,
  title,
  body,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  body: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>{title}</Text>
          <Text style={styles.sheetBody}>{body}</Text>
          <View style={styles.sheetRow}>
            <Pressable style={styles.ghost} onPress={onCancel}>
              <Text style={styles.ghostText}>Not now</Text>
            </Pressable>
            <Pressable style={styles.button} onPress={onConfirm}>
              <Text style={styles.buttonText}>Continue</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0b0f17' },
  container: { flex: 1, padding: 24, justifyContent: 'center', gap: 16 },
  title: { color: '#fff', fontSize: 32, fontWeight: '800', letterSpacing: -1 },
  subtitle: { color: '#7c8aa5', fontSize: 15, marginBottom: 8 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#161c28',
    borderWidth: 1,
    borderColor: '#232c3d',
  },
  tabActive: { backgroundColor: '#1e293b', borderColor: '#3b82f6' },
  tabText: { color: '#9fb0cc', fontSize: 14, fontWeight: '700' },
  tabTextActive: { color: '#fff' },
  sectionNote: { color: '#7c8aa5', fontSize: 14, lineHeight: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#161c28',
    borderWidth: 1,
    borderColor: '#232c3d',
  },
  chipActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  chipText: { color: '#9fb0cc', fontSize: 14, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  card: {
    backgroundColor: '#111725',
    borderRadius: 16,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: '#1e2636',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { color: '#7c8aa5', fontSize: 15 },
  rowValue: { color: '#e8eefc', fontSize: 15, fontWeight: '700' },
  button: {
    backgroundColor: '#3b82f6',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
  secondary: { backgroundColor: '#b45309' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  sheet: { backgroundColor: '#131a29', borderRadius: 20, padding: 22, gap: 12 },
  sheetTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  sheetBody: { color: '#9fb0cc', fontSize: 15, lineHeight: 22 },
  sheetRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  ghost: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#1c2536',
  },
  ghostText: { color: '#cdd8ee', fontSize: 16, fontWeight: '700' },
});
