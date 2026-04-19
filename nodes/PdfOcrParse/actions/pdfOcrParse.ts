import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { normalizeUrl, createSingleFileMultipart, parseJsonResponseBody, checkApiResponse } from '../helpers';

/* ================================================================
 *  Field descriptions – PDF OCR
 * ================================================================ */

export const description: INodeProperties[] = [
	// ─── 1. Input ───────────────────────────────────────────────────
	{
		displayName: 'Input Type',
		name: 'ocr_pdf_input_type',
		type: 'options',
		options: [
			{ name: 'URL (Default)', value: 'url', description: 'Provide a publicly accessible PDF URL' },
			{ name: 'Binary File', value: 'file', description: 'Use a PDF file from a previous node\u0027s binary output' },
		],
		default: 'url',
		description: 'How to provide the scanned PDF for OCR',
		displayOptions: { show: { operation: ['pdfOcrParse'] } },
	},
	{
		displayName: 'PDF URL',
		name: 'ocr_pdf_url',
		type: 'string',
		default: 'https://pdfapihub.com/sample-pdfinvoice-with-image.pdf',
		placeholder: 'https://pdfapihub.com/sample.pdf',
		description: 'Public URL of the scanned PDF to extract text from',
		displayOptions: { show: { operation: ['pdfOcrParse'], ocr_pdf_input_type: ['url'] } },
	},
	{
		displayName: 'Binary Property Name',
		name: 'ocr_pdf_binary_property',
		type: 'string',
		default: 'data',
		description: 'Binary property containing the PDF file',
		displayOptions: { show: { operation: ['pdfOcrParse'], ocr_pdf_input_type: ['file'] } },
	},

	// ─── 2. Page Selection ──────────────────────────────────────────
	{
		displayName: 'Pages',
		name: 'ocr_pages',
		type: 'string',
		default: 'all',
		placeholder: '1-3,5',
		description: 'Which pages to OCR. Supports "all", single page ("3"), range ("1-5"), or mixed ("1,3,5-8").',
		displayOptions: { show: { operation: ['pdfOcrParse'] } },
	},

	// ─── 3. Language ────────────────────────────────────────────────
	{
		displayName: 'Language',
		name: 'ocr_lang',
		type: 'options',
		noDataExpression: true,
		typeOptions: { allowCustomValue: true },
		options: [
			{ name: 'English (Default)', value: 'eng' },
			{ name: 'Portuguese', value: 'por' },
			{ name: 'Russian', value: 'rus' },
		],
		default: 'eng',
		placeholder: 'eng+por',
		description: 'OCR language. Pick from the list or type a custom Tesseract code. Use + to combine: "eng+por", "eng+rus". <a href="https://pdfapihub.com/request-more-fonts" target="_blank">Request more languages</a>.',
		displayOptions: { show: { operation: ['pdfOcrParse', 'imageOcrParse'] } },
	},

	// ─── 4. Detail & Output ─────────────────────────────────────────
	{
		displayName: 'Detail Level',
		name: 'ocr_detail',
		type: 'options',
		options: [
			{ name: 'Text Only (Default)', value: 'text', description: 'Plain text with confidence score per page' },
			{ name: 'Words + Bounding Boxes', value: 'words', description: 'Adds per-word positions and confidence — useful for layout analysis' },
		],
		default: 'text',
		description: 'How much detail to return from OCR',
		displayOptions: { show: { operation: ['pdfOcrParse', 'imageOcrParse'] } },
	},
	{
		displayName: 'Response Format',
		name: 'ocr_output_format',
		type: 'options',
		options: [
			{ name: 'JSON (Default)', value: 'json', description: 'Full structured JSON with pages, confidence, and metadata' },
			{ name: 'Plain Text', value: 'text', description: 'Raw text only — no JSON wrapper' },
		],
		default: 'json',
		description: 'Format of the API response',
		displayOptions: { show: { operation: ['pdfOcrParse', 'imageOcrParse'] } },
	},

	// ─── 5. Advanced Options ────────────────────────────────────────
	{
		displayName: 'Advanced Options',
		name: 'ocrAdvancedOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { operation: ['pdfOcrParse'] } },
		options: [
			{
				displayName: 'DPI',
				name: 'dpi',
				type: 'number',
				default: 200,
				typeOptions: { minValue: 72, maxValue: 400 },
				description: 'Resolution for rasterising PDF pages before OCR. Higher = better quality but slower. 200 is good for standard docs, use 300+ for fine print.',
			},
			{
				displayName: 'Character Whitelist',
				name: 'char_whitelist',
				type: 'string',
				default: '',
				placeholder: '0123456789.$,-',
				description: 'Restrict OCR to only these characters — great for extracting numbers from invoices (e.g. "0123456789.$,-")',
			},
			{
				displayName: 'Page Segmentation Mode (PSM)',
				name: 'psm',
				type: 'options',
				options: [
					{ name: '3 — Fully Automatic (Default)', value: 3 },
					{ name: '4 — Single Column', value: 4 },
					{ name: '6 — Single Block of Text', value: 6 },
					{ name: '7 — Single Text Line', value: 7 },
					{ name: '8 — Single Word', value: 8 },
					{ name: '13 — Raw Line', value: 13 },
				],
				default: 3,
				description: 'How Tesseract segments the page. Change only if default gives poor results.',
			},
			{
				displayName: 'OCR Engine Mode (OEM)',
				name: 'oem',
				type: 'options',
				options: [
					{ name: '3 — Best Available (Default)', value: 3 },
					{ name: '1 — LSTM Neural Net', value: 1 },
					{ name: '0 — Legacy', value: 0 },
				],
				default: 3,
				description: 'Tesseract engine mode. Default (3) auto-selects the best.',
			},
		],
	},
];

