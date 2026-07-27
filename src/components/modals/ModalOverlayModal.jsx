import React, { useEffect, useState } from 'react';
export default function ModalOverlayModal() {
  const [autoBackup, setAutoBackup] = useState(() => {
    return localStorage.getItem('autoBackup12am') === 'true';
  });
  
  const [backupTime, setBackupTime] = useState(() => {
    return localStorage.getItem('autoBackupTime') || '00:00';
  });

  useEffect(() => {
    localStorage.setItem('autoBackup12am', autoBackup);
  }, [autoBackup]);
  
  useEffect(() => {
    localStorage.setItem('autoBackupTime', backupTime);
  }, [backupTime]);

  const setTimeToNow = (e) => {
    e.stopPropagation();
    
    // Instead of changing the auto-backup time, trigger export immediately
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn && !exportBtn.disabled) {
        exportBtn.click();
        
        // Use the global showToast if available (legacy.js), or fallback to simple alert
        if (typeof window.showToast === 'function') {
            window.showToast("Backup exported manually!", false);
        } else {
            console.log("Backup exported manually!");
        }
        
        // Optional: you can visually show success on the button itself temporarily
        const btn = e.currentTarget;
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Exported';
        btn.style.background = 'var(--accent-primary)';
        btn.style.color = 'white';
        
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.background = 'var(--bg-secondary)';
            btn.style.color = 'var(--text-primary)';
        }, 2000);
    }
  };

  return (
    <div id="modal-overlay" className="modal-overlay hidden">
        <div className="modal-content">
            <button className="close-modal-btn" title="Close">&times;</button>
            <h2>Manage Courses</h2>
            <div id="add-subcourse-container" style={{display: 'none', width: '100%', marginBottom: '0.6rem'}}>
                <button id="add-subcourse-btn" className="primary-btn" style={{width: '100%', justifyContent: 'center', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', padding: '10px 14px', borderRadius: '10px', fontSize: '0.88rem'}}>
                    <i className="fas fa-folder-plus"></i> <span id="add-subcourse-btn-text">Add Sub-Course in this location</span>
                </button>
            </div>
            <button id="add-folder-btn" className="secondary-btn"><i className="fas fa-folder-plus"></i> Add Course Folder</button>
            <hr style={{"width":"100%","border":"none","borderTop":"1px solid var(--border-primary)"}} />
            <button id="import-btn" className="secondary-btn"><i className="fas fa-file-import"></i> Import Backup</button>
            <button id="export-btn" className="secondary-btn" onClick={(e) => {
                e.preventDefault();
                if (typeof window.triggerExportBackup === 'function') {
                    window.triggerExportBackup(e.currentTarget);
                }
            }}><i className="fas fa-file-export"></i> Export Backup</button>
            <button id="purge-btn" className="secondary-btn" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)', fontWeight: '700' }}><i className="fas fa-trash-alt"></i> Purge Orphan Data</button>
            <div style={{
                marginTop: '1.2rem', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: '14px 16px', 
                background: 'var(--bg-tertiary)', 
                borderRadius: '12px', 
                border: '1px solid var(--border-secondary)',
                gap: '12px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input 
                        type="checkbox" 
                        id="auto-backup-checkbox" 
                        checked={autoBackup}
                        onChange={(e) => setAutoBackup(e.target.checked)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent-primary)', margin: '0' }}
                    />
                    <label htmlFor="auto-backup-checkbox" style={{ cursor: 'pointer', color: 'var(--text-primary)', fontWeight: '600', fontSize: '0.88rem', whiteSpace: 'nowrap' }}>
                        Auto trigger backups at
                    </label>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input 
                        type="time" 
                        value={backupTime}
                        onChange={(e) => setBackupTime(e.target.value)}
                        style={{
                            background: 'var(--bg-secondary)', 
                            color: 'var(--text-primary)', 
                            border: '1px solid var(--border-secondary)', 
                            borderRadius: '8px',
                            padding: '6px 10px',
                            cursor: 'pointer',
                            outline: 'none',
                            fontFamily: 'inherit',
                            fontSize: '0.88rem',
                            fontWeight: '600'
                        }}
                    />
                    <button 
                        type="button"
                        onClick={setTimeToNow}
                        style={{
                            background: 'var(--bg-secondary)', 
                            color: 'var(--text-primary)', 
                            border: '1px solid var(--border-secondary)', 
                            borderRadius: '8px',
                            padding: '6px 12px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        Now
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
}
