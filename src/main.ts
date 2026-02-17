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
				editor.replaceSelection(`![|400](${rawUrl})`);
			})
		);
	}
}
