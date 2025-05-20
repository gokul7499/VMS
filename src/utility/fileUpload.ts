import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { Readable } from 'stream';
import WordExtractor from 'word-extractor';

interface UploadedFile {
    mimetype: string;
    originalname: string;
    file: Readable;
}

const textToHtmlParagraphs = (text: string): string => {
    return text
        .split('\n')
        .map((line: string) => `<p>${line}</p>`)
        .join('');
};

export const streamToBuffer = async (stream: Readable): Promise<Buffer> => {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
};

export const extractFileContent = async (file: UploadedFile): Promise<string> => {
    const { mimetype, originalname, file: fileStream } = file;
    const fileBuffer = await streamToBuffer(fileStream);

    if (!fileBuffer.length) {
        throw new Error('Empty file! Please upload a valid file.');
    }

    let htmlContent = '';

    try {
        const isPdf = mimetype === 'application/pdf' || originalname.toLowerCase().endsWith('.pdf');
        const isDocx = mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            originalname.toLowerCase().endsWith('.docx');
        const isDoc = mimetype === 'application/msword' ||
            originalname.toLowerCase().endsWith('.doc');
        const isTxt = mimetype === 'text/plain' ||
            originalname.toLowerCase().endsWith('.txt');

        if (isPdf) {
            const pdfData = await pdfParse(fileBuffer);
            htmlContent = textToHtmlParagraphs(pdfData.text);
        } else if (isDocx) {
            const { value: text } = await mammoth.extractRawText({ buffer: fileBuffer });
            htmlContent = textToHtmlParagraphs(text);
        } else if (isDoc) {
            const extractor = new WordExtractor();
            const doc = await extractor.extract(fileBuffer);
            const text = doc.getBody();
            htmlContent = textToHtmlParagraphs(text);
        } else if (isTxt) {
            const text = fileBuffer.toString('utf-8');
            htmlContent = textToHtmlParagraphs(text);
        } else {
            throw new Error('Unsupported file type! Please upload a PDF, DOCX, DOC, or TXT file.');
        }
    } catch (error) {
        console.error('File processing error:', error);
        throw new Error(`Error processing file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return htmlContent;
};
