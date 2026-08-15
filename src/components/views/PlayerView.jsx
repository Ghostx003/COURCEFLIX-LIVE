import React from 'react';
import FloatingTimer from './FloatingTimer';

export default function PlayerView() {
  return (
    <div id="player-view" className="view">
        <FloatingTimer />
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
                        <input type="file" id="custom-html-file-input" accept=".html,.htm,.txt" className="hidden" />
                        <button id="add-custom-lectures-btn" className="hidden" style={{"background":"none","border":"none","color":"var(--accent-primary)","cursor":"pointer","fontSize":"0.95rem","fontWeight":"bold","transition":"color 0.2s"}} title="Import HTML File"><i className="fas fa-file-import" style={{"marginRight":"4px"}}></i> Import HTML</button>
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
                    <iframe id="custom-iframe-player" className="hidden" style={{ width: '100%', height: '100%', border: 'none', zIndex: 10, position: 'relative' }} allow="autoplay; fullscreen; encrypted-media" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"></iframe>
                    
                    <audio id="brown-noise-audio" src="brown.dat" style={{"display":"none"}} onEnded={(e) => { e.target.currentTime = 20; e.target.play(); }}></audio>
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
                                <div id="bookmarks-popover" className="hidden" style={{"position":"absolute","bottom":"100%","right":"0","marginBottom":"10px","padding":"12px 14px","borderRadius":"12px","boxShadow":"0 10px 30px rgba(0,0,0,0.5)","zIndex":"100","background":"var(--bg-secondary)","border":"1px solid var(--border-primary)","minWidth":"270px","maxWidth":"320px","color":"var(--text-primary)"}}>
                                    <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","marginBottom":"10px","paddingBottom":"8px","borderBottom":"1px solid var(--border-primary)"}}>
                                        <h4 style={{"margin":"0","fontSize":"0.95rem","fontWeight":"700","color":"var(--accent-primary)","display":"flex","alignItems":"center","gap":"6px"}}>
                                            <i className="fas fa-bookmark"></i> Lecture Bookmarks
                                        </h4>
                                    </div>
                                    <div id="bookmarks-popover-list" style={{"maxHeight":"200px","overflowY":"auto","display":"flex","flexDirection":"column","gap":"6px"}}>
                                        <div style={{"fontSize":"0.8rem","color":"var(--text-secondary)","textAlign":"center","padding":"10px 0"}}>No bookmarks saved yet. Press Z to add!</div>
                                    </div>
                                    <div style={{"marginTop":"10px","paddingTop":"8px","borderTop":"1px solid var(--border-secondary)","display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                                        <span style={{"fontSize":"0.74rem","color":"var(--text-secondary)"}}>Press <kbd style={{"background":"var(--bg-tertiary)","padding":"1px 5px","borderRadius":"4px","border":"1px solid var(--border-secondary)"}}>Z</kbd> to add</span>
                                        <button id="clear-video-bookmarks-btn" onClick={() => { if (window.clearCurrentVideoBookmarks) window.clearCurrentVideoBookmarks(); }} style={{"background":"none","border":"none","color":"var(--accent-danger)","fontSize":"0.75rem","fontWeight":"600","cursor":"pointer"}}>Clear All</button>
                                    </div>
                                </div>
                                <div id="custom-speed-popover" className="hidden" style={{"position":"absolute","bottom":"100%","right":"0","marginBottom":"10px","padding":"8px","borderRadius":"8px","boxShadow":"var(--shadow)","zIndex":"100","background":"var(--bg-secondary)","border":"1px solid var(--border-primary)","display":"flex","alignItems":"center","gap":"8px"}}>
                                    <input type="number" id="custom-speed-input" step="0.1" min="0.1" max="5.0" style={{"width":"60px","padding":"4px","textAlign":"center","borderRadius":"4px","background":"var(--bg-primary)","color":"var(--text-primary)","border":"1px solid var(--border-secondary)","outline":"none"}} />
                                    <span style={{"color":"var(--text-secondary)","fontSize":"0.85rem","marginLeft":"-4px"}}>x</span>
                                    <button id="apply-custom-speed" style={{"padding":"4px 10px","borderRadius":"4px","fontSize":"0.85rem","background":"var(--accent-primary)","color":"var(--text-on-accent)","border":"none","cursor":"pointer","fontWeight":"600"}}>Set</button>
                                </div>
                                <button className="control-btn" id="player-bookmark-btn" title="View Bookmarks (Click) / Add Bookmark (Z)" onClick={(e) => { e.stopPropagation(); e.preventDefault(); const el = document.getElementById('bookmarks-popover'); if (el) { el.classList.toggle('hidden'); if (!el.classList.contains('hidden') && window.renderBookmarks) window.renderBookmarks(); } }} style={{"marginRight":"6px","fontSize":"0.85rem","opacity":"0.85"}}><i className="fas fa-bookmark"></i></button>
                                <button className="control-btn" id="timer-btn" title="Toggle Pomodoro Timer (Enter)" onClick={(e) => { e.stopPropagation(); e.preventDefault(); window.dispatchEvent(new CustomEvent('toggle-floating-timer')); }} style={{"marginRight":"6px","fontSize":"0.85rem","opacity":"0.85"}}><i className="fas fa-stopwatch"></i></button>
                                <button className="control-btn" id="player-notes-btn" title="Class Notes PDF (Shift+N)" onClick={(e) => { e.stopPropagation(); e.preventDefault(); if (window.togglePdfViewer) window.togglePdfViewer(); }} style={{"marginRight":"6px","fontSize":"0.85rem","opacity":"0.85"}}><i className="fas fa-file-pdf"></i></button>
                                <button className="control-btn" id="player-dpp-btn" title="DPP (Shift+D)" onClick={(e) => { e.stopPropagation(); e.preventDefault(); if (window.togglePlayerDppPanel) window.togglePlayerDppPanel(); }} style={{"marginRight":"6px","fontSize":"0.85rem","opacity":"0.85"}}><i className="fas fa-book-open"></i></button>
                                <button className="control-btn" id="shortcuts-btn" title="Keyboard Shortcuts (/)" onClick={(e) => { e.stopPropagation(); e.preventDefault(); const el = document.getElementById('shortcuts-modal-overlay'); if (el) el.classList.remove('hidden'); }} style={{"marginRight":"10px","fontSize":"0.85rem","opacity":"0.85"}}><i className="fas fa-keyboard"></i></button>
                                <button className="control-btn" id="speed-btn" style={{"marginRight":"0"}}>1x</button>
                                <button className="control-btn" id="custom-speed-btn" title="Custom Speed" style={{"marginRight":"8px"}}><i className="fas fa-sliders-h" style={{"fontSize":"0.9rem"}}></i></button>
                                <button className="control-btn" id="fullscreen-btn"><i className="fas fa-expand"></i></button>
                            </div>
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
        <button id="sidebar-toggle-btn"><i className="fas fa-chevron-left"></i></button>

        {/* Lecture Player Keyboard Shortcuts Modal */}
        <div id="shortcuts-modal-overlay" className="modal-overlay hidden" style={{"zIndex":"99999"}}>
            <div className="modal-content" style={{"maxWidth":"850px","width":"92%","maxHeight":"88vh","overflowY":"auto","color":"var(--text-primary)","borderRadius":"16px","padding":"24px","boxShadow":"0 20px 40px rgba(0,0,0,0.5)","border":"1px solid var(--border-primary)"}}>
                <button className="close-modal-btn" onClick={() => { document.getElementById('shortcuts-modal-overlay').classList.add('hidden') }} style={{"position":"absolute","top":"1.2rem","right":"1.2rem","background":"rgba(255,255,255,0.05)","border":"1px solid var(--border-secondary)","borderRadius":"50%","width":"32px","height":"32px","fontSize":"1.2rem","color":"var(--text-secondary)","cursor":"pointer","display":"flex","alignItems":"center","justifyContent":"center"}} title="Close">&times;</button>
                
                <div style={{"display":"flex","alignItems":"center","justify":"space-between","gap":"12px","marginBottom":"1.2rem","borderBottom":"1px solid var(--border-primary)","paddingBottom":"0.8rem"}}>
                    <h2 style={{"margin":"0","color":"var(--accent-primary)","fontSize":"1.4rem","fontWeight":"700","display":"flex","alignItems":"center","gap":"10px"}}>
                        <i className="fas fa-keyboard" style={{"fontSize":"1.3rem"}}></i> Lecture Player Keyboard Shortcuts
                    </h2>
                    <span style={{"fontSize":"0.75rem","background":"rgba(16,185,129,0.12)","color":"var(--accent-primary)","border":"1px solid rgba(16,185,129,0.3)","padding":"3px 10px","borderRadius":"12px","fontWeight":"600"}}>Press <kbd style={{"background":"var(--bg-tertiary)","padding":"1px 5px","borderRadius":"4px","border":"1px solid var(--border-secondary)"}}>/</kbd> to toggle</span>
                </div>

                <div className="shortcuts-grid" style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit, minmax(360px, 1fr))","gap":"1.2rem","fontSize":"0.9rem"}}>
                    
                    {/* Category 1: Playback & Seek Navigation */}
                    <div className="shortcut-category-card" style={{"background":"var(--bg-secondary)","border":"1px solid var(--border-secondary)","borderRadius":"12px","padding":"14px 16px"}}>
                        <h3 style={{"margin":"0 0 10px 0","fontSize":"1rem","fontWeight":"700","color":"#38bdf8","display":"flex","alignItems":"center","gap":"8px"}}>
                            <i className="fas fa-play-circle"></i> Playback & Seek Navigation
                        </h3>
                        <div style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                                <span style={{"color":"var(--text-secondary)"}}>Play / Pause</span>
                                <kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>Space</kbd>
                            </div>
                            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                                <span style={{"color":"var(--text-secondary)"}}>Skip 30 Seconds</span>
                                <span style={{"display":"flex","gap":"4px"}}><kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>Ctrl</kbd> + <kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>&rarr;</kbd></span>
                            </div>
                            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                                <span style={{"color":"var(--text-secondary)"}}>Rewind 30 Seconds</span>
                                <span style={{"display":"flex","gap":"4px"}}><kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>Ctrl</kbd> + <kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>&larr;</kbd></span>
                            </div>
                            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                                <span style={{"color":"var(--text-secondary)"}}>Seek 10 Seconds</span>
                                <span style={{"display":"flex","gap":"4px"}}><kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>&larr;</kbd> / <kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>&rarr;</kbd></span>
                            </div>
                            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                                <span style={{"color":"var(--text-secondary)"}}>Next / Previous Lecture</span>
                                <span style={{"display":"flex","gap":"4px"}}><kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>N</kbd> / <kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>P</kbd></span>
                            </div>
                            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                                <span style={{"color":"var(--text-secondary)"}}>Volume Up / Down</span>
                                <span style={{"display":"flex","gap":"4px"}}><kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>&uarr;</kbd> / <kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>&darr;</kbd></span>
                            </div>
                            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                                <span style={{"color":"var(--text-secondary)"}}>Toggle Mute</span>
                                <kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>M</kbd>
                            </div>
                        </div>
                    </div>

                    {/* Category 2: Bookmarks & Timeline */}
                    <div className="shortcut-category-card" style={{"background":"var(--bg-secondary)","border":"1px solid var(--border-secondary)","borderRadius":"12px","padding":"14px 16px"}}>
                        <h3 style={{"margin":"0 0 10px 0","fontSize":"1rem","fontWeight":"700","color":"#f59e0b","display":"flex","alignItems":"center","gap":"8px"}}>
                            <i className="fas fa-bookmark"></i> Bookmarks & Timeline Navigation
                        </h3>
                        <div style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                                <span style={{"color":"var(--text-secondary)"}}>Add Bookmark at Timestamp</span>
                                <kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>Z</kbd>
                            </div>
                            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                                <span style={{"color":"var(--text-secondary)"}}>Cycle Between Bookmarks</span>
                                <span style={{"display":"flex","gap":"4px"}}><kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>Ctrl</kbd> + <kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>Z</kbd></span>
                            </div>
                            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                                <span style={{"color":"var(--text-secondary)"}}>Return to Main Timeline</span>
                                <span style={{"display":"flex","gap":"4px"}}><kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>Ctrl</kbd> + <kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>T</kbd></span>
                            </div>
                        </div>
                    </div>

                    {/* Category 3: Study Tools & Notes */}
                    <div className="shortcut-category-card" style={{"background":"var(--bg-secondary)","border":"1px solid var(--border-secondary)","borderRadius":"12px","padding":"14px 16px"}}>
                        <h3 style={{"margin":"0 0 10px 0","fontSize":"1rem","fontWeight":"700","color":"#10b981","display":"flex","alignItems":"center","gap":"8px"}}>
                            <i className="fas fa-graduation-cap"></i> Study Tools & Notes
                        </h3>
                        <div style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                                <span style={{"color":"var(--text-secondary)"}}>Toggle Lecture Notes Viewer</span>
                                <span style={{"display":"flex","gap":"4px"}}><kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>Shift</kbd> + <kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>N</kbd></span>
                            </div>
                            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                                <span style={{"color":"var(--text-secondary)"}}>Toggle DPP / Assignment Viewer</span>
                                <span style={{"display":"flex","gap":"4px"}}><kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>Shift</kbd> + <kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>D</kbd></span>
                            </div>
                            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                                <span style={{"color":"var(--text-secondary)"}}>Toggle Scratchpad Notes Editor</span>
                                <kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>Q</kbd>
                            </div>
                            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                                <span style={{"color":"var(--text-secondary)"}}>Capture Screenshot & Doubt</span>
                                <kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>S</kbd>
                            </div>
                            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                                <span style={{"color":"var(--text-secondary)"}}>Switch / Open Side Panel</span>
                                <span style={{"display":"flex","gap":"4px"}}><kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>Shift</kbd> + <kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>&larr;</kbd> / <kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>&rarr;</kbd></span>
                            </div>
                        </div>
                    </div>

                    {/* Category 4: Speed & Audio Controls */}
                    <div className="shortcut-category-card" style={{"background":"var(--bg-secondary)","border":"1px solid var(--border-secondary)","borderRadius":"12px","padding":"14px 16px"}}>
                        <h3 style={{"margin":"0 0 10px 0","fontSize":"1rem","fontWeight":"700","color":"#a855f7","display":"flex","alignItems":"center","gap":"8px"}}>
                            <i className="fas fa-tachometer-alt"></i> Speed & Audio Controls
                        </h3>
                        <div style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                                <span style={{"color":"var(--text-secondary)"}}>Speed Up / Down (+/- 0.1x)</span>
                                <span style={{"display":"flex","gap":"4px"}}><kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>C</kbd> / <kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>X</kbd></span>
                            </div>
                            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                                <span style={{"color":"var(--text-secondary)"}}>Cycle Preset Speeds</span>
                                <span style={{"display":"flex","gap":"4px"}}><kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>[</kbd> / <kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>]</kbd></span>
                            </div>
                            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                                <span style={{"color":"var(--text-secondary)"}}>Toggle Focus Brown Noise</span>
                                <kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>B</kbd>
                            </div>
                            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                                <span style={{"color":"var(--text-secondary)"}}>Brown Noise Volume</span>
                                <span style={{"display":"flex","gap":"4px"}}><kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>PgUp</kbd> / <kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>PgDn</kbd></span>
                            </div>
                        </div>
                    </div>

                    {/* Category 5: General & Interface */}
                    <div className="shortcut-category-card" style={{"background":"var(--bg-secondary)","border":"1px solid var(--border-secondary)","borderRadius":"12px","padding":"14px 16px"}}>
                        <h3 style={{"margin":"0 0 10px 0","fontSize":"1rem","fontWeight":"700","color":"#ec4899","display":"flex","alignItems":"center","gap":"8px"}}>
                            <i className="fas fa-desktop"></i> Interface & General
                        </h3>
                        <div style={{"display":"flex","flexDirection":"column","gap":"8px"}}>
                            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                                <span style={{"color":"var(--text-secondary)"}}>Toggle Fullscreen Mode</span>
                                <kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>F</kbd>
                            </div>
                            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                                <span style={{"color":"var(--text-secondary)"}}>Close Panels / Exit Fullscreen</span>
                                <kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>Esc</kbd>
                            </div>
                            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                                <span style={{"color":"var(--text-secondary)"}}>Open Shortcuts Menu</span>
                                <kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>/</kbd>
                            </div>
                            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                                <span style={{"color":"var(--text-secondary)"}}>Toggle Floating Timer (Pomodoro / Stopwatch)</span>
                                <kbd style={{"background":"var(--bg-tertiary)","padding":"3px 8px","borderRadius":"5px","border":"1px solid var(--border-secondary)","fontWeight":"600"}}>Enter</kbd>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    </div>
  );
}
