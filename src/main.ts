import {Editor, Plugin, requestUrl} from 'obsidian';

const DROPBOX_PHOTO_RE = /^https:\/\/www\.dropbox\.com\/scl\/fi\/.+\.(?:jpg|jpeg|png|gif|bmp|webp|heic)\?.+&dl=0$/i;

// Inserts markdown into the editor. Deferred via setTimeout to handle the case
// where Obsidian already committed the raw URL to the editor before this event
// handler ran (making preventDefault ineffective). If the raw URL is found on
// the current line, it is replaced in-place; otherwise replaceSelection is used.
function insertMarkdown(editor: Editor, originalText: string, markdown: string) {
	window.setTimeout(() => {
		const cursor = editor.getCursor();
		const line = editor.getLine(cursor.line);
		const urlIdx = line.lastIndexOf(originalText);
		if (urlIdx !== -1) {
			editor.replaceRange(
				markdown,
				{line: cursor.line, ch: urlIdx},
				{line: cursor.line, ch: urlIdx + originalText.length}
			);
		} else {
			editor.replaceSelection(markdown);
		}
	}, 0);
}

// PNG stores width and height as big-endian uint32s at fixed offsets in the
// IHDR chunk: bytes 16–19 = width, bytes 20–23 = height.
function parsePngDimensions(buf: ArrayBuffer): {width: number, height: number} | null {
	if (buf.byteLength < 24) return null;
	const view = new DataView(buf);
	const sig = [137, 80, 78, 71, 13, 10, 26, 10]; // PNG magic bytes
	for (let i = 0; i < 8; i++) {
		if (view.getUint8(i) !== sig[i]) return null;
	}
	return {width: view.getUint32(16, false), height: view.getUint32(20, false)};
}

// Reads the EXIF orientation tag (0x0112) from a JPEG APP1 segment.
// Returns null if this APP1 segment is not EXIF (e.g. it's XMP) or if the
// orientation tag is absent — so the caller can safely ignore non-EXIF APP1s.
function readExifOrientation(view: DataView, app1DataOffset: number): number | null {
	// APP1 EXIF segments begin with the ASCII string "Exif" followed by two null bytes
	const exifSig = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00]; // "Exif\0\0"
	for (let i = 0; i < 6; i++) {
		if (view.getUint8(app1DataOffset + i) !== exifSig[i]) return null;
	}

	// The TIFF header immediately follows the "Exif\0\0" signature.
	// The first two bytes indicate byte order: "II" = little-endian, "MM" = big-endian.
	const tiff = app1DataOffset + 6;
	const littleEndian = view.getUint16(tiff, false) === 0x4949; // 'II'

	// Bytes 4–7 of the TIFF header give the offset to IFD0 (relative to tiff start)
	const ifd0 = tiff + view.getUint32(tiff + 4, littleEndian);
	const entryCount = view.getUint16(ifd0, littleEndian);

	// Each IFD entry is 12 bytes: 2 tag + 2 type + 4 count + 4 value
	for (let i = 0; i < entryCount; i++) {
		const entry = ifd0 + 2 + i * 12;
		if (entry + 12 > view.byteLength) break;
		if (view.getUint16(entry, littleEndian) === 0x0112) { // Orientation tag
			return view.getUint16(entry + 8, littleEndian);
		}
	}
	return null;
}

// Scans JPEG markers to extract pixel dimensions and EXIF orientation.
// Phone cameras store images in sensor orientation (often portrait) and use
// the EXIF orientation tag to indicate the display rotation. We must apply
// that rotation to determine the true displayed width and height.
function parseJpegDimensions(buf: ArrayBuffer): {width: number, height: number} | null {
	const view = new DataView(buf);
	if (buf.byteLength < 4) return null;
	if (view.getUint8(0) !== 0xFF || view.getUint8(1) !== 0xD8) return null; // SOI marker

	let dims: {width: number, height: number} | null = null;
	let orientation = 1; // default: no rotation
	let offset = 2;

	while (offset + 4 <= buf.byteLength) {
		if (view.getUint8(offset) !== 0xFF) break;
		const marker = view.getUint8(offset + 1);
		// Segment length field includes its own 2 bytes but not the 2-byte marker
		const segmentLength = view.getUint16(offset + 2, false);

		if (marker === 0xE1) {
			// APP1 — could be EXIF (orientation) or XMP (no orientation). A JPEG
			// can contain both, so we only update orientation when we find real EXIF.
			const o = readExifOrientation(view, offset + 4);
			if (o !== null) orientation = o;
		}

		// SOF (Start of Frame) markers hold the stored pixel dimensions.
		// There are many SOF variants; all encode height at +5 and width at +7.
		const isSOF = (marker >= 0xC0 && marker <= 0xC3) || (marker >= 0xC5 && marker <= 0xC7)
			|| (marker >= 0xC9 && marker <= 0xCB) || (marker >= 0xCD && marker <= 0xCF);
		if (isSOF && offset + 9 <= buf.byteLength) {
			dims = {height: view.getUint16(offset + 5, false), width: view.getUint16(offset + 7, false)};
		}

		offset += 2 + segmentLength;
	}

	if (!dims) return null;

	// EXIF orientations 5–8 mean the image is rotated 90° or 270°, so the
	// displayed width and height are the opposite of the stored dimensions.
	return (orientation >= 5 && orientation <= 8)
		? {width: dims.height, height: dims.width}
		: dims;
}

export default class ConvertDropboxPhotolinkPlugin extends Plugin {
	onload() {
		this.registerEvent(
			this.app.workspace.on('editor-paste', (evt: ClipboardEvent, editor: Editor) => {
				const text = evt.clipboardData?.getData('text/plain')?.trim();
				if (!text || !DROPBOX_PHOTO_RE.test(text)) return;

				evt.preventDefault();
				// Convert Dropbox share link to a direct image URL
				const rawUrl = text.replace(/&dl=0$/, '&raw=1');

				// Fetch only the first 64KB — enough to read the image header without
				// downloading the full file. Falls back to 400px if the request fails
				// or the format is not PNG/JPEG.
				requestUrl({url: rawUrl, headers: {'Range': 'bytes=0-65535'}})
					.then(response => {
						const buf = response.arrayBuffer;
						const dims = parsePngDimensions(buf) ?? parseJpegDimensions(buf);
						const width = dims && dims.width > dims.height ? 600 : 400;
						insertMarkdown(editor, text, `![|${width}](${rawUrl})`);
					})
					.catch(() => insertMarkdown(editor, text, `![|400](${rawUrl})`));
			})
		);
	}
}
