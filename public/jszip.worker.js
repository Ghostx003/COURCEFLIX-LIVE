importScripts("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js");

let zipInstance = null;

self.onmessage = async (e) => {
    const { type, id, payload } = e.data;

    try {
        if (type === 'EXPORT') {
            const zip = new JSZip();
            for (const file of payload.files) {
                zip.file(file.path, file.content);
            }
            const zipBlob = await zip.generateAsync({ type: "blob" });
            self.postMessage({ type: 'SUCCESS', id, payload: { zipBlob } });
        } 
        else if (type === 'IMPORT_LOAD') {
            zipInstance = await JSZip.loadAsync(payload.zipFile);
            
            // Get a list of all files in the zip for fuzzy matching in main thread
            const allFiles = Object.keys(zipInstance.files);
            
            // Get backup.json immediately since it's always needed first
            const backupFile = zipInstance.file('backup.json');
            if (!backupFile) {
                throw new Error('Invalid backup file: backup.json not found.');
            }
            const backupDataString = await backupFile.async('string');
            
            self.postMessage({ 
                type: 'SUCCESS', 
                id, 
                payload: { 
                    backupDataString,
                    allFiles
                } 
            });
        }
        else if (type === 'IMPORT_GET_FILE') {
            if (!zipInstance) throw new Error('Zip not loaded in worker');
            
            // Re-implement the getZipFile logic from main thread using the exact path
            // The main thread will do the fuzzy matching using the `allFiles` list and ask for exact paths
            const file = zipInstance.file(payload.path);
            
            if (!file) {
                self.postMessage({ type: 'SUCCESS', id, payload: { content: null } });
                return;
            }

            const content = await file.async(payload.asType || 'blob');
            self.postMessage({ type: 'SUCCESS', id, payload: { content } });
        }
    } catch (error) {
        self.postMessage({ type: 'ERROR', id, error: error.message });
    }
};
