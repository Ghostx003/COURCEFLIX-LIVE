import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getLectureProgress, saveLectureProgress } from '../../services/progressService.js';
import { saveCourse } from '../../services/courseService.js';
import { showToast, formatTime, formatExactTime } from '../../services/utils.js';

function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes) || bytes <= 0) return 'Unknown size';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function LectureContextMenuModal() {
  const [menuState, setMenuState] = useState({
    visible: false,
    x: 0,
    y: 0,
    lectureId: null,
    courseId: null,
    lecture: null,
    course: null
  });

  const [activeModal, setActiveModal] = useState(null); // 'location' | 'info' | 'delete' | null
  const [modalDetails, setModalDetails] = useState({
    title: '',
    fileName: '',
    fileSize: '',
    dateCreated: '',
    duration: '',
    chapter: '',
    status: '',
    bookmarksCount: 0,
    progressText: '',
    relativePath: ''
  });

  const menuRef = useRef(null);

  // Close context menu handler
  const closeContextMenu = useCallback(() => {
    setMenuState((prev) => (prev.visible ? { ...prev, visible: false } : prev));
  }, []);

  // Global listeners to dismiss menu
  useEffect(() => {
    if (!menuState.visible) return;

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        closeContextMenu();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeContextMenu();
      }
    };

    const handleScrollOrResize = () => {
      closeContextMenu();
    };

    window.addEventListener('mousedown', handleClickOutside, true);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      window.removeEventListener('mousedown', handleClickOutside, true);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [menuState.visible, closeContextMenu]);

  // Context menu listener on lecture items
  useEffect(() => {
    const handleContextMenu = (e) => {
      const lectureLi = e.target.closest('#chapter-list li, .lecture-item');
      if (!lectureLi) return;

      // Ensure click is within chapter list or a lecture item
      const lectureId = lectureLi.dataset.lectureId;
      if (!lectureId) return;

      e.preventDefault();
      e.stopPropagation();

      const courseIdOverride = lectureLi.dataset.courseId;
      const allCourses = window.courses || [];
      const currentCourse = window.currentCourse || (window.courses || []).find((c) => String(c.id) === String(window.currentCourseId));

      const course = courseIdOverride
        ? allCourses.find((c) => String(c.id) === String(courseIdOverride))
        : currentCourse;

      let lecture = null;
      if (course && Array.isArray(course.lectures)) {
        lecture = course.lectures.find((l) => String(l.id) === String(lectureId));
      }
      if (!lecture && course && Array.isArray(course.chapters)) {
        for (const ch of course.chapters) {
          const found = ch.lectures?.find((l) => String(l.id) === String(lectureId));
          if (found) {
            lecture = found;
            break;
          }
        }
      }

      // Fallback lecture object if not found in list
      if (!lecture) {
        const titleEl = lectureLi.querySelector('.lecture-title');
        lecture = {
          id: lectureId,
          displayName: titleEl ? titleEl.textContent.trim() : `Lecture ${lectureId}`,
          name: titleEl ? titleEl.textContent.trim() : `Lecture ${lectureId}`,
          duration: 0,
          chapter: 'Lectures'
        };
      }

      // Constrain position within viewport
      const menuWidth = 230;
      const menuHeight = 220;
      let posX = e.clientX;
      let posY = e.clientY;

      if (posX + menuWidth > window.innerWidth) {
        posX = Math.max(10, window.innerWidth - menuWidth - 14);
      }
      if (posY + menuHeight > window.innerHeight) {
        posY = Math.max(10, window.innerHeight - menuHeight - 14);
      }

      setMenuState({
        visible: true,
        x: posX,
        y: posY,
        lectureId,
        courseId: course?.id || null,
        lecture,
        course
      });
    };

    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  // Helper to resolve lecture file and progress metadata
  const extractDetails = async (lecture, course) => {
    let fileSizeStr = 'Unknown';
    let dateCreatedStr = 'Unknown';
    const fileName = lecture.handle?.name || lecture.name || lecture.displayName || 'lecture.mp4';
    const relativePath = `${lecture.chapter ? lecture.chapter + '/' : ''}${fileName}`;

    if (lecture.handle && typeof lecture.handle.getFile === 'function') {
      try {
        const file = await lecture.handle.getFile();
        if (file) {
          fileSizeStr = formatFileSize(file.size);
          dateCreatedStr = new Date(file.lastModified).toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });
        }
      } catch (err) {
        console.warn('[LectureContextMenu] Could not read file handle:', err);
      }
    }

    const courseId = course?.id || window.currentCourse?.id;
    const progress = getLectureProgress(courseId, lecture.id);
    const bookmarksCount = (progress.bookmarks || []).length;
    const durationStr = formatExactTime(lecture.duration);
    const statusText = progress.completed
      ? 'Completed'
      : progress.status
      ? progress.status.toUpperCase()
      : 'In Progress';
    const progressText = `${formatTime(progress.currentTime || 0)} / ${formatTime(lecture.duration || 0)}`;

    return {
      title: lecture.displayName || lecture.name || 'Lecture',
      fileName,
      fileSize: fileSizeStr,
      dateCreated: dateCreatedStr,
      duration: durationStr,
      chapter: lecture.chapter || 'Main Content',
      status: statusText,
      bookmarksCount,
      progressText,
      relativePath
    };
  };

  // Triggers Windows protocol handler silently in background without persistent servers
  const triggerProtocol = (action, params) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = `courseflix://${action}?${queryString}`;
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = url;
      document.body.appendChild(iframe);
      setTimeout(() => iframe.remove(), 2500);
    } catch {
      // Ignore
    }
  };

  // Option 1: Open file location
  const handleOpenLocation = async () => {
    const { lecture, course } = menuState;
    closeContextMenu();
    if (!lecture) return;

    const details = await extractDetails(lecture, course);
    setModalDetails(details);

    // Silently launch Windows File Explorer via registered protocol
    triggerProtocol('reveal', { file: details.fileName, path: details.relativePath });
    showToast(`Opening "${details.fileName}" in File Explorer...`);
    setActiveModal('location');
  };

  // Option 2: Remove all bookmarks from this lecture
  const handleClearBookmarks = async () => {
    const { lecture, course } = menuState;
    closeContextMenu();
    if (!lecture) return;

    const courseId = course?.id || window.currentCourse?.id;
    const progress = getLectureProgress(courseId, lecture.id);
    const count = (progress.bookmarks || []).length;

    if (count === 0) {
      showToast(`No bookmarks saved for "${lecture.displayName}"`);
      return;
    }

    await saveLectureProgress({
      ...progress,
      courseId,
      lectureId: lecture.id,
      bookmarks: []
    });

    // If currently playing in player, update bookmarks UI
    if (window.renderBookmarks) {
      window.renderBookmarks();
    }
    const bookmarksContainer = document.getElementById('bookmarks-container');
    if (bookmarksContainer) bookmarksContainer.innerHTML = '';
    const popoverList = document.getElementById('bookmarks-popover-list');
    if (popoverList) {
      popoverList.innerHTML = '<div style="font-size:0.8rem;color:var(--text-secondary);text-align:center;padding:10px 0;">No bookmarks saved yet. Press Z to add!</div>';
    }

    showToast(`Removed all ${count} bookmark${count > 1 ? 's' : ''} from "${lecture.displayName}"`);
  };

  // Option 3: Info (size of file, date created, duration, etc.)
  const handleShowInfo = async () => {
    const { lecture, course } = menuState;
    closeContextMenu();
    if (!lecture) return;

    const details = await extractDetails(lecture, course);
    setModalDetails(details);
    setActiveModal('info');
  };

  // Option 4: Share (Quick Share / Windows Native Share via Web Share API)
  const handleShareLecture = async () => {
    const { lecture, course } = menuState;
    closeContextMenu();
    if (!lecture) return;

    try {
      // If file handle is available, attempt native file share (which launches Windows Quick Share / Nearby Share)
      if (lecture.handle && typeof lecture.handle.getFile === 'function' && navigator.canShare) {
        const file = await lecture.handle.getFile();
        if (file && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: lecture.displayName,
            text: `CourseFlix: ${lecture.displayName}`
          });
          return;
        }
      }

      // If file sharing is not supported or file is too large for browser share sheet
      if (navigator.share) {
        await navigator.share({
          title: lecture.displayName,
          text: `CourseFlix Lecture: ${lecture.displayName} (${formatTime(lecture.duration)})`
        });
      } else {
        // Fallback: copy details
        await navigator.clipboard.writeText(`${course?.title || 'Course'} - ${lecture.displayName}`);
        showToast(`Copied "${lecture.displayName}" details to clipboard!`);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('[LectureContextMenu] Share error:', err);
        showToast('Browser share limit or quick share not supported for this file size');
      }
    }
  };

  // Option 5: Delete lecture
  const handleDeleteLecturePrompt = async () => {
    const { lecture, course } = menuState;
    closeContextMenu();
    if (!lecture) return;

    const details = await extractDetails(lecture, course);
    setModalDetails(details);
    setActiveModal('delete');
  };

  // Confirm delete lecture
  const confirmDeleteLecture = async () => {
    const { lecture, course } = menuState;
    setActiveModal(null);
    if (!lecture || !course) return;

    try {
      // Filter out lecture from course
      if (Array.isArray(course.lectures)) {
        course.lectures = course.lectures.filter((l) => String(l.id) !== String(lecture.id));
        course.videoCount = course.lectures.length;
      }
      if (Array.isArray(course.chapters)) {
        course.chapters.forEach((chapter) => {
          if (Array.isArray(chapter.lectures)) {
            chapter.lectures = chapter.lectures.filter((l) => String(l.id) !== String(lecture.id));
          }
        });
      }

      await saveCourse(course);

      // Re-render syllabus list if in player view
      if (window.renderChapterList && course.chapters) {
        window.renderChapterList(course.chapters);
      } else if (typeof window.renderPlayer === 'function' && window.currentCourse?.id === course.id) {
        window.renderPlayer(course.id, null, window.lastView || 'dashboard-view');
      } else {
        // Remove DOM element directly
        const el = document.querySelector(`li[data-lecture-id="${CSS.escape(lecture.id)}"]`);
        if (el) el.remove();
      }

      // Silently move to Windows Recycle Bin via protocol handler
      triggerProtocol('recycle', { file: modalDetails.fileName, path: modalDetails.relativePath });
      showToast(`Removed "${lecture.displayName}" and moved to Recycle Bin`);
    } catch (err) {
      console.error('[LectureContextMenu] Delete error:', err);
      showToast('Error removing lecture from course', true);
    }
  };

  const copyToClipboard = async (text, successMsg) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(successMsg);
    } catch {
      showToast('Failed to copy to clipboard', true);
    }
  };

  return (
    <>
      {/* Context Menu Floating Popup */}
      {menuState.visible && (
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: `${menuState.y}px`,
            left: `${menuState.x}px`,
            zIndex: 999999,
            minWidth: '220px',
            backgroundColor: 'var(--bg-secondary, #161b26)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--border-secondary, rgba(255, 255, 255, 0.12))',
            borderRadius: '12px',
            padding: '6px',
            boxShadow: '0 14px 40px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            animation: 'fadeInMenu 0.15s ease-out'
          }}
        >
          {/* Header with lecture title snippet */}
          <div
            style={{
              padding: '6px 10px 8px 10px',
              fontSize: '0.74rem',
              fontWeight: 700,
              color: 'var(--text-secondary, #8b949e)',
              borderBottom: '1px solid var(--border-primary, rgba(255, 255, 255, 0.08))',
              marginBottom: '4px',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              whiteSpace: 'nowrap'
            }}
            title={menuState.lecture?.displayName}
          >
            {menuState.lecture?.displayName || 'Lecture Actions'}
          </div>

          {/* Option 1: Open file location */}
          <button
            type="button"
            className="context-menu-item"
            onClick={handleOpenLocation}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 10px',
              background: 'transparent',
              border: 'none',
              borderRadius: '8px',
              color: 'var(--text-primary, #ffffff)',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background-color 0.15s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-tertiary, #212631)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <i className="fas fa-folder-open" style={{ color: 'var(--accent-primary, #10b981)', width: '16px' }}></i>
            <span>Open File Location</span>
          </button>

          {/* Option 2: Remove all bookmarks from this lecture */}
          <button
            type="button"
            className="context-menu-item"
            onClick={handleClearBookmarks}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 10px',
              background: 'transparent',
              border: 'none',
              borderRadius: '8px',
              color: 'var(--text-primary, #ffffff)',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background-color 0.15s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-tertiary, #212631)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <i className="fas fa-bookmark" style={{ color: '#f59e0b', width: '16px' }}></i>
            <span>Clear All Bookmarks</span>
          </button>

          {/* Option 3: Info */}
          <button
            type="button"
            className="context-menu-item"
            onClick={handleShowInfo}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 10px',
              background: 'transparent',
              border: 'none',
              borderRadius: '8px',
              color: 'var(--text-primary, #ffffff)',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background-color 0.15s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-tertiary, #212631)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <i className="fas fa-circle-info" style={{ color: '#3b82f6', width: '16px' }}></i>
            <span>Lecture Info</span>
          </button>

          {/* Option 4: Share (Quick Share) */}
          <button
            type="button"
            className="context-menu-item"
            onClick={handleShareLecture}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 10px',
              background: 'transparent',
              border: 'none',
              borderRadius: '8px',
              color: 'var(--text-primary, #ffffff)',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background-color 0.15s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-tertiary, #212631)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <i className="fas fa-share-nodes" style={{ color: '#8b5cf6', width: '16px' }}></i>
            <span>Share Lecture</span>
          </button>

          <hr style={{ margin: '4px 0', border: 'none', borderTop: '1px solid var(--border-primary, rgba(255, 255, 255, 0.08))' }} />

          {/* Option 5: Delete */}
          <button
            type="button"
            className="context-menu-item"
            onClick={handleDeleteLecturePrompt}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 10px',
              background: 'transparent',
              border: 'none',
              borderRadius: '8px',
              color: 'var(--accent-danger, #ef4444)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background-color 0.15s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.12)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <i className="fas fa-trash-alt" style={{ color: 'var(--accent-danger, #ef4444)', width: '16px' }}></i>
            <span>Delete Lecture</span>
          </button>
        </div>
      )}

      {/* Modal 1: Open File Location Modal */}
      {activeModal === 'location' && (
        <div className="modal-overlay" style={{ zIndex: 1000000, display: 'flex' }}>
          <div className="modal-content" style={{ maxWidth: '480px', width: '92%', borderRadius: '16px', padding: '24px' }}>
            <button
              className="close-modal-btn"
              onClick={() => setActiveModal(null)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', fontSize: '1.5rem', color: 'var(--text-secondary)', cursor: 'pointer' }}
              title="Close"
            >
              &times;
            </button>
            <h2 style={{ marginBottom: '1rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fas fa-folder-open"></i> File Location
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px' }}>
              <div style={{ background: 'var(--bg-tertiary, #1f2430)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-secondary)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>Relative Course Path</div>
                <div style={{ fontSize: '0.92rem', color: 'var(--text-primary)', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                  {modalDetails.relativePath}
                </div>
              </div>

              <div style={{ background: 'var(--bg-tertiary, #1f2430)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-secondary)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>File Name</div>
                <div style={{ fontSize: '0.92rem', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                  {modalDetails.fileName}
                </div>
              </div>

              {/* Browser Sandbox Limitation Notice */}
              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'flex-start',
                  fontSize: '0.82rem',
                  color: '#fbbf24',
                  lineHeight: '1.45'
                }}
              >
                <i className="fas fa-shield-halved" style={{ fontSize: '1rem', marginTop: '2px', flexShrink: 0 }}></i>
                <div>
                  <strong>Browser Sandbox Policy:</strong> Web browsers (Google Chrome) strictly prevent websites from executing system commands to launch Windows File Explorer (<code>explorer.exe</code>) directly. You can locate this file in your course directory using the path above.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => triggerProtocol('reveal', { file: modalDetails.fileName, path: modalDetails.relativePath })}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <i className="fas fa-folder-open"></i> Open in Explorer
              </button>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => copyToClipboard(modalDetails.relativePath, 'Copied relative path to clipboard!')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <i className="fas fa-copy"></i> Copy Path
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={() => setActiveModal(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Lecture Info Modal */}
      {activeModal === 'info' && (
        <div className="modal-overlay" style={{ zIndex: 1000000, display: 'flex' }}>
          <div className="modal-content" style={{ maxWidth: '520px', width: '92%', borderRadius: '16px', padding: '24px' }}>
            <button
              className="close-modal-btn"
              onClick={() => setActiveModal(null)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', fontSize: '1.5rem', color: 'var(--text-secondary)', cursor: 'pointer' }}
              title="Close"
            >
              &times;
            </button>
            <h2 style={{ marginBottom: '1.2rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fas fa-circle-info"></i> Lecture Information
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '20px' }}>
              <div style={{ background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-secondary)', gridColumn: 'span 2' }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Lecture Title</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>{modalDetails.title}</div>
              </div>

              <div style={{ background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-secondary)' }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>File Size</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--accent-primary)', marginTop: '2px' }}>{modalDetails.fileSize}</div>
              </div>

              <div style={{ background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-secondary)' }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Duration</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>{modalDetails.duration}</div>
              </div>

              <div style={{ background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-secondary)', gridColumn: 'span 2' }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Date Modified / Created</div>
                <div style={{ fontSize: '0.92rem', color: 'var(--text-primary)', marginTop: '2px' }}>{modalDetails.dateCreated}</div>
              </div>

              <div style={{ background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-secondary)' }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Chapter / Folder</div>
                <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', marginTop: '2px' }}>{modalDetails.chapter}</div>
              </div>

              <div style={{ background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-secondary)' }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Saved Bookmarks</div>
                <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', marginTop: '2px' }}>{modalDetails.bookmarksCount} saved</div>
              </div>

              <div style={{ background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-secondary)', gridColumn: 'span 2' }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Watch Progress</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginTop: '2px' }}>{modalDetails.progressText} ({modalDetails.status})</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="primary-btn"
                onClick={() => setActiveModal(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Delete Lecture Confirmation Modal */}
      {activeModal === 'delete' && (
        <div className="modal-overlay" style={{ zIndex: 1000000, display: 'flex' }}>
          <div className="modal-content" style={{ maxWidth: '480px', width: '92%', borderRadius: '16px', padding: '24px' }}>
            <button
              className="close-modal-btn"
              onClick={() => setActiveModal(null)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', fontSize: '1.5rem', color: 'var(--text-secondary)', cursor: 'pointer' }}
              title="Close"
            >
              &times;
            </button>
            <h2 style={{ marginBottom: '1rem', color: 'var(--accent-danger)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fas fa-trash-alt"></i> Delete Lecture
            </h2>

            <p style={{ color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: '1.5', margin: '0 0 20px 0' }}>
              Are you sure you want to delete <strong>"{modalDetails.title}"</strong>? This will remove the lecture from CourseFlix and send the video file directly to your <strong>Windows Recycle Bin</strong>.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setActiveModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={confirmDeleteLecture}
                style={{ backgroundColor: 'var(--accent-danger, #ef4444)', borderColor: 'var(--accent-danger, #ef4444)' }}
              >
                <i className="fas fa-trash-alt" style={{ marginRight: '6px' }}></i> Delete to Recycle Bin
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
