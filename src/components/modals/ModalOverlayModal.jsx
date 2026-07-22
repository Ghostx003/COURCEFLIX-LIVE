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
            <button id="add-folder-btn" className="secondary-btn"><i className="fas fa-folder-plus"></i> Add Course Folder</button>
            <hr style={{"width":"100%","border":"none","borderTop":"1px solid var(--border-primary)"}} />
            <button id="import-btn" className="secondary-btn"><i className="fas fa-file-import"></i> Import Backup</button>
            <button id="export-btn" className="secondary-btn"><i className="fas fa-file-export"></i> Export Backup</button>
            
            <div style={{marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-secondary)'}}>
                <input 
                    type="checkbox" 
                    id="auto-backup-checkbox" 
                    checked={autoBackup}
                    onChange={(e) => setAutoBackup(e.target.checked)}
                    style={{width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--accent-primary)'}}
                />
                <label htmlFor="auto-backup-checkbox" style={{cursor: 'pointer', color: 'var(--text-primary)', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap'}}>
                    Auto trigger backups at 
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input 
                            type="time" 
                            value={backupTime}
                            onChange={(e) => setBackupTime(e.target.value)}
                            onClick={(e) => e.stopPropagation()} /* Prevents toggling the checkbox when clicking time input inside label */
                            style={{
                                background: 'var(--bg-secondary)', 
                                color: 'var(--text-primary)', 
                                border: '1px solid var(--border-secondary)', 
                                borderRadius: '6px',
                                padding: '6px 10px',
                                cursor: 'pointer',
                                outline: 'none',
                                fontFamily: 'inherit',
                                fontSize: '1rem',
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
                                borderRadius: '6px',
                                padding: '6px 12px',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                fontWeight: '600',
                                transition: 'background 0.2s, transform 0.1s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            Now
                        </button>
                    </div>
                </label>
            </div>
        </div>
    </div>
  );
}
