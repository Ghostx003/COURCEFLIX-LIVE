import os from 'os';
import path from 'path';
import fs from 'fs';

function getLocalIpAddresses() {
    const interfaces = os.networkInterfaces();
    const addresses = [];
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                addresses.push(iface.address);
            }
        }
    }
    return addresses;
}

const mimeMap = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogg': 'video/ogg',
    '.mov': 'video/quicktime',
    '.m4v': 'video/mp4',
    '.mkv': 'video/x-matroska',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.svg': 'image/svg+xml'
};

// Cache for folder paths on disk (folderName -> absoluteDiskPath)
const folderDiskMap = new Map();
const customScanRoots = new Set();

function findFolderOnDisk(folderName) {
    if (folderDiskMap.has(folderName)) {
        const cached = folderDiskMap.get(folderName);
        if (cached && fs.existsSync(cached)) return cached;
    }

    const userHome = os.homedir();
    const candidateRoots = [
        path.join(userHome, 'Downloads'),
        path.join(userHome, 'Pictures'),
        path.join(userHome, 'Videos'),
        path.join(userHome, 'Desktop'),
        path.join(userHome, 'Documents'),
        'E:\\projects',
        'F:\\1. category',
        'F:\\',
        'E:\\',
        'D:\\',
        'C:\\',
        ...Array.from(customScanRoots)
    ];

    for (const root of candidateRoots) {
        try {
            if (!fs.existsSync(root)) continue;
            // 1. Direct match
            const direct = path.join(root, folderName);
            if (fs.existsSync(direct) && fs.statSync(direct).isDirectory()) {
                folderDiskMap.set(folderName, direct);
                return direct;
            }
            // 2. Search subdirectories 1 level deep
            const subdirs = fs.readdirSync(root, { withFileTypes: true });
            for (const dirent of subdirs) {
                if (dirent.isDirectory()) {
                    const subMatch = path.join(root, dirent.name, folderName);
                    if (fs.existsSync(subMatch) && fs.statSync(subMatch).isDirectory()) {
                        folderDiskMap.set(folderName, subMatch);
                        return subMatch;
                    }
                }
            }
        } catch (e) {}
    }
    return null;
}

