import Sound from 'react-native-sound';

// Enable playback in silence mode
Sound.setCategory('Playback');

const audioCache: Record<string, Sound> = {};

// String filenames matching files in android/app/src/main/res/raw/ (Android)
// and the Xcode bundle (iOS). react-native-sound needs string names, NOT require().
const AUDIO_MAP: Record<string, string> = {
    shutter: 'shutter',
    popup: 'pop_upp',
    confirm: 'yes',
    success: 'success',
    error: 'error',
};

export type AudioType = keyof typeof AUDIO_MAP;

// Preload the sounds
export const preloadSounds = () => {
    Object.keys(AUDIO_MAP).forEach((key) => {
        const audioKey = key as AudioType;
        if (!audioCache[audioKey]) {
            audioCache[audioKey] = new Sound(AUDIO_MAP[audioKey], Sound.MAIN_BUNDLE, (error) => {
                if (error) {
                    console.warn(`[sounds.ts] Failed to load sound ${audioKey}`, error);
                }
            });
        }
    });
};

export const playAudio = (type: AudioType) => {
    const cached = audioCache[type];
    if (cached) {
        // For short clips, stop()+play() races on the native bridge in release builds.
        // Create a fresh instance each time so MediaPlayer state is always clean.
        const fresh = new Sound(AUDIO_MAP[type], Sound.MAIN_BUNDLE, (error) => {
            if (error) {
                console.warn(`[sounds.ts] Failed to load sound ${type}`, error);
                return;
            }
            fresh.play((success) => {
                if (!success) {
                    console.warn(`[sounds.ts] Failed to play sound ${type}`);
                }
                fresh.release();
            });
        });
    } else {
        // First-time load (preload missed or not called yet)
        const newSound = new Sound(AUDIO_MAP[type], Sound.MAIN_BUNDLE, (error) => {
            if (error) {
                console.warn(`[sounds.ts] Failed to load sound dynamically ${type}`);
                return;
            }
            audioCache[type] = newSound;
            newSound.play();
        });
    }
};
