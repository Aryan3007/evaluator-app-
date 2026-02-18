declare module '@react-native-clipboard/clipboard' {
    interface Clipboard {
        getString(): Promise<string>;
        setString(content: string): void;
        hasString(): Promise<boolean>;
    }
    const Clipboard: Clipboard;
    export default Clipboard;
}
