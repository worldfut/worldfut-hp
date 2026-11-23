// The builder owns its draft. A commit replaces the candidate and focuses the real section atomically.
export function sectionSnapshot(global,message){
 if(!Array.isArray(message.sections))throw new Error('セクションのプレビュー形式が不正です。');
 return {...global,extra_sections:message.sections};
}
