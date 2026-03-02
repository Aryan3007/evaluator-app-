declare module 'react-native-html-to-pdf' {
    export interface Options {
        html: string;
        fileName?: string;
        base64?: boolean;
        directory?: string;
        fonts?: string[];
        padding?: number;
        bgColor?: string;
    }

    export interface Pdf {
        filePath: string | undefined;
        base64?: string;
    }

    const RNHTMLtoPDF: {
        convert(options: Options): Promise<Pdf>;
    };

    export default RNHTMLtoPDF;
}
