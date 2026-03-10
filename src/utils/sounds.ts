import Sound from 'react-native-sound';

// Enable playback in silence mode
Sound.setCategory('Playback');

const audioCache: Record<string, Sound> = {};

// String filenames matching files in android/app/src/main/res/raw/ (Android)
// and the Xcode bundle (iOS). react-native-sound needs string names, NOT require().
const AUDIO_MAP: Record<string, string> = {
    shutter: 'shutter.mp3',
    popup: 'pop_upp.mp3',
    confirm: 'yes.mp3',
    success: 'success.mp3',
    error: 'error.mp3',
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
    const sound = audioCache[type];
    if (sound) {
        // Reset position and play immediately — avoids async stop() callback delay
        sound.stop();
        sound.setCurrentTime(0);
        sound.play((success) => {
            if (!success) {
                console.warn(`[sounds.ts] Failed to play sound ${type}`);
            }
        });
    } else {
        // If not preloaded, dynamically load and play
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
