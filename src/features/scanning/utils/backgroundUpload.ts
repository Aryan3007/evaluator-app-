import RNImageToPdf from 'react-native-image-to-pdf';
import ReactNativeBlobUtil from 'react-native-blob-util';
import axios from '../../../core/api/axios';

interface BackgroundUploadParams {
    images: string[];
    subjectName: string;
    subjectCode: string;
    pdfName: string;
    onSuccess: (pdfName: string) => void;
    onError: (error: string, pdfName: string) => void;
}

export async function backgroundUpload(params: BackgroundUploadParams): Promise<void> {
    const { images, subjectName, subjectCode, pdfName, onSuccess, onError } = params;

    try {
        // ── Step 1: Generate PDF + get presigned URL in PARALLEL ──
        console.log(`📄 [Upload] Creating PDF "${pdfName}" from ${images.length} images...`);

        const [pdf, presignedResponse] = await Promise.all([
            RNImageToPdf.createPDFbyImages({
                imagePaths: images.map((img: string) => img.replace('file://', '')),
                name: pdfName,
                quality: 0.8,
            }),
            axios.post('/api/files/presigned-upload', {
                subject_name: subjectName,
                paper_code: subjectCode,
                files: [{ file_name: pdfName, file_type: 'application/pdf' }],
            }),
        ]);

        console.log(`✅ [Upload] PDF created at: ${pdf.filePath}`);

        if (!presignedResponse.data.success || !presignedResponse.data.uploads) {
            throw new Error('Failed to get presigned URLs');
        }

        const presignedData = presignedResponse.data.uploads[0];
        const s3Url = presignedData.url;
        console.log(`✅ [Upload] Presigned URL received — s3_url: ${s3Url}`);

        // ── Step 2: Upload PDF to S3 using ReactNativeBlobUtil (native file streaming) ──
        console.log(`⬆️ [Upload] Uploading PDF to S3...`);

        const pdfPath = pdf.filePath.replace('file://', '');

        // Build multipart data: presigned fields first, file last
        const multipartData: Array<{ name: string; data: string; filename?: string; type?: string }> = [
            ...Object.entries(presignedData.fields).map(([key, value]) => ({
                name: key,
                data: value as string,
            })),
            {
                name: 'file',
                filename: pdfName,
                type: 'application/pdf',
                data: ReactNativeBlobUtil.wrap(pdfPath),
            },
        ];

        const s3Response = await ReactNativeBlobUtil.fetch(
            'POST',
            presignedData.base_url,
            { 'Content-Type': 'multipart/form-data' },
            multipartData,
        );

        if (s3Response.respInfo.status >= 400) {
            console.error(`❌ [Upload] S3 failed (${s3Response.respInfo.status}):`, s3Response.text());
            throw new Error(`S3 upload failed: ${s3Response.respInfo.status}`);
        }

        console.log(`✅ [Upload] S3 upload successful! (${s3Response.respInfo.status})`);

        // ── Step 3: Save file metadata to backend ──
        console.log(`💾 [Upload] Calling file-upload API...`);

        await axios.post('/api/files/file-upload', {
            subject_name: subjectName,
            paper_code: subjectCode,
            files: [
                {
                    file_name: pdfName,
                    s3_url: s3Url,
                    file_size: 0,
                    mime_type: 'application/pdf',
                },
            ],
        });

        console.log(`✅ [Upload] Done: "${pdfName}"`);
        onSuccess(pdfName);
    } catch (error: any) {
        console.error(`❌ [Upload] Failed:`, error?.response?.data || error?.message || error);
        const message =
            error?.response?.data?.message || error?.message || 'Upload failed';
        onError(message, pdfName);
    }
}