export function wifiSyncPlugin() {
    let hostCatalog = null;
    const requestedFiles = new Set();
    const fileStore = new Map(); // id -> { buffer: Buffer, mimeType: string, lastModified: number }

    return {
        name: 'wifi-sync-server',
        configureServer(server) {
            const ips = getLocalIpAddresses();
            console.log('\n-------------------------------------------------------------');
            console.log('  📱 SoftPix Wi-Fi Automated Disk & Media Server Active!');
            console.log('  Connect on phone/tablet (same Wi-Fi):');
            ips.forEach(ip => {
                console.log(`  👉 http://${ip}:5173`);
            });
            console.log('\n  🌍 Connect from ANYWHERE via Ngrok:');
            console.log('  👉 https://outweigh-nag-uranium.ngrok-free.dev');
            console.log('-------------------------------------------------------------\n');

            server.middlewares.use(async (req, res, next) => {
                const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

                // 1. IP info endpoint
                if (url.pathname === '/api/ip') {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ ips: getLocalIpAddresses(), port: 5173 }));
                    return;
                }

                // 2. Register custom scan folder path manually if needed
                if (url.pathname === '/api/sync/register-root' && req.method === 'POST') {
                    let body = '';
                    req.on('data', chunk => { body += chunk; });
                    req.on('end', () => {
                        try {
                            const { folderPath } = JSON.parse(body);
                            if (folderPath && fs.existsSync(folderPath)) {
                                customScanRoots.add(folderPath);
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({ success: true, root: folderPath }));
                                return;
                            }
                        } catch (e) {}
                        res.statusCode = 400;
                        res.end(JSON.stringify({ error: 'Invalid folder path' }));
                    });
                    return;
                }

                // 3. Desktop host posts catalog state & auto-discovers disk paths
                if (url.pathname === '/api/sync/host-catalog' && req.method === 'POST') {
                    let body = '';
                    req.on('data', chunk => { body += chunk; });
                    req.on('end', () => {
                        try {
                            hostCatalog = JSON.parse(body);
                            
                            // Auto-discover disk paths for each enabled folder
                            if (hostCatalog && Array.isArray(hostCatalog.folders)) {
                                hostCatalog.folders.forEach(f => {
                                    if (f.name) {
                                        const diskPath = findFolderOnDisk(f.name);
                                        if (diskPath) {
                                            f.diskPath = diskPath;
                                        }
                                    }
                                });
                            }

                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ success: true, timestamp: Date.now() }));
                        } catch (e) {
                            res.statusCode = 400;
                            res.end(JSON.stringify({ error: 'Invalid JSON' }));
                        }
                    });
                    return;
                }

                // 4. Phone GETs host catalog
                if (url.pathname === '/api/sync/catalog') {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(hostCatalog || { folders: [], files: [] }));
                    return;
                }

                // 5. Pending file requests
                if (url.pathname === '/api/sync/pending-requests') {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(Array.from(requestedFiles)));
                    return;
                }

                // 6. Desktop uploads binary media buffer for fallback
                if (url.pathname === '/api/sync/upload-file' && req.method === 'POST') {
                    const fileId = url.searchParams.get('id');
                    if (!fileId) {
                        res.statusCode = 400;
                        res.end('Missing file id');
                        return;
                    }
                    const chunks = [];
                    req.on('data', chunk => chunks.push(chunk));
                    req.on('end', () => {
                        const buffer = Buffer.concat(chunks);
                        const ext = path.extname(fileId).toLowerCase();
                        const mimeType = mimeMap[ext] || 'application/octet-stream';
                        fileStore.set(fileId, {
                            buffer,
                            mimeType,
                            lastModified: Date.now()
                        });
                        requestedFiles.delete(fileId);
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ success: true, id: fileId }));
                    });
                    return;
                }

                // 7. Serve media (Direct Disk Stream FIRST, with Memory Buffer Fallback)
                if (url.pathname === '/api/media') {
                    const fileId = url.searchParams.get('id');
                    if (!fileId) {
                        res.statusCode = 400;
                        res.end('Missing id parameter');
                        return;
                    }

                    // A. Attempt Direct Disk Resolution
                    let diskFilePath = null;

                    // Match file item from hostCatalog
                    if (hostCatalog && Array.isArray(hostCatalog.files)) {
                        const matchedItem = hostCatalog.files.find(f => f.id === fileId);
                        if (matchedItem) {
                            const folderTagList = matchedItem.folderTags || [];
                            if (folderTagList.length > 0) {
                                const folderName = folderTagList[0];
                                const rootDiskPath = findFolderOnDisk(folderName);
                                if (rootDiskPath) {
                                    const subPathParts = folderTagList.slice(1).concat(matchedItem.name);
                                    const candidatePath = path.join(rootDiskPath, ...subPathParts);
                                    if (fs.existsSync(candidatePath)) {
                                        diskFilePath = candidatePath;
                                    }
                                }
                            }
                        }
                    }

                    // Direct Stream from Disk
                    if (diskFilePath && fs.existsSync(diskFilePath)) {
                        try {
                            const stat = fs.statSync(diskFilePath);
                            const totalSize = stat.size;
                            const ext = path.extname(diskFilePath).toLowerCase();
                            const mimeType = mimeMap[ext] || 'application/octet-stream';
                            const range = req.headers.range;

                            res.setHeader('Accept-Ranges', 'bytes');
                            res.setHeader('Content-Type', mimeType);

                            if (range) {
                                const parts = range.replace(/bytes=/, "").split("-");
                                const start = parseInt(parts[0], 10);
                                const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
                                const chunksize = (end - start) + 1;

                                res.statusCode = 206;
                                res.setHeader('Content-Range', `bytes ${start}-${end}/${totalSize}`);
                                res.setHeader('Content-Length', chunksize);
                                fs.createReadStream(diskFilePath, { start, end }).pipe(res);
                            } else {
                                res.statusCode = 200;
                                res.setHeader('Content-Length', totalSize);
                                fs.createReadStream(diskFilePath).pipe(res);
                            }
                            return;
                        } catch (err) {
                            console.error("Error direct streaming disk file:", diskFilePath, err);
                        }
                    }

                    // B. Fallback to uploaded buffer in memory
                    const stored = fileStore.get(fileId);
                    if (stored) {
                        const { buffer, mimeType } = stored;
                        const totalSize = buffer.length;
                        const range = req.headers.range;

                        res.setHeader('Accept-Ranges', 'bytes');
                        res.setHeader('Content-Type', mimeType);

                        if (range) {
                            const parts = range.replace(/bytes=/, "").split("-");
                            const start = parseInt(parts[0], 10);
                            const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
                            const chunksize = (end - start) + 1;

                            res.statusCode = 206;
                            res.setHeader('Content-Range', `bytes ${start}-${end}/${totalSize}`);
                            res.setHeader('Content-Length', chunksize);
                            res.end(buffer.subarray(start, end + 1));
                        } else {
                            res.statusCode = 200;
                            res.setHeader('Content-Length', totalSize);
                            res.end(buffer);
                        }
                        return;
                    }

                    // C. Otherwise request upload from desktop tab
                    requestedFiles.add(fileId);
                    res.statusCode = 404;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'File pending disk resolution or upload', id: fileId }));
                    return;
                }

                next();
            });
        }
    };
}