/* ================================================================
 *  Execute handler
 * ================================================================ */

export async function execute(
	this: IExecuteFunctions,
	index: number,
	returnData: INodeExecutionData[],
): Promise<void> {
	const pdfInputType = this.getNodeParameter('ocr_pdf_input_type', index) as string;
	const pdfUrl = this.getNodeParameter('ocr_pdf_url', index, '') as string;
	const pages = this.getNodeParameter('ocr_pages', index, 'all') as string;
	const lang = this.getNodeParameter('ocr_lang', index, 'eng') as string;
	const detail = this.getNodeParameter('ocr_detail', index, 'text') as string;
	const outputFormat = this.getNodeParameter('ocr_output_format', index, 'json') as string;

	// Advanced options (with backward compat for legacy top-level fields)
	const advanced = this.getNodeParameter('ocrAdvancedOptions', index, {}) as Record<string, unknown>;

	let dpi = advanced.dpi as number | undefined;
	if (dpi === undefined) {
		try { dpi = this.getNodeParameter('ocr_dpi', index) as number; } catch { dpi = 200; }
	}

	let psm = advanced.psm as number | undefined;
	if (psm === undefined) {
		try { psm = this.getNodeParameter('ocr_psm', index) as number; } catch { psm = 3; }
	}

	let oem = advanced.oem as number | undefined;
	if (oem === undefined) {
		try { oem = this.getNodeParameter('ocr_oem', index) as number; } catch { oem = 3; }
	}

	const charWhitelist = (advanced.char_whitelist as string | undefined) ?? '';

	const body: Record<string, unknown> = {
		pages,
		lang,
		dpi,
		psm,
		oem,
		detail,
		output_format: outputFormat,
	};
	if (charWhitelist) body.char_whitelist = charWhitelist;
	if (pdfInputType === 'url') body.url = normalizeUrl(pdfUrl);

	const requestOptions =
		pdfInputType === 'file'
			? await createSingleFileMultipart.call(
					this,
					index,
					this.getNodeParameter('ocr_pdf_binary_property', index) as string,
					body as Record<string, string | number | boolean>,
				)
			: { body, json: true };

	const responseData = await this.helpers.httpRequestWithAuthentication.call(
		this,
		'pdfapihubApi',
		{
			method: 'POST',
			url: 'https://pdfapihub.com/api/v1/pdf/ocr/parse',
			...requestOptions,
			returnFullResponse: true,
			ignoreHttpStatusErrors: true,
		},
	) as { body: unknown; statusCode: number };

	checkApiResponse(this, responseData.statusCode, responseData.body, index);
	returnData.push(parseJsonResponseBody(responseData.body, index));
}
