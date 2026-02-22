import {Editor, Plugin} from 'obsidian';

const DROPBOX_PHOTO_RE = /^https:\/\/www\.dropbox\.com\/scl\/fi\/.+\.(?:jpg|jpeg|png|gif|bmp|webp|heic)\?.+&dl=0$/i;

export default class ConvertDropboxPhotolinkPlugin extends Plugin {
	onload() {
		this.registerEvent(
			this.app.workspace.on('editor-paste', (evt: ClipboardEvent, editor: Editor) => {
				const text = evt.clipboardData?.getData('text/plain')?.trim();
				if (!text || !DROPBOX_PHOTO_RE.test(text)) return;

				evt.preventDefault();
				const rawUrl = text.replace(/&dl=0$/, '&raw=1');
				const markdown = `![|400](${rawUrl})`;

				// Defer to handle the case where Obsidian already committed the paste
				// before this event fired (making preventDefault ineffective). Check
				// whether the raw URL landed in the editor; if so, replace it in-place.
				activeWindow.setTimeout(() => {
					const cursor = editor.getCursor();
					const line = editor.getLine(cursor.line);
					const urlIdx = line.lastIndexOf(text);
					if (urlIdx !== -1) {
						editor.replaceRange(
							markdown,
							{line: cursor.line, ch: urlIdx},
							{line: cursor.line, ch: urlIdx + text.length}
						);
					} else {
						editor.replaceSelection(markdown);
					}
				}, 0);
			})
		);
	}
}
