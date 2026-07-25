import React from 'react';
export default function PlayerView() {
  return (
    <div id="player-view" className="view">
        <div id="pdf-drop-overlay" style={{"position":"absolute","top":"0","left":"0","right":"0","bottom":"0","background":"rgba(0, 0, 0, 0.85)","display":"flex","flexDirection":"column","alignItems":"center","justifyContent":"center","zIndex":"9999","border":"4px dashed var(--accent-primary)","color":"white","opacity":"0","pointerEvents":"none","transition":"opacity 0.2s ease"}}>
            <i className="fas fa-file-pdf" style={{"fontSize":"5rem","color":"var(--accent-primary)","marginBottom":"20px"}}></i>
            <h2 style={{"fontSize":"2.5rem","marginBottom":"10px"}}>Drop PDF Here</h2>
            <p style={{"fontSize":"1.2rem","color":"var(--text-secondary)"}}>Add as Lecture Notes or DPP</p>
        </div>
        <div id="lecture-menu">
            <div className="menu-header">
                <div className="menu-header-top">
                    <a className="back-link">&larr; Back to Courses</a>
                    <div style={{"display":"flex","gap":"8px","alignItems":"center"}}>
                        <button className="clear-bookmarks-btn hidden">Clear Bookmarks</button>
                        <button id="toggle-completed-btn" className="hidden" style={{"background":"none","border":"none","color":"var(--text-secondary)","cursor":"pointer","fontSize":"1.1rem","transition":"color 0.2s"}} title="Hide Completed Lectures"><i className="fas fa-eye-slash"></i></button>
                    </div>
                </div>
                <h2 id="course-title-menu"></h2>
                <div className="course-stats"></div>
                <div className="menu-progress-container">
                    <div className="menu-progress-bar">
                        <div className="menu-progress-fill"></div>
                    </div>
                    <div className="menu-progress-text"></div>
                </div>
            </div>
            <div id="chapter-list"></div>
        </div>
        <div className="player-content-wrapper">
            <div id="video-wrapper-container">
                <div id="video-wrapper">
                    <video id="video-player"></video>
                    <audio id="brown-noise-audio" src="brown.mp3" style={{"display":"none"}}></audio>
                    <button id="unmute-btn" className="hidden"><i className="fas fa-volume-mute"></i> Click to Unmute</button>
                    <div className="seek-overlay" id="left-seek-overlay"><i className="fas fa-backward"></i></div>
                    <div className="seek-overlay" id="right-seek-overlay"><i className="fas fa-forward"></i></div>
                    <div id="autoplay-overlay">
                        <div className="autoplay-header">Up Next</div>
                        <div className="autoplay-title" id="autoplay-next-title"></div>
                        <div className="autoplay-actions">
                            <button id="autoplay-play-btn"><i className="fas fa-play"></i> Play Now</button>
                            <div className="autoplay-countdown">
                                <svg viewBox="0 0 36 36"><circle className="bg-circle" cx="18" cy="18" r="15.5"></circle><circle className="fg-circle" id="autoplay-countdown-circle" cx="18" cy="18" r="15.5"></circle></svg>
                                <span className="autoplay-countdown-number" id="autoplay-countdown-text">5</span>
                            </div>
                            <button id="autoplay-cancel-btn">Cancel</button>
                        </div>
                    </div>
                    <div id="skip-intro-btn" style={{"position":"absolute","right":"24px","bottom":"85px","background":"rgba(0, 0, 0, 0.8)","color":"white","border":"1px solid var(--border-primary)","padding":"12px 16px","borderRadius":"8px","fontWeight":"600","cursor":"pointer","zIndex":"35","display":"none","transition":"opacity 0.3s","opacity":"0","boxShadow":"0 4px 12px rgba(0,0,0,0.5)"}}>
                        Skip Intro <i className="fas fa-forward" style={{"marginLeft":"8px"}}></i>
                    </div>
                    <div id="smart-skip-btn" style={{"position":"absolute","right":"24px","bottom":"145px","background":"rgba(0, 0, 0, 0.8)","color":"white","border":"1px solid var(--border-primary)","padding":"12px 16px","borderRadius":"8px","fontWeight":"600","cursor":"pointer","zIndex":"35","display":"none","alignItems":"center","transition":"opacity 0.3s","opacity":"0","boxShadow":"0 4px 12px rgba(0,0,0,0.5)"}}>
                        Skip 5 mins ahead <i className="fas fa-forward" style={{"marginLeft":"8px"}}></i>
                    </div>
                    <div id="smart-rewind-btn" style={{"position":"absolute","right":"24px","bottom":"145px","background":"rgba(0, 0, 0, 0.8)","color":"white","border":"1px solid var(--border-primary)","padding":"12px 16px","borderRadius":"8px","fontWeight":"600","cursor":"pointer","zIndex":"35","display":"none","alignItems":"center","transition":"opacity 0.3s","opacity":"0","boxShadow":"0 4px 12px rgba(0,0,0,0.5)"}}>
                        Rewind Back? <i className="fas fa-undo" style={{"marginLeft":"8px"}}></i>
                    </div>
                    <div className="video-controls-container">
                        <div className="timeline-container">
                            <input type="range" className="timeline" defaultValue="0" step="0.1" />
                            <div id="bookmarks-container"></div>
                        </div>
                        <div className="controls" style={{"position":"relative"}}>
                            <div className="left-controls">
                                <button className="control-btn" id="play-pause-btn"><i className="fas fa-play"></i></button>
                                <div className="time-display"><span id="current-time">0:00</span> / <span id="video-duration">0:00</span></div>
                            </div>
                            <div id="estimated-end-time-container" style={{"position":"absolute","left":"50%","transform":"translateX(-50%)","height":"100%","top":"0","padding":"0 50px","cursor":"default","display":"flex","alignItems":"center","zIndex":"10"}}>
                                <div id="estimated-end-time" style={{"fontSize":"0.9rem","fontWeight":"600","color":"#e8f5e9","textShadow":"0px 2px 5px rgba(0,0,0,0.9)","letterSpacing":"0.5px","opacity":"0","transition":"opacity 0.3s","pointerEvents":"none"}}></div>
                            </div>
                            <div className="right-controls" style={{"position":"relative","display":"flex","alignItems":"center"}}>
                                <div id="custom-speed-popover" className="hidden" style={{"position":"absolute","bottom":"100%","right":"0","marginBottom":"10px","padding":"8px","borderRadius":"8px","boxShadow":"var(--shadow)","zIndex":"100","background":"var(--bg-secondary)","border":"1px solid var(--border-primary)","display":"flex","alignItems":"center","gap":"8px"}}>
                                    <input type="number" id="custom-speed-input" step="0.1" min="0.1" max="5.0" style={{"width":"60px","padding":"4px","textAlign":"center","borderRadius":"4px","background":"var(--bg-primary)","color":"var(--text-primary)","border":"1px solid var(--border-secondary)","outline":"none"}} />
                                    <span style={{"color":"var(--text-secondary)","fontSize":"0.85rem","marginLeft":"-4px"}}>x</span>
                                    <button id="apply-custom-speed" style={{"padding":"4px 10px","borderRadius":"4px","fontSize":"0.85rem","background":"var(--accent-primary)","color":"var(--text-on-accent)","border":"none","cursor":"pointer","fontWeight":"600"}}>Set</button>
                                </div>
                                <button className="control-btn" id="player-notes-btn" title="Notes (Shift+N)" style={{"marginRight":"6px","fontSize":"0.85rem","opacity":"0.85"}}><i className="fas fa-sticky-note"></i></button>
                                <button className="control-btn" id="player-dpp-btn" title="DPP (Shift+D)" style={{"marginRight":"6px","fontSize":"0.85rem","opacity":"0.85"}}><i className="fas fa-book-open"></i></button>
                                <button className="control-btn" id="shortcuts-btn" title="Keyboard Shortcuts (/)" onClick={() => { const el = document.getElementById('shortcuts-modal-overlay'); if (el) el.classList.remove('hidden'); }} style={{"marginRight":"10px","fontSize":"0.85rem","opacity":"0.85"}}><i className="fas fa-keyboard"></i></button>
                                <button className="control-btn" id="speed-btn" style={{"marginRight":"0"}}>1x</button>
                                <button className="control-btn" id="custom-speed-btn" title="Custom Speed" style={{"marginRight":"8px"}}><i className="fas fa-sliders-h" style={{"fontSize":"0.9rem"}}></i></button>
                                <button className="control-btn" id="fullscreen-btn"><i className="fas fa-expand"></i></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div id="media-viewer" className="hidden">
                <div id="media-resize-handle"></div>
                <div id="media-viewer-header">
                    <h3 id="viewer-title"></h3>
                    <div className="viewer-actions">
                        <div id="file-switcher-container"></div>
                        <button id="delete-viewer-file" title="Delete File"><i className="fas fa-trash"></i> Delete</button>
                        <button id="close-viewer-btn" title="Close Viewer"><i className="fas fa-times"></i></button>
                    </div>
                </div>
                <iframe id="media-viewer-frame" src="about:blank"></iframe>
                <div id="media-viewer-upload-placeholder" className="hidden" style={{"flexGrow":"1","display":"flex","flexDirection":"column","alignItems":"center","justifyContent":"center","padding":"2.5rem 1.5rem","cursor":"pointer","textAlign":"center","border":"2px dashed var(--border-secondary)","margin":"1.5rem","borderRadius":"16px","background":"var(--bg-tertiary)","transition":"all 0.25s ease","boxSizing":"border-box"}}>
                    <i id="placeholder-icon" className="fas fa-file-pdf" style={{"fontSize":"3.8rem","color":"var(--accent-primary)","marginBottom":"18px","filter":"drop-shadow(0 4px 12px rgba(16, 185, 129, 0.3))"}}></i>
                    <h4 id="placeholder-title" style={{"margin":"0 0 8px 0","fontSize":"1.25rem","fontWeight":"700","color":"var(--text-primary)"}}>Lecture Notes (PDF)</h4>
                    <p id="placeholder-subtitle" style={{"margin":"0","fontSize":"0.92rem","color":"var(--text-secondary)"}}>Click or Drag & Drop a PDF Here</p>
                </div>
            </div>
            <button id="media-viewer-toggle-btn" className="hidden"><i className="fas fa-chevron-left"></i></button>
            <div id="player-notes-sidebar" className="hidden" style={{ width: "var(--notes-width)", minWidth: "0px", backgroundColor: "var(--bg-secondary)", borderLeft: "1px solid var(--border-primary)", position: "relative", zIndex: "50", display: "flex", flexDirection: "column", transition: "width 0.3s ease-in-out, opacity 0.3s", boxShadow: "-10px 0 30px rgba(0,0,0,0.3)" }}>
                <div id="player-notes-resize-handle" style={{ position: "absolute", top: "0", left: "0", height: "100%", width: "8px", cursor: "ew-resize", zIndex: "60", backgroundColor: "transparent", transition: "background-color 0.2s" }} title="Drag to resize notes panel"></div>
                
                {/* Modern Header */}
                <div id="player-notes-sidebar-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.85rem 1.1rem", borderBottom: "1px solid var(--border-primary)", backgroundColor: "var(--bg-secondary)", flexShrink: "0", gap: "0.8rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <h3 style={{ margin: "0", fontSize: "1.05rem", fontWeight: "800", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                            <i className="fas fa-edit" style={{ color: "var(--accent-primary)", fontSize: "1rem" }}></i> Notes
                        </h3>
                        <span style={{ fontSize: "0.72rem", background: "var(--bg-tertiary)", border: "1px solid var(--border-secondary)", color: "var(--text-secondary)", padding: "2px 6px", borderRadius: "5px", fontWeight: "700" }} title="Press 'Q' to toggle notes window">Q</span>
                    </div>

                    <div className="notes-actions" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span id="player-notes-save-status" style={{ fontSize: "0.75rem", color: "#10b981", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px", padding: "2px 8px", background: "rgba(16,185,129,0.1)", borderRadius: "12px", border: "1px solid rgba(16,185,129,0.2)" }}>
                            <i className="fas fa-check-circle" style={{ fontSize: "0.7rem" }}></i> Saved
                        </span>
                        
                        <button id="player-notes-add-timestamp-btn" title="Insert Current Video Timestamp (Click inside notes to jump back!)" style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)", border: "1px solid var(--border-secondary)", padding: "5px 10px", borderRadius: "8px", cursor: "pointer", fontSize: "0.78rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "5px", transition: "all 0.2s ease" }}>
                            <i className="fas fa-stopwatch" style={{ color: "var(--accent-primary)" }}></i> +Time
                        </button>
                        
                        <button id="player-notes-copy-btn" title="Copy Notes to Clipboard" style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)", border: "1px solid var(--border-secondary)", padding: "5px 9px", borderRadius: "8px", cursor: "pointer", fontSize: "0.78rem", fontWeight: "600", transition: "all 0.2s ease" }}>
                            <i className="fas fa-copy"></i>
                        </button>

                        <button id="close-player-notes-btn" title="Close Notes (Q)" style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "var(--text-secondary)", border: "1px solid var(--border-primary)", borderRadius: "50%", width: "28px", height: "28px", cursor: "pointer", fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s ease" }}>
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                </div>

                {/* Editor Container */}
                <div id="player-notes-editor-container" style={{ flexGrow: "1", padding: "1rem", overflowY: "auto", display: "flex", flexDirection: "column", background: "var(--bg-secondary)" }}>
                    <div id="player-notes-editor" contentEditable="true" placeholder="Press Q to take notes... Insert timestamps, formulas, & callout blocks!" style={{ flexGrow: "1", outline: "none", whiteSpace: "pre-wrap", fontFamily: "'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', cursive, sans-serif", fontSize: "0.95rem", lineHeight: "1.65", color: "#ffffff", minHeight: "200px" }}></div>
                </div>

                {/* Bottom Toolbar Section */}
                <div id="player-notes-bottom-section" style={{ borderTop: "1px solid var(--border-primary)", background: "var(--bg-tertiary)", flexShrink: "0", display: "flex", flexDirection: "column" }}>
                    {/* Quick Callout Tag Pills Bar */}
                    <div id="player-notes-tags-bar" style={{ display: "flex", gap: "6px", padding: "8px 12px", background: "var(--bg-primary)", borderBottom: "1px solid var(--border-primary)", overflowX: "auto", scrollbarWidth: "none" }}>
                        <button className="note-quick-tag-btn" data-tag="important" style={{ background: "rgba(239, 68, 68, 0.12)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.3)", padding: "3px 9px", borderRadius: "12px", fontSize: "0.74rem", fontWeight: "700", cursor: "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "4px" }}>
                            ⚡ Important
                        </button>
                        <button className="note-quick-tag-btn" data-tag="concept" style={{ background: "rgba(6, 182, 212, 0.12)", color: "#06b6d4", border: "1px solid rgba(6, 182, 212, 0.3)", padding: "3px 9px", borderRadius: "12px", fontSize: "0.74rem", fontWeight: "700", cursor: "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "4px" }}>
                            💡 Concept
                        </button>
                        <button className="note-quick-tag-btn" data-tag="formula" style={{ background: "rgba(168, 85, 247, 0.12)", color: "#a855f7", border: "1px solid rgba(168, 85, 247, 0.3)", padding: "3px 9px", borderRadius: "12px", fontSize: "0.74rem", fontWeight: "700", cursor: "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "4px" }}>
                            📌 Formula
                        </button>
                        <button className="note-quick-tag-btn" data-tag="doubt" style={{ background: "rgba(245, 158, 11, 0.12)", color: "#f59e0b", border: "1px solid rgba(245, 158, 11, 0.3)", padding: "3px 9px", borderRadius: "12px", fontSize: "0.74rem", fontWeight: "700", cursor: "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "4px" }}>
                            ❓ Doubt
                        </button>
                        <button className="note-quick-tag-btn" data-tag="summary" style={{ background: "rgba(16, 185, 129, 0.12)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.3)", padding: "3px 9px", borderRadius: "12px", fontSize: "0.74rem", fontWeight: "700", cursor: "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "4px" }}>
                            📝 Summary
                        </button>
                    </div>

                    {/* Formatting Toolbar */}
                    <div id="player-notes-formatting-toolbar" style={{ display: "flex", flexWrap: "wrap", gap: "5px", padding: "8px 12px", background: "var(--bg-tertiary)", alignItems: "center", scrollbarWidth: "none" }}>
                        <div style={{ display: "flex", gap: "2px" }}>
                            <button className="notes-format-btn" data-command="formatBlock" data-value="H1" onMouseDown={(e) => { e.preventDefault() }} onClick={() => { document.execCommand('formatBlock', false, 'H1') }} title="Heading 1" style={{ fontWeight: "700", fontSize: "0.75rem", padding: "3px 6px", borderRadius: "5px", border: "1px solid var(--border-secondary)", background: "var(--bg-secondary)", color: "var(--text-primary)", cursor: "pointer" }}>H1</button>
                            <button className="notes-format-btn" data-command="formatBlock" data-value="H2" onMouseDown={(e) => { e.preventDefault() }} onClick={() => { document.execCommand('formatBlock', false, 'H2') }} title="Heading 2" style={{ fontWeight: "700", fontSize: "0.75rem", padding: "3px 6px", borderRadius: "5px", border: "1px solid var(--border-secondary)", background: "var(--bg-secondary)", color: "var(--text-primary)", cursor: "pointer" }}>H2</button>
                            <button className="notes-format-btn" data-command="formatBlock" data-value="H3" onMouseDown={(e) => { e.preventDefault() }} onClick={() => { document.execCommand('formatBlock', false, 'H3') }} title="Heading 3" style={{ fontWeight: "700", fontSize: "0.75rem", padding: "3px 6px", borderRadius: "5px", border: "1px solid var(--border-secondary)", background: "var(--bg-secondary)", color: "var(--text-primary)", cursor: "pointer" }}>H3</button>
                            <button className="notes-format-btn" data-command="formatBlock" data-value="P" onMouseDown={(e) => { e.preventDefault() }} onClick={() => { document.execCommand('formatBlock', false, 'P') }} title="Paragraph" style={{ fontWeight: "700", fontSize: "0.75rem", padding: "3px 6px", borderRadius: "5px", border: "1px solid var(--border-secondary)", background: "var(--bg-secondary)", color: "var(--text-primary)", cursor: "pointer" }}>P</button>
                        </div>
                        
                        <div style={{ width: "1px", height: "16px", background: "var(--border-primary)", margin: "0 2px" }}></div>
                        
                        <div style={{ display: "flex", gap: "2px" }}>
                            <button className="notes-format-btn" data-command="bold" onMouseDown={(e) => { e.preventDefault() }} onClick={() => { document.execCommand('bold', false, null) }} title="Bold" style={{ fontWeight: "800", padding: "3px 7px", borderRadius: "5px", border: "1px solid var(--border-secondary)", background: "var(--bg-secondary)", color: "var(--text-primary)", cursor: "pointer" }}><b>B</b></button>
                            <button className="notes-format-btn" data-command="italic" onMouseDown={(e) => { e.preventDefault() }} onClick={() => { document.execCommand('italic', false, null) }} title="Italic" style={{ fontStyle: "italic", padding: "3px 7px", borderRadius: "5px", border: "1px solid var(--border-secondary)", background: "var(--bg-secondary)", color: "var(--text-primary)", cursor: "pointer" }}><i>I</i></button>
                            <button className="notes-format-btn" data-command="underline" onMouseDown={(e) => { e.preventDefault() }} onClick={() => { document.execCommand('underline', false, null) }} title="Underline" style={{ textDecoration: "underline", padding: "3px 7px", borderRadius: "5px", border: "1px solid var(--border-secondary)", background: "var(--bg-secondary)", color: "var(--text-primary)", cursor: "pointer" }}><u>U</u></button>
                            <button className="notes-format-btn" data-command="strikeThrough" onMouseDown={(e) => { e.preventDefault() }} onClick={() => { document.execCommand('strikeThrough', false, null) }} title="Strikethrough" style={{ textDecoration: "line-through", padding: "3px 7px", borderRadius: "5px", border: "1px solid var(--border-secondary)", background: "var(--bg-secondary)", color: "var(--text-primary)", cursor: "pointer" }}>S</button>
                        </div>

                        <div style={{ width: "1px", height: "16px", background: "var(--border-primary)", margin: "0 2px" }}></div>
                        
                        {/* Font Theme Select Dropdown */}
                        <select 
                            id="player-notes-font-family"
                            onChange={(e) => {
                                const font = e.target.value;
                                const ed = document.getElementById('player-notes-editor');
                                if (ed) ed.style.fontFamily = font;
                                document.execCommand('fontName', false, font);
                            }}
                            defaultValue="'Comic Sans MS', 'Chalkboard SE', cursive, sans-serif"
                            style={{
                                background: "var(--bg-secondary)",
                                color: "var(--text-primary)",
                                border: "1px solid var(--border-secondary)",
                                borderRadius: "5px",
                                padding: "2px 5px",
                                fontSize: "0.73rem",
                                fontWeight: "600",
                                cursor: "pointer",
                                outline: "none"
                            }}
                            title="Choose Font Theme"
                        >
                            <option value="'Comic Sans MS', 'Chalkboard SE', cursive, sans-serif">Comic Sans</option>
                            <option value="'Inter', sans-serif">Inter</option>
                            <option value="'Roboto', sans-serif">Roboto</option>
                            <option value="'Courier New', monospace">Monospace</option>
                            <option value="'Georgia', serif">Georgia</option>
                        </select>

                        {/* Font Size Select Dropdown */}
                        <select 
                            id="player-notes-font-size"
                            onChange={(e) => {
                                const size = e.target.value;
                                const ed = document.getElementById('player-notes-editor');
                                if (ed) ed.style.fontSize = size;
                            }}
                            defaultValue="0.95rem"
                            style={{
                                background: "var(--bg-secondary)",
                                color: "var(--text-primary)",
                                border: "1px solid var(--border-secondary)",
                                borderRadius: "5px",
                                padding: "2px 5px",
                                fontSize: "0.73rem",
                                fontWeight: "600",
                                cursor: "pointer",
                                outline: "none"
                            }}
                            title="Choose Font Size"
                        >
                            <option value="0.8rem">13px</option>
                            <option value="0.95rem">15px (Def)</option>
                            <option value="1.1rem">18px</option>
                            <option value="1.25rem">20px</option>
                            <option value="1.5rem">24px</option>
                        </select>

                        <button className="notes-format-btn" onMouseDown={(e) => { e.preventDefault() }} onClick={() => { if (window.toggleNoteHighlight) window.toggleNoteHighlight(); }} title="Toggle Yellow Highlight" style={{ padding: "3px 7px", borderRadius: "5px", border: "1px solid var(--border-secondary)", background: "#fef08a", color: "#000000", cursor: "pointer", fontSize: "0.73rem", fontWeight: "700" }}>Highlight</button>
                    </div>
                </div>
            </div>
        </div>
        <button id="sidebar-toggle-btn"><i className="fas fa-chevron-left"></i></button>
    </div>
  );
}
