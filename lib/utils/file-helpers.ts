/**
 * Shared file processing helpers for drag-and-drop uploads.
 */

export const ACCEPTED_EXT = /\.(md|txt|pdf|html)$/i;

export async function getFilesFromEntry(entry: FileSystemEntry): Promise<File[]> {
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) =>
      (entry as FileSystemFileEntry).file(resolve, reject),
    );
    return ACCEPTED_EXT.test(file.name) ? [file] : [];
  }
  if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    const all: FileSystemEntry[] = [];
    let batch: FileSystemEntry[];
    do {
      batch = await new Promise<FileSystemEntry[]>((resolve) =>
        reader.readEntries(resolve),
      );
      all.push(...batch);
    } while (batch.length > 0);
    return (await Promise.all(all.map(getFilesFromEntry))).flat();
  }
  return [];
}
