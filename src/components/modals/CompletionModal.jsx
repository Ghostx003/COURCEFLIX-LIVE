import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';

function AdviceBanner({ bg, border, color, icon, title, text, onDismiss, extraContent }) {
  const [hoverTimer, setHoverTimer] = useState(null);
  const [showDeleteBtn, setShowDeleteBtn] = useState(false);

  const handleMouseEnter = () => {
    const timer = setTimeout(() => {
      setShowDeleteBtn(true);
    }, 2000);
    setHoverTimer(timer);
  };

  const handleMouseLeave = () => {
    if (hoverTimer) clearTimeout(hoverTimer);
    setShowDeleteBtn(false);
  };

  return (
    <div 
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        background: bg,
        border: border,
        borderRadius: '12px',
        padding: '12px 16px',
        fontSize: '0.85rem',
        color: color,
        fontWeight: 600,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '12px',
        position: 'relative',
        transition: 'all 0.25s ease'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.92rem', fontWeight: 800 }}>
          <i className={icon}></i> {title}
        </div>
        <div>{text}</div>
        {extraContent}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {showDeleteBtn && (
          <button
            type="button"
            onClick={onDismiss}
            style={{
              background: 'rgba(139, 92, 246, 0.2)',
              color: '#c084fc',
              border: '1px solid rgba(139, 92, 246, 0.4)',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)'
            }}
          >
            <i className="fas fa-trash-alt" style={{ marginRight: '4px' }}></i> Remove Advice
          </button>
        )}

        <button
          type="button"
          onClick={onDismiss}
          style={{
            background: 'rgba(255,255,255,0.12)',
            border: 'none',
            color: color,
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            cursor: 'pointer',
            fontSize: '1rem',
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}
          title="Dismiss Advice"
        >
          &times;
        </button>
      </div>
    </div>
  );
}

export default function CompletionModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [groups, setGroups] = useState([]);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [allCourses, setAllCourses] = useState([]);
  const [courseProgressMap, setCourseProgressMap] = useState({});
  const [logs, setLogs] = useState([]);
  const [showCoursePicker, setShowCoursePicker] = useState(false);
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const [isEditingGroupName, setIsEditingGroupName] = useState(false);
  const [editingNameValue, setEditingNameValue] = useState('');
  const [dismissedBanners, setDismissedBanners] = useState({});
  
  const canvasRef = useRef(null);
  const targetDateInputRef = useRef(null);
  const delayDateInputRef = useRef(null);

  const triggerDatePicker = (ref) => {
    if (ref && ref.current) {
      if (typeof ref.current.showPicker === 'function') {
        try {
          ref.current.showPicker();
        } catch (e) {
          ref.current.click();
        }
      } else {
        ref.current.click();
      }
    }
  };

  const handleDismissBanner = (key) => {
    setDismissedBanners(prev => ({ ...prev, [key]: true }));
  };

  const handleResetBanner = (key) => {
    setDismissedBanners(prev => ({ ...prev, [key]: false }));
  };

  // Sorting state for Subjects table (Ascending / Descending)
  const [sortConfig, setSortConfig] = useState({ key: 'quota', dir: 'desc' });

  const handleSort = (key) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
      }
      return { key, dir: 'asc' };
    });
  };

  // Load courses and progress from IndexedDB & LocalStorage
  const refreshData = async () => {
    if (window.courses && Array.isArray(window.courses) && window.courses.length > 0) {
      setAllCourses(window.courses);
    }

    try {
      // 1. Fetch courses from IndexedDB
      const request = indexedDB.open('CourseFlixDB');
      request.onsuccess = (e) => {
        const db = e.target.result;
        db.onversionchange = () => { try { db.close(); } catch (err) {} };
        let pending = 0;
        const checkDone = () => {
          pending--;
          if (pending <= 0) {
            try { db.close(); } catch (err) {}
          }
        };

        if (db.objectStoreNames.contains('courses')) {
          pending++;
          const tx = db.transaction('courses', 'readonly');
          const store = tx.objectStore('courses');
          const getAllReq = store.getAll();
          getAllReq.onsuccess = () => {
            const fetched = getAllReq.result || [];
            if (fetched.length > 0) {
              setAllCourses(fetched);
            } else if (window.courses && Array.isArray(window.courses) && window.courses.length > 0) {
              setAllCourses(window.courses);
            }
            checkDone();
          };
          getAllReq.onerror = () => checkDone();
        }

        if (db.objectStoreNames.contains('progress')) {
          pending++;
          const txProg = db.transaction('progress', 'readonly');
          const storeProg = txProg.objectStore('progress');
          const getProgReq = storeProg.getAll();
          getProgReq.onsuccess = () => {
            const progMap = {};
            (getProgReq.result || []).forEach(p => {
              progMap[p.id] = p;
            });
            setCourseProgressMap(progMap);
            checkDone();
          };
          getProgReq.onerror = () => checkDone();
        }

        if (pending === 0) {
          try { db.close(); } catch (err) {}
        }
      };
    } catch (err) {
      console.error('Error fetching CourseFlixDB data:', err);
    }

    // Load logs from localStorage
    try {
      const storedLogs = JSON.parse(localStorage.getItem('courseflix_logs') || '[]');
      setLogs(storedLogs);
    } catch (e) {
      console.error('Error parsing courseflix_logs', e);
    }
  };

  // Load saved groups on mount & setup event listeners
  useEffect(() => {
    const savedGroups = localStorage.getItem('courseflix_completion_groups');
    let parsed = [];
    if (savedGroups) {
      try {
        parsed = JSON.parse(savedGroups);
      } catch (e) {
        parsed = [];
      }
    }
    if (parsed.length === 0) {
      // Create initial Group 1 if none exist
      const defaultGroup = {
        id: 'group_' + Date.now(),
        name: 'BASICS',
        selectedCourseIds: [],
        mode: 'custom_pace', // 'custom_pace' or 'target_date'
        targetDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        customDailyLectures: {}, // courseId -> number of lectures
        defaultDailyLectures: 4,
        bufferDays: 0,
        weekendBuffer: 'none' // 'none', 'sundays', 'saturdays', 'weekends'
      };
      parsed = [defaultGroup];
      localStorage.setItem('courseflix_completion_groups', JSON.stringify(parsed));
    }
    setGroups(parsed);
    if (parsed.length > 0) {
      setActiveGroupId(parsed[0].id);
    }

    refreshData();

    const handleOpen = () => {
      refreshData();
      setIsOpen(true);
    };

    const handleCoursesLoaded = (e) => {
      if (e.detail && Array.isArray(e.detail) && e.detail.length > 0) {
        setAllCourses(e.detail);
      }
    };

    window.addEventListener('open-completion-modal', handleOpen);
    window.addEventListener('courseflix:progress-updated', refreshData);
    window.addEventListener('courseflix:courses-loaded', handleCoursesLoaded);

    return () => {
      window.removeEventListener('open-completion-modal', handleOpen);
      window.removeEventListener('courseflix:progress-updated', refreshData);
      window.removeEventListener('courseflix:courses-loaded', handleCoursesLoaded);
    };
  }, []);

  // Auto-assign available courses to groups if empty
  useEffect(() => {
    if (allCourses.length > 0 && groups.length > 0) {
      let changed = false;
      const updated = groups.map(g => {
        if (!g.selectedCourseIds || g.selectedCourseIds.length === 0) {
          changed = true;
          return { ...g, selectedCourseIds: allCourses.map(c => c.id) };
        }
        return g;
      });
      if (changed) {
        saveGroupsToStorage(updated);
      }
    }
  }, [allCourses]);

  // Save groups to localStorage whenever groups change
  const saveGroupsToStorage = (updatedGroups) => {
    setGroups(updatedGroups);
    localStorage.setItem('courseflix_completion_groups', JSON.stringify(updatedGroups));
    window.dispatchEvent(new Event('completion_groups_updated'));
  };

  const activeGroup = useMemo(() => {
    return groups.find(g => g.id === activeGroupId) || groups[0] || null;
  }, [groups, activeGroupId]);

  // Set of course IDs assigned to OTHER groups (Exclusivity Rule)
  const otherGroupsAssignedCourseIds = useMemo(() => {
    const assigned = new Set();
    groups.forEach(g => {
      if (g.id !== activeGroupId) {
        (g.selectedCourseIds || []).forEach(cid => assigned.add(cid));
      }
    });
    return assigned;
  }, [groups, activeGroupId]);

  // Create a new group
  const handleCreateGroup = () => {
    const newNum = groups.length + 1;
    const newGroup = {
      id: 'group_' + Date.now(),
      name: `Group ${newNum}`,
      selectedCourseIds: [],
      mode: 'custom_pace',
      targetDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      customDailyLectures: {},
      defaultDailyLectures: 4,
      bufferDays: 0,
      weekendBuffer: 'none'
    };
    const updated = [...groups, newGroup];
    saveGroupsToStorage(updated);
    setActiveGroupId(newGroup.id);
  };

  // Delete current group
  const handleDeleteGroup = (groupId) => {
    if (groups.length <= 1) {
      alert('You must have at least one group.');
      return;
    }
    if (window.confirm('Are you sure you want to delete this group?')) {
      const updated = groups.filter(g => g.id !== groupId);
      saveGroupsToStorage(updated);
      setActiveGroupId(updated[0].id);
    }
  };

  // Rename active group
  const handleSaveGroupName = () => {
    if (!editingNameValue.trim() || !activeGroup) return;
    const updated = groups.map(g => {
      if (g.id === activeGroup.id) {
        return { ...g, name: editingNameValue.trim() };
      }
      return g;
    });
    saveGroupsToStorage(updated);
    setIsEditingGroupName(false);
  };

  // Update active group properties
  const updateActiveGroup = (patch) => {
    if (!activeGroup) return;
    if (patch.mode) {
      handleResetBanner(activeGroup.id + '_together');
    }
    if (patch.startOffsetDays !== undefined) {
      handleResetBanner(activeGroup.id + '_delay');
    }
    if (patch.targetDate !== undefined) {
      handleResetBanner(activeGroup.id + '_together');
    }
    const updated = groups.map(g => {
      if (g.id === activeGroup.id) {
        return { ...g, ...patch };
      }
      return g;
    });
    saveGroupsToStorage(updated);
  };

  // Add / Remove courses to active group
  const toggleCourseInActiveGroup = (courseId) => {
    if (!activeGroup) return;
    const currentList = activeGroup.selectedCourseIds || [];
    let updatedList;
    if (currentList.includes(courseId)) {
      updatedList = currentList.filter(id => id !== courseId);
    } else {
      updatedList = [...currentList, courseId];
    }
    updateActiveGroup({ selectedCourseIds: updatedList });
  };

  // Set custom daily lectures for a specific course inside active group
  const handleCourseDailyLecturesChange = (courseId, val) => {
    if (!activeGroup) return;
    const num = Math.max(1, parseInt(val) || 1);
    const updatedMap = { ...(activeGroup.customDailyLectures || {}), [courseId]: num };
    updateActiveGroup({ customDailyLectures: updatedMap });
  };

  // Generate Today's Goal Playlist and overwrite existing goals playlist
  const handleMakeTodaysGoal = () => {
    if (!groupStats || !groupStats.subjectDetails || groupStats.subjectDetails.length === 0) {
      alert("Please add at least one subject to this group first.");
      return;
    }

    const playlist = [];

    groupStats.subjectDetails.forEach(item => {
      const course = item.course;
      if (item.remLec <= 0) return;

      let quota = 0;
      if (activeGroup.mode === 'complete_together') {
        quota = item.requiredLecTogether;
      } else if (activeGroup.mode === 'target_date') {
        quota = item.requiredLecForTarget;
      } else {
        quota = item.dailyRate;
      }

      if (quota <= 0) return;

      const activeLecs = getActiveLectures(course);
      const uncompletedLecs = activeLecs.filter(lec => {
        const progId = `${course.id}_${lec.id}`;
        return !courseProgressMap[progId]?.completed;
      });

      const selected = uncompletedLecs.slice(0, quota);
      selected.forEach((lec, idx) => {
        playlist.push({
          courseId: course.id,
          courseTitle: course.title || course.name || 'Untitled Course',
          lectureId: lec.id,
          title: lec.title || lec.name || lec.displayName || `Lecture ${idx + 1}`,
          duration: lec.duration || 3600,
          chName: lec.chapter || undefined,
          facultyName: course.facultyName || 'Unknown Faculty'
        });
      });
    });

    if (playlist.length === 0) {
      alert("All subjects in this group are already completed! No remaining lectures for Today's Goal.");
      return;
    }

    // Replace existing goal playlist in localStorage
    localStorage.setItem('courseflix_goals_playlist', JSON.stringify(playlist));

    // Close Completion Modal
    setIsOpen(false);

    // Switch view to Goals view (#goals-view)
    const goalsNavLink = document.querySelector('[data-view="goals-view"]');
    if (goalsNavLink) {
      goalsNavLink.click();
    } else {
      window.location.hash = 'goals-view';
    }

    // Refresh Goals iframe if present
    setTimeout(() => {
      const iframe = document.getElementById('goals-iframe');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.location.reload();
      }
    }, 150);
  };

  // Helpers to filter out ignored subfolders and ignored lectures according to CourseFlix settings
  const isLectureIgnored = (course, lecture) => {
    if (course.isIgnored) return true;
    if (!lecture) return false;
    if (course.subCourseData) {
      for (const sub of Object.keys(course.subCourseData)) {
        if (course.subCourseData[sub]?.isIgnored && (lecture.chapter === sub || (lecture.chapter && lecture.chapter.startsWith(sub + '/')))) {
          return true;
        }
      }
    }
    return false;
  };

  const getActiveLectures = (course) => {
    if (course.isIgnored) return [];
    const lectures = course.lectures || [];
    return lectures.filter(lec => !isLectureIgnored(course, lec));
  };

  // Helper to format date strings/objects into ordinal format e.g. "8th August 2026"
  const formatOrdinalDate = (dateInput) => {
    if (!dateInput) return '';
    let dateObj;
    if (typeof dateInput === 'string') {
      const parts = dateInput.split('-');
      if (parts.length === 3) {
        dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      } else {
        dateObj = new Date(dateInput);
      }
    } else {
      dateObj = new Date(dateInput);
    }
    
    if (isNaN(dateObj.getTime())) return String(dateInput);

    const day = dateObj.getDate();
    const month = dateObj.toLocaleString('en-US', { month: 'long' });
    const year = dateObj.getFullYear();

    let suffix = 'th';
    if (day % 10 === 1 && day !== 11) suffix = 'st';
    else if (day % 10 === 2 && day !== 12) suffix = 'nd';
    else if (day % 10 === 3 && day !== 13) suffix = 'rd';

    return `${day}${suffix} ${month} ${year}`;
  };

  // Calculation Engine & Subject Stats
  const groupStats = useMemo(() => {
    if (!activeGroup) return null;

    const selectedCourses = allCourses.filter(c => (activeGroup.selectedCourseIds || []).includes(c.id));

    let totalGroupLectures = 0;
    let completedGroupLectures = 0;
    let totalGroupDurationSec = 0;
    let remainingGroupDurationSec = 0;

    const subjectBreakdown = selectedCourses.map(course => {
      const activeLectures = getActiveLectures(course);
      const totalLec = activeLectures.length || (course.isIgnored ? 0 : (course.videoCount || 0));
      let compLec = 0;
      let durationSec = 0;
      let remDurationSec = 0;

      if (activeLectures.length > 0) {
        activeLectures.forEach(lec => {
          const lecDuration = lec.duration || 3600;
          durationSec += lecDuration;
          const progId = `${course.id}_${lec.id}`;
          const prog = courseProgressMap[progId];
          if (prog && prog.completed) {
            compLec++;
          } else {
            remDurationSec += lecDuration;
          }
        });
      } else if (!course.isIgnored && course.videoCount) {
        // Fallback progress if lectures array isn't populated
        durationSec = course.totalDuration || 0;
        compLec = Math.round((course.completionPercentage || 0) * course.videoCount / 100);
        remDurationSec = Math.max(0, durationSec * (1 - (compLec / course.videoCount)));
      }

      const remLec = Math.max(0, totalLec - compLec);

      totalGroupLectures += totalLec;
      completedGroupLectures += compLec;
      totalGroupDurationSec += durationSec;
      remainingGroupDurationSec += remDurationSec;

      const dailyRate = (activeGroup.customDailyLectures && activeGroup.customDailyLectures[course.id]) 
        || activeGroup.defaultDailyLectures || 4;

      return {
        course,
        totalLec,
        compLec,
        remLec,
        remDurationSec,
        dailyRate
      };
    });

    const remGroupLectures = Math.max(0, totalGroupLectures - completedGroupLectures);
    const overallCompletionPct = totalGroupLectures > 0 ? Math.round((completedGroupLectures / totalGroupLectures) * 100) : 0;

    const startOffsetDays = parseInt(activeGroup.startOffsetDays) || 0;

    // Helper: calculate finish date given active days needed, buffer days & start offset
    const calculateFinishDate = (activeDaysNeeded, offsetDays = 0) => {
      if (activeDaysNeeded <= 0 && offsetDays <= 0) return 'Completed!';
      let date = new Date();

      if (offsetDays > 0) {
        date.setDate(date.getDate() + parseInt(offsetDays));
      }

      let activeAdded = 0;
      let safetyCounter = 0;
      const weekendSetting = activeGroup.weekendBuffer || 'none';

      while (activeAdded < activeDaysNeeded && safetyCounter < 1000) {
        date.setDate(date.getDate() + 1);
        safetyCounter++;
        const day = date.getDay(); // 0 is Sun, 6 is Sat
        let isSkip = false;
        if (weekendSetting === 'sundays' && day === 0) isSkip = true;
        if (weekendSetting === 'saturdays' && day === 6) isSkip = true;
        if (weekendSetting === 'weekends' && (day === 0 || day === 6)) isSkip = true;

        if (!isSkip) {
          activeAdded++;
        }
      }

      // Add extra custom buffer days off at the end
      if (activeGroup.bufferDays > 0) {
        date.setDate(date.getDate() + parseInt(activeGroup.bufferDays));
      }

      const options = { day: 'numeric', month: 'short', year: 'numeric' };
      return date.toLocaleDateString('en-GB', options);
    };

    // Calculate Group 1 (or preceding group) total days for Syncing
    const group1 = groups[0];
    let group1OffsetDays = 0;
    if (group1 && group1.id !== activeGroup.id) {
      if ((group1.mode === 'complete_together' || group1.mode === 'target_date') && group1.targetDate) {
        const g1Target = new Date(group1.targetDate);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        g1Target.setHours(0, 0, 0, 0);
        const diffMs = g1Target.getTime() - now.getTime();
        group1OffsetDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      } else {
        const g1Courses = allCourses.filter(c => (group1.selectedCourseIds || []).includes(c.id));
        let g1MaxDays = 0;
        g1Courses.forEach(c => {
          const activeLecs = getActiveLectures(c);
          const totL = activeLecs.length || (c.isIgnored ? 0 : (c.videoCount || 0));
          let compL = 0;
          activeLecs.forEach(lec => {
            if (courseProgressMap[`${c.id}_${lec.id}`]?.completed) compL++;
          });
          const remL = Math.max(0, totL - compL);
          const rate = (group1.customDailyLectures && group1.customDailyLectures[c.id]) || group1.defaultDailyLectures || 4;
          const days = remL > 0 ? Math.ceil(remL / Math.max(1, rate)) : 0;
          if (days > g1MaxDays) g1MaxDays = days;
        });
        group1OffsetDays = g1MaxDays + (parseInt(group1.bufferDays) || 0) + (parseInt(group1.startOffsetDays) || 0);
      }
    }

    // Calculate dates & rates based on Mode
    let requiredDailyLecturesTotal = 0;
    let targetCalendarDays = 0;
    let hasBacklogIncrease = false;

    if ((activeGroup.mode === 'target_date' || activeGroup.mode === 'complete_together') && activeGroup.targetDate) {
      const target = new Date(activeGroup.targetDate);
      const now = new Date();
      target.setHours(23, 59, 59, 999);
      const diffMs = target.getTime() - (now.getTime() + startOffsetDays * 86400000);
      const rawDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      targetCalendarDays = rawDays;

      // Adjust raw days for buffer days & weekends
      let activeAvailableDays = 0;
      let testDate = new Date();
      if (startOffsetDays > 0) testDate.setDate(testDate.getDate() + startOffsetDays);
      const weekendSetting = activeGroup.weekendBuffer || 'none';

      for (let i = 0; i < rawDays; i++) {
        testDate.setDate(testDate.getDate() + 1);
        const day = testDate.getDay();
        let isSkip = false;
        if (weekendSetting === 'sundays' && day === 0) isSkip = true;
        if (weekendSetting === 'saturdays' && day === 6) isSkip = true;
        if (weekendSetting === 'weekends' && (day === 0 || day === 6)) isSkip = true;

        if (!isSkip) activeAvailableDays++;
      }

      const netActiveDays = Math.max(1, activeAvailableDays - (parseInt(activeGroup.bufferDays) || 0));
      requiredDailyLecturesTotal = Math.ceil(remGroupLectures / netActiveDays);
    }

    // Attach subject specific finish dates & target rate requirements
    const subjectDetails = subjectBreakdown.map(s => {
      let activeDaysNeeded = 0;
      let requiredLecForTarget = 0;
      let requiredLecTogether = 0;

      if (s.remLec === 0) {
        requiredLecForTarget = 0;
        requiredLecTogether = 0;
        activeDaysNeeded = 0;
      } else if (activeGroup.mode === 'target_date' && targetCalendarDays > 0) {
        const netActiveDays = Math.max(1, targetCalendarDays - (parseInt(activeGroup.bufferDays) || 0));
        requiredLecForTarget = Math.max(1, Math.ceil(s.remLec / netActiveDays));
        activeDaysNeeded = Math.ceil(s.remLec / requiredLecForTarget);
      } else if (activeGroup.mode === 'complete_together' && targetCalendarDays > 0) {
        const netActiveDays = Math.max(1, targetCalendarDays - (parseInt(activeGroup.bufferDays) || 0));
        requiredLecTogether = s.remLec > 0 ? Math.max(1, Math.ceil(s.remLec / netActiveDays)) : 0;
        activeDaysNeeded = Math.ceil(s.remLec / Math.max(1, requiredLecTogether));

        // Detect if daily quantity increased due to missed target lectures
        const initialBaselineRate = Math.ceil(s.totalLec / Math.max(1, targetCalendarDays));
        if (requiredLecTogether > initialBaselineRate && s.compLec < s.totalLec) {
          hasBacklogIncrease = true;
        }
      } else {
        activeDaysNeeded = Math.ceil(s.remLec / s.dailyRate);
      }

      const finishDateStr = s.remLec === 0
        ? 'Completed!'
        : (activeGroup.mode === 'complete_together' && activeGroup.targetDate
            ? formatOrdinalDate(activeGroup.targetDate)
            : calculateFinishDate(activeDaysNeeded, startOffsetDays));

      return {
        ...s,
        activeDaysNeeded,
        requiredLecForTarget,
        requiredLecTogether,
        finishDateStr
      };
    });

    // Apply column sorting to subjectDetails
    if (sortConfig && sortConfig.key) {
      subjectDetails.sort((a, b) => {
        let valA = 0;
        let valB = 0;
        if (sortConfig.key === 'name') {
          valA = (a.course.title || a.course.name || '').toLowerCase();
          valB = (b.course.title || b.course.name || '').toLowerCase();
          if (valA < valB) return sortConfig.dir === 'asc' ? -1 : 1;
          if (valA > valB) return sortConfig.dir === 'asc' ? 1 : -1;
          return 0;
        } else if (sortConfig.key === 'lectures') {
          valA = a.remLec;
          valB = b.remLec;
        } else if (sortConfig.key === 'hours') {
          valA = a.remDurationSec;
          valB = b.remDurationSec;
        } else if (sortConfig.key === 'quota') {
          valA = activeGroup.mode === 'complete_together' ? a.requiredLecTogether : (activeGroup.mode === 'target_date' ? a.requiredLecForTarget : a.dailyRate);
          valB = activeGroup.mode === 'complete_together' ? b.requiredLecTogether : (activeGroup.mode === 'target_date' ? b.requiredLecForTarget : b.dailyRate);
        }
        return sortConfig.dir === 'asc' ? valA - valB : valB - valA;
      });
    }

    // Overall Group Finish Date
    const maxActiveDaysNeeded = Math.max(0, ...subjectDetails.map(s => s.activeDaysNeeded));
    const overallFinishDate = activeGroup.mode === 'complete_together' && activeGroup.targetDate
      ? new Date(activeGroup.targetDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : calculateFinishDate(maxActiveDaysNeeded, startOffsetDays);

    let daysLeft = 0;
    if ((activeGroup.mode === 'complete_together' || activeGroup.mode === 'target_date') && activeGroup.targetDate) {
      const target = new Date(activeGroup.targetDate);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      target.setHours(0, 0, 0, 0);
      const diffMs = target.getTime() - (now.getTime() + startOffsetDays * 86400000);
      daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    } else {
      daysLeft = maxActiveDaysNeeded + (parseInt(activeGroup.bufferDays) || 0) + startOffsetDays;
    }

    const groupStartDateObj = new Date();
    if (startOffsetDays > 0) groupStartDateObj.setDate(groupStartDateObj.getDate() + startOffsetDays);
    const groupStartDateStr = groupStartDateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    // --- Streak & Study Velocity Math ---
    const todayStr = new Date().toLocaleDateString();
    let todayLecturesCount = 0;
    logs.forEach(log => {
      if (log.date) {
        const logDateStr = new Date(log.date).toLocaleDateString();
        if (logDateStr === todayStr) {
          todayLecturesCount++;
        }
      }
    });

    // Streak calculation (consecutive days with completed lectures)
    const datesWithActivity = new Set(
      logs.map(l => l.date ? new Date(l.date).toLocaleDateString() : null).filter(Boolean)
    );
    let streak = 0;
    let checkDate = new Date();
    while (true) {
      const dStr = checkDate.toLocaleDateString();
      if (datesWithActivity.has(dStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        // If today has no lectures yet, check yesterday to allow maintaining active streak
        if (streak === 0 && checkDate.toLocaleDateString() === todayStr) {
          checkDate.setDate(checkDate.getDate() - 1);
          continue;
        }
        break;
      }
    }

    // Velocity calculation: Today's Planned vs Actual
    const plannedToday = activeGroup.mode === 'target_date' ? requiredDailyLecturesTotal : (activeGroup.defaultDailyLectures || 4);
    const velocityPercentage = plannedToday > 0 ? Math.round((todayLecturesCount / plannedToday) * 100) : 100;

    // Confidence Calculation (0 - 100%)
    let confidencePct = 100;
    if (remGroupLectures > 0) {
      if (activeGroup.mode === 'target_date') {
        // Based on required vs manageable daily pace
        if (requiredDailyLecturesTotal > 12) confidencePct = 20;
        else if (requiredDailyLecturesTotal > 8) confidencePct = 50;
        else if (requiredDailyLecturesTotal > 5) confidencePct = 75;
        else confidencePct = 95;
      } else {
        // Based on today's velocity & completion steady rate
        if (velocityPercentage >= 100) confidencePct = 95;
        else if (velocityPercentage >= 50) confidencePct = 65;
        else confidencePct = 25;
      }
    }

    let confidenceColor = '#10b981'; // Green (>= 70%)
    let confidenceLabel = 'High Confidence';
    if (confidencePct < 30) {
      confidenceColor = '#8b5cf6'; // Violet (< 30%)
      confidenceLabel = 'Behind Schedule';
    } else if (confidencePct < 70) {
      confidenceColor = '#f59e0b'; // Yellow (30 - 69%)
      confidenceLabel = 'Moderate Pace';
    }

    return {
      selectedCourses,
      totalGroupLectures,
      completedGroupLectures,
      remGroupLectures,
      totalGroupDurationSec,
      remainingGroupDurationSec,
      overallCompletionPct,
      overallFinishDate,
      subjectDetails,
      requiredDailyLecturesTotal,
      todayLecturesCount,
      plannedToday,
      velocityPercentage,
      streak,
      confidencePct,
      confidenceColor,
      confidenceLabel,
      hasBacklogIncrease,
      group1OffsetDays,
      groupStartDateStr,
      daysLeft
    };
  }, [activeGroup, allCourses, courseProgressMap, logs, sortConfig]);

  // Confetti Animation when active group hits 100% completion
  useEffect(() => {
    if (groupStats && groupStats.overallCompletionPct === 100 && groupStats.totalGroupLectures > 0) {
      triggerConfetti();
    }
  }, [groupStats?.overallCompletionPct]);

  const triggerConfetti = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#14b8a6'];

    for (let i = 0; i < 120; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        vy: Math.random() * 4 + 2,
        vx: Math.random() * 2 - 1,
        rotation: Math.random() * 360
      });
    }

    let animationFrame;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.y += p.vy;
        p.x += p.vx;
        p.rotation += 2;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      if (particles.some(p => p.y < canvas.height)) {
        animationFrame = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
    render();
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="completion-modal-backdrop no-scrollbar" 
      onClick={() => setIsOpen(false)}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '125vw',
        height: '125vh',
        maxWidth: '125vw',
        maxHeight: '125vh',
        backgroundColor: 'var(--bg-primary, #0b0f19)',
        zIndex: 9999999,
        display: 'flex',
        flexDirection: 'column',
        padding: 0,
        margin: 0,
        boxSizing: 'border-box',
        animation: 'fadeIn 0.25s ease',
        overflow: 'hidden'
      }}
    >
      <canvas 
        ref={canvasRef} 
        style={{ position: 'fixed', top: 0, left: 0, pointerEvents: 'none', zIndex: 100000 }} 
      />

      <div 
        className="completion-modal-card no-scrollbar"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          height: '100%',
          maxWidth: '100%',
          maxHeight: '100%',
          backgroundColor: 'var(--bg-secondary, #131826)',
          border: 'none',
          borderRadius: 0,
          boxShadow: 'none',
          color: 'var(--text-primary, #f3f4f6)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '20px 28px',
          borderBottom: '1px solid var(--border-secondary, rgba(255,255,255,0.08))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0) 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '1.2rem',
              boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)'
            }}>
              <i className="fas fa-chart-pie"></i>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #ffffff 0%, #a7f3d0 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Completion Planner & Velocity Tracker
              </h2>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #9ca3af)' }}>
                Multi-Group Subject Target & Smart Schedule Mathematics
              </span>
            </div>
          </div>

          <button 
            onClick={() => setIsOpen(false)}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              color: 'var(--text-secondary, #9ca3af)',
              cursor: 'pointer',
              fontSize: '1.2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            title="Close"
          >&times;</button>
        </div>

        {/* Group Bar Navigation */}
        <div style={{
          padding: '12px 28px',
          background: 'rgba(0,0,0,0.2)',
          borderBottom: '1px solid var(--border-secondary, rgba(255,255,255,0.06))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          {/* Tabs for Groups */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
            {groups.map(group => {
              const isActive = group.id === activeGroupId;
              return (
                <button
                  key={group.id}
                  onClick={() => {
                    setActiveGroupId(group.id);
                    setIsEditingGroupName(false);
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '12px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    border: isActive ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.08)',
                    background: isActive ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.3) 100%)' : 'rgba(255,255,255,0.03)',
                    color: isActive ? '#34d399' : 'var(--text-secondary, #9ca3af)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                    boxShadow: isActive ? '0 4px 12px rgba(16, 185, 129, 0.2)' : 'none'
                  }}
                >
                  <i className="fas fa-layer-group" style={{ fontSize: '0.78rem' }}></i>
                  <span>{group.name}</span>
                </button>
              );
            })}

            <button
              onClick={handleCreateGroup}
              style={{
                padding: '8px 14px',
                borderRadius: '12px',
                fontSize: '0.85rem',
                fontWeight: 600,
                border: '1px dashed rgba(16, 185, 129, 0.5)',
                background: 'rgba(16, 185, 129, 0.05)',
                color: '#10b981',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.2s ease'
              }}
              title="Make a new group"
            >
              <i className="fas fa-plus"></i> New Group
            </button>
          </div>

          {/* Active Group Action Controls */}
          {activeGroup && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {isEditingGroupName ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input 
                    type="text" 
                    value={editingNameValue} 
                    onChange={(e) => setEditingNameValue(e.target.value)}
                    style={{
                      background: 'var(--bg-tertiary, #1f2937)',
                      color: 'white',
                      border: '1px solid #10b981',
                      borderRadius: '8px',
                      padding: '5px 10px',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                    autoFocus
                  />
                  <button 
                    onClick={handleSaveGroupName} 
                    style={{ background: '#10b981', border: 'none', color: 'white', padding: '5px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                  >Save</button>
                  <button 
                    onClick={() => setIsEditingGroupName(false)} 
                    style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '5px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem' }}
                  >Cancel</button>
                </div>
              ) : (
                <button 
                  onClick={() => {
                    setEditingNameValue(activeGroup.name);
                    setIsEditingGroupName(true);
                  }}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'var(--text-secondary, #9ca3af)',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  title="Rename Group"
                >
                  <i className="fas fa-edit"></i> Rename
                </button>
              )}

              <button 
                onClick={() => handleDeleteGroup(activeGroup.id)}
                style={{
                  background: 'rgba(139, 92, 246, 0.12)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  color: '#c084fc',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                title="Delete this group"
              >
                <i className="fas fa-trash-alt"></i> Delete Group
              </button>
            </div>
          )}
        </div>

        {/* Modal Scrollable Content */}
        <div 
          className="no-scrollbar"
          style={{
            padding: '24px 36px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          {activeGroup && groupStats && (
            <>
              {/* Top Overview Cards (Confidence, Velocity, Streak, Hours Remaining & Totals) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '20px'
              }}>
                {/* Confidence Status Badge Card */}
                <div style={{
                  background: 'var(--bg-tertiary, rgba(255,255,255,0.03))',
                  border: `1px solid ${groupStats.confidenceColor}40`,
                  borderRadius: '20px',
                  padding: '22px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '18px',
                  boxShadow: `0 8px 24px ${groupStats.confidenceColor}15`
                }}>
                  {/* Round Circular Status Badge with dynamic font scaling to prevent 3-digit text overflow */}
                  <div style={{
                    width: '74px',
                    height: '74px',
                    borderRadius: '50%',
                    border: `4px solid ${groupStats.confidenceColor}`,
                    boxShadow: `0 0 20px ${groupStats.confidenceColor}60`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: String(groupStats.confidencePct).length >= 4 ? '0.75rem' : String(groupStats.confidencePct).length >= 3 ? '0.88rem' : '1.15rem',
                    color: groupStats.confidenceColor,
                    flexShrink: 0,
                    padding: '0 4px',
                    boxSizing: 'border-box',
                    whiteSpace: 'nowrap'
                  }}>
                    {groupStats.confidencePct}%
                  </div>
                  <div>
                    <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary, #9ca3af)', fontWeight: 700 }}>
                      Schedule Confidence
                    </div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 900, color: groupStats.confidenceColor, marginTop: '4px' }}>
                      {groupStats.confidenceLabel}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #9ca3af)', marginTop: '4px', fontWeight: 600 }}>
                      {groupStats.remGroupLectures === 0 ? 'All lectures completed!' : groupStats.overallFinishDate}
                    </div>
                  </div>
                </div>

                {/* Study Velocity Card */}
                <div style={{
                  background: 'var(--bg-tertiary, rgba(255,255,255,0.03))',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '20px',
                  padding: '22px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '18px'
                }}>
                  <div style={{
                    width: '58px',
                    height: '58px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '1.4rem',
                    boxShadow: '0 6px 18px rgba(59, 130, 246, 0.4)',
                    flexShrink: 0
                  }}>
                    <i className="fas fa-tachometer-alt"></i>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary, #9ca3af)', fontWeight: 700 }}>
                      Study Velocity Today
                    </div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'white', marginTop: '4px' }}>
                      {groupStats.todayLecturesCount} / {groupStats.plannedToday} lectures
                    </div>
                    <div style={{ fontSize: '0.82rem', color: groupStats.velocityPercentage >= 100 ? '#10b981' : '#f59e0b', fontWeight: 700, marginTop: '4px' }}>
                      {groupStats.velocityPercentage}% Performance
                    </div>
                  </div>
                </div>

                {/* Streak Counter Card */}
                <div style={{
                  background: 'var(--bg-tertiary, rgba(255,255,255,0.03))',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '20px',
                  padding: '22px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '18px'
                }}>
                  <div style={{
                    width: '58px',
                    height: '58px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '1.5rem',
                    boxShadow: '0 6px 18px rgba(245, 158, 11, 0.4)',
                    flexShrink: 0
                  }}>
                    🔥
                  </div>
                  <div>
                    <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary, #9ca3af)', fontWeight: 700 }}>
                      Active Streak
                    </div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#fbbf24', marginTop: '4px' }}>
                      {groupStats.streak} Days Streak
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #9ca3af)', marginTop: '4px', fontWeight: 600 }}>
                      Keep watching daily!
                    </div>
                  </div>
                </div>

                {/* Compact Hours Left & Accumulated Totals Card */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.18) 0%, rgba(126, 34, 206, 0.08) 100%)',
                  border: '1px solid rgba(168, 85, 247, 0.35)',
                  borderRadius: '16px',
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  boxShadow: '0 6px 20px rgba(168, 85, 247, 0.18)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '1.15rem',
                    boxShadow: '0 4px 14px rgba(168, 85, 247, 0.35)',
                    flexShrink: 0
                  }}>
                    <i className="fas fa-hourglass-half"></i>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#d8b4fe', fontWeight: 800 }}>
                      HOURS REMAINING & CONTENT STATS
                    </div>
                    <div style={{ fontSize: '1.45rem', fontWeight: 900, color: 'white', marginTop: '1px', display: 'flex', alignItems: 'baseline', gap: '6px', lineHeight: 1.1 }}>
                      {Math.round(groupStats.remainingGroupDurationSec / 3600)} 
                      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#c084fc', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hours Left</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#e9d5ff', marginTop: '4px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span>📚 <strong>{groupStats.completedGroupLectures}</strong> / <strong>{groupStats.totalGroupLectures}</strong> Lectures</span>
                      <span>⏱️ <strong>{Math.round(groupStats.totalGroupDurationSec / 3600)}h</strong> Total Content</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls Bar: Calculation Mode, Target Date, Buffer Days */}
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '18px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <i className="fas fa-sliders-h" style={{ color: '#10b981' }}></i>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Target & Buffer Settings</h3>

                    {groups.indexOf(activeGroup) > 0 && (
                      <button
                        type="button"
                        onClick={() => updateActiveGroup({ startOffsetDays: groupStats.group1OffsetDays })}
                        style={{
                          background: 'rgba(245, 158, 11, 0.18)',
                          border: '1px solid rgba(245, 158, 11, 0.4)',
                          color: '#fbbf24',
                          borderRadius: '8px',
                          padding: '4px 12px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          boxShadow: '0 2px 8px rgba(245, 158, 11, 0.25)',
                          transition: 'all 0.2s ease'
                        }}
                        title="Sync start date to Group 1 finish date"
                      >
                        ⚡ Sync Group 1
                      </button>
                    )}
                  </div>

                  {/* Mode Selector Header with Delay Start on Left */}
                  <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                    
                    {/* Group Delay Custom Calendar Selector (Left of Custom Daily Pace) */}
                    <div 
                      onClick={() => triggerDatePicker(delayDateInputRef)}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '4px 10px', borderRadius: '8px', position: 'relative', cursor: 'pointer' }}
                    >
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                        <i className="fas fa-calendar-alt"></i> Delay Start:
                      </label>
                      <div style={{
                        background: 'var(--bg-tertiary, #1f2937)',
                        color: 'white',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        position: 'relative'
                      }}>
                        <span>{(() => {
                          const d = new Date();
                          const offset = parseInt(activeGroup.startOffsetDays) || 0;
                          if (offset > 0) d.setDate(d.getDate() + offset);
                          return formatOrdinalDate(d);
                        })()}</span>
                        <input 
                          ref={delayDateInputRef}
                          type="date"
                          value={(() => {
                            const d = new Date();
                            const offset = parseInt(activeGroup.startOffsetDays) || 0;
                            if (offset > 0) d.setDate(d.getDate() + offset);
                            return d.toISOString().split('T')[0];
                          })()}
                          onChange={(e) => {
                            if (!e.target.value) return;
                            const selDate = new Date(e.target.value);
                            const today = new Date();
                            today.setHours(0,0,0,0);
                            selDate.setHours(0,0,0,0);
                            const diffDays = Math.max(0, Math.ceil((selDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
                            updateActiveGroup({ startOffsetDays: diffDays });
                          }}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            opacity: 0,
                            cursor: 'pointer',
                            zIndex: 2
                          }}
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => updateActiveGroup({ mode: 'custom_pace' })}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        border: 'none',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        background: activeGroup.mode === 'custom_pace' ? '#10b981' : 'transparent',
                        color: activeGroup.mode === 'custom_pace' ? 'white' : 'var(--text-secondary, #9ca3af)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      Custom Daily Pace
                    </button>
                    <button
                      onClick={() => updateActiveGroup({ mode: 'complete_together' })}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        border: 'none',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        background: activeGroup.mode === 'complete_together' ? '#38bdf8' : 'transparent',
                        color: activeGroup.mode === 'complete_together' ? 'white' : 'var(--text-secondary, #9ca3af)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      🤝 Complete Together
                    </button>
                    <button
                      onClick={() => updateActiveGroup({ mode: 'target_date' })}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        border: 'none',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        background: activeGroup.mode === 'target_date' ? '#10b981' : 'transparent',
                        color: activeGroup.mode === 'target_date' ? 'white' : 'var(--text-secondary, #9ca3af)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      Rigid Target Completion Date
                    </button>
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '16px',
                  alignItems: 'flex-end'
                }}>
                  {activeGroup.mode === 'target_date' || activeGroup.mode === 'complete_together' ? (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary, #9ca3af)', marginBottom: '6px', fontWeight: 600 }}>
                        Select Target Completion Date
                      </label>
                      <div 
                        onClick={() => triggerDatePicker(targetDateInputRef)}
                        style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%', cursor: 'pointer' }}
                      >
                        <div style={{
                          width: '100%',
                          background: 'var(--bg-tertiary, #1f2937)',
                          color: 'white',
                          border: activeGroup.mode === 'complete_together' ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '10px',
                          padding: '8px 14px',
                          fontSize: '0.92rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          boxSizing: 'border-box',
                          boxShadow: activeGroup.mode === 'complete_together' ? '0 0 12px rgba(56, 189, 248, 0.2)' : 'none'
                        }}>
                          <span>{formatOrdinalDate(activeGroup.targetDate || new Date().toISOString().split('T')[0])}</span>
                          <i className="fas fa-calendar-alt" style={{ color: activeGroup.mode === 'complete_together' ? '#38bdf8' : '#10b981', fontSize: '1rem' }}></i>
                        </div>
                        <input 
                          ref={targetDateInputRef}
                          type="date" 
                          value={activeGroup.targetDate || ''}
                          onChange={(e) => updateActiveGroup({ targetDate: e.target.value })}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            opacity: 0,
                            cursor: 'pointer',
                            zIndex: 2
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary, #9ca3af)', marginBottom: '6px', fontWeight: 600 }}>
                        Baseline Daily Quota (Lectures/Day)
                      </label>
                      <input 
                        type="number"
                        min="1"
                        max="50"
                        value={activeGroup.defaultDailyLectures || 4}
                        onChange={(e) => updateActiveGroup({ defaultDailyLectures: parseInt(e.target.value) || 1 })}
                        style={{
                          width: '100%',
                          background: 'var(--bg-tertiary, #1f2937)',
                          color: 'white',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '10px',
                          padding: '8px 12px',
                          fontSize: '0.9rem',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  )}

                  {/* Buffer Days Input */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary, #9ca3af)', marginBottom: '6px', fontWeight: 600 }}>
                      Buffer Days Off (Taking Days Off)
                    </label>
                    <input 
                      type="number"
                      min="0"
                      max="365"
                      value={activeGroup.bufferDays || 0}
                      onChange={(e) => updateActiveGroup({ bufferDays: parseInt(e.target.value) || 0 })}
                      placeholder="e.g. 4 days off"
                      style={{
                        width: '100%',
                        background: 'var(--bg-tertiary, #1f2937)',
                        color: 'white',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '10px',
                        padding: '8px 12px',
                        fontSize: '0.9rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Weekend Buffer Selector */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary, #9ca3af)', marginBottom: '6px', fontWeight: 600 }}>
                      Weekend Off Options
                    </label>
                    <select
                      value={activeGroup.weekendBuffer || 'none'}
                      onChange={(e) => updateActiveGroup({ weekendBuffer: e.target.value })}
                      style={{
                        width: '100%',
                        background: 'var(--bg-tertiary, #1f2937)',
                        color: 'white',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '10px',
                        padding: '8px 12px',
                        fontSize: '0.9rem',
                        outline: 'none',
                        cursor: 'pointer',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="none">No Weekend Off (Study Daily)</option>
                      <option value="sundays">Keep All Sundays Off</option>
                      <option value="saturdays">Keep All Saturdays Off</option>
                      <option value="weekends">Keep Saturdays & Sundays Off</option>
                    </select>
                  </div>
                </div>

                {/* Mode & Start Delay Banners */}
                {activeGroup.mode === 'complete_together' && !dismissedBanners[activeGroup.id + '_together'] && (
                  <AdviceBanner
                    bg="rgba(56, 189, 248, 0.08)"
                    border="1px solid rgba(56, 189, 248, 0.25)"
                    color="#38bdf8"
                    icon="fas fa-handshake"
                    title="Complete Together Mode Active"
                    text={
                      <span>
                        All subjects in <strong>{activeGroup.name}</strong> will complete together on <strong>{groupStats.overallFinishDate}</strong>. Daily quotas are locked and auto-calculated from your target deadline.
                      </span>
                    }
                    onDismiss={() => handleDismissBanner(activeGroup.id + '_together')}
                    extraContent={groupStats.hasBacklogIncrease ? (
                      <div style={{ marginTop: '4px', padding: '8px 12px', background: 'rgba(168, 85, 247, 0.12)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '8px', color: '#c084fc', fontSize: '0.82rem', fontWeight: 600 }}>
                        <i className="fas fa-exclamation-circle" style={{ marginRight: '6px' }}></i>
                        <strong>Notice:</strong> You didn't finish target lectures on schedule, so the daily lecture quantity has automatically increased to meet your rigid target deadline of {groupStats.overallFinishDate}.
                      </div>
                    ) : null}
                  />
                )}

                {(parseInt(activeGroup.startOffsetDays) || 0) > 0 && !dismissedBanners[activeGroup.id + '_delay'] && (
                  <AdviceBanner
                    bg="rgba(245, 158, 11, 0.1)"
                    border="1px solid rgba(245, 158, 11, 0.25)"
                    color="#fbbf24"
                    icon="fas fa-calendar-alt"
                    title="Start Delay Active"
                    text={
                      <span>
                        Calculations start from <strong>{groupStats.groupStartDateStr}</strong> ({activeGroup.startOffsetDays} days from today) to give time to finish Group 1 content!
                      </span>
                    }
                    onDismiss={() => handleDismissBanner(activeGroup.id + '_delay')}
                  />
                )}
              </div>

              {/* Progress Seek Bar & Milestones */}
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '18px',
                padding: '20px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary, #9ca3af)' }}>
                    Group Overall Progress: <strong style={{ color: '#10b981', fontSize: '1.1rem' }}>{groupStats.overallCompletionPct}%</strong>
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #9ca3af)', fontWeight: 600 }}>
                    Estimated Finish: <strong style={{ color: 'white' }}>{groupStats.overallFinishDate}</strong> <span style={{ color: '#38bdf8', fontWeight: 700, marginLeft: '6px' }}>({groupStats.daysLeft} days left)</span>
                  </span>
                </div>

                {/* Seek Bar */}
                <div style={{
                  height: '14px',
                  background: 'rgba(0,0,0,0.4)',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  position: 'relative',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${groupStats.overallCompletionPct}%`,
                    background: 'linear-gradient(90deg, #10b981 0%, #34d399 100%)',
                    borderRadius: '10px',
                    boxShadow: '0 0 14px rgba(16, 185, 129, 0.6)',
                    transition: 'width 0.5s ease-out'
                  }} />
                </div>

                {/* Milestone Indicators */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                  {[25, 50, 75, 100].map(m => {
                    const reached = groupStats.overallCompletionPct >= m;
                    return (
                      <div key={m} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 700, color: reached ? '#34d399' : 'rgba(255,255,255,0.3)' }}>
                        <i className={reached ? 'fas fa-check-circle' : 'far fa-circle'} style={{ fontSize: '0.8rem' }}></i>
                        <span>{m}% Milestone</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Selected Subjects Table */}
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '18px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fas fa-list-ul" style={{ color: '#10b981' }}></i>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Subjects in {activeGroup.name}</h3>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      onClick={handleMakeTodaysGoal}
                      style={{
                        background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '10px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(56, 189, 248, 0.35)',
                        transition: 'all 0.2s ease'
                      }}
                      title="Generate today's Goal Playlist based on this group's daily target quotas"
                    >
                      <i className="fas fa-bullseye"></i> Make Today's Goal
                    </button>

                    <button
                      onClick={() => {
                        refreshData();
                        setShowCoursePicker(true);
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '10px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                      }}
                    >
                      <i className="fas fa-plus"></i> Add Subject
                    </button>
                  </div>
                </div>

                {groupStats.subjectDetails.length === 0 ? (
                  <div style={{
                    padding: '36px',
                    textAlign: 'center',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '14px',
                    border: '1px dashed rgba(255,255,255,0.1)',
                    color: 'var(--text-secondary, #9ca3af)'
                  }}>
                    <i className="fas fa-book-open" style={{ fontSize: '2.2rem', marginBottom: '10px', opacity: 0.5 }}></i>
                    <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>No subjects added to this group yet.</p>
                    <p style={{ margin: '6px 0 0 0', fontSize: '0.82rem' }}>Click "+ Add Subject" to choose courses from your library.</p>
                  </div>
                ) : (
                  <div className="no-scrollbar" style={{ overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      textAlign: 'left',
                      fontSize: '0.88rem'
                    }}>
                      <thead>
                        <tr style={{
                          borderBottom: '1px solid rgba(255,255,255,0.1)',
                          color: 'var(--text-secondary, #9ca3af)',
                          fontSize: '0.78rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.8px'
                        }}>
                          <th 
                            onClick={() => handleSort('name')}
                            style={{ padding: '12px', cursor: 'pointer', userSelect: 'none' }}
                            title="Click to sort by Subject Name"
                          >
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                              Subject Name
                              <i 
                                className={sortConfig.key === 'name' ? (sortConfig.dir === 'asc' ? 'fas fa-sort-alpha-down' : 'fas fa-sort-alpha-down-alt') : 'fas fa-sort'} 
                                style={{ color: sortConfig.key === 'name' ? '#38bdf8' : 'rgba(255,255,255,0.25)', fontSize: '0.8rem' }}
                              />
                            </span>
                          </th>

                          <th 
                            onClick={() => handleSort('lectures')}
                            style={{ padding: '12px', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}
                            title="Click to sort by Remaining Lectures"
                          >
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', justifyContent: 'center' }}>
                              Lectures (Done / Total)
                              <i 
                                className={sortConfig.key === 'lectures' ? (sortConfig.dir === 'asc' ? 'fas fa-sort-numeric-down' : 'fas fa-sort-numeric-down-alt') : 'fas fa-sort'} 
                                style={{ color: sortConfig.key === 'lectures' ? '#38bdf8' : 'rgba(255,255,255,0.25)', fontSize: '0.8rem' }}
                              />
                            </span>
                          </th>

                          <th 
                            onClick={() => handleSort('hours')}
                            style={{ padding: '12px', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}
                            title="Click to sort by Remaining Hours"
                          >
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', justifyContent: 'center' }}>
                              Remaining Hours
                              <i 
                                className={sortConfig.key === 'hours' ? (sortConfig.dir === 'asc' ? 'fas fa-sort-amount-down-alt' : 'fas fa-sort-amount-down') : 'fas fa-sort'} 
                                style={{ color: sortConfig.key === 'hours' ? '#38bdf8' : 'rgba(255,255,255,0.25)', fontSize: '0.8rem' }}
                              />
                            </span>
                          </th>

                          <th 
                            onClick={() => handleSort('quota')}
                            style={{ padding: '12px', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}
                            title="Click to sort by Daily Quota"
                          >
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', justifyContent: 'center' }}>
                              Daily Quota
                              <i 
                                className={sortConfig.key === 'quota' ? (sortConfig.dir === 'asc' ? 'fas fa-sort-amount-down-alt' : 'fas fa-sort-amount-down') : 'fas fa-sort'} 
                                style={{ color: sortConfig.key === 'quota' ? '#38bdf8' : 'rgba(255,255,255,0.25)', fontSize: '0.8rem' }}
                              />
                            </span>
                          </th>

                          <th style={{ padding: '12px', textAlign: 'center' }}>Subject Finish Date</th>
                          <th style={{ padding: '12px', textAlign: 'right' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupStats.subjectDetails.map(item => (
                          <tr key={item.course.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '14px 12px', fontWeight: 700, color: 'white' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <i className="fas fa-play-circle" style={{ color: '#10b981' }}></i>
                                <div>
                                  <div>{item.course.title || item.course.name || 'Untitled Course'}</div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #9ca3af)', fontWeight: 500 }}>
                                    {item.course.facultyName || 'Faculty Course'}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td style={{ padding: '14px 12px', textAlign: 'center', fontWeight: 700 }}>
                              <span style={{ color: '#34d399' }}>{item.compLec}</span> / {item.totalLec}
                            </td>

                            <td style={{ padding: '14px 12px', textAlign: 'center', color: 'var(--text-secondary, #9ca3af)' }}>
                              {Math.round(item.remDurationSec / 3600)} hrs
                            </td>

                            <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                              {item.remLec === 0 ? (
                                <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '4px 10px', borderRadius: '8px', fontWeight: 700, fontSize: '0.82rem' }}>
                                  0 lec/day
                                </span>
                              ) : activeGroup.mode === 'target_date' ? (
                                <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '4px 10px', borderRadius: '8px', fontWeight: 700, fontSize: '0.82rem' }}>
                                  {item.requiredLecForTarget} lec/day
                                </span>
                              ) : activeGroup.mode === 'complete_together' ? (
                                <span 
                                  style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '6px 12px', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                                  title="Daily quota is auto-calculated for Complete Together mode and locked"
                                >
                                  <i className="fas fa-lock" style={{ fontSize: '0.75rem' }}></i> {item.requiredLecTogether} lec/day
                                </span>
                              ) : (
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                  <input 
                                    type="number"
                                    min="1"
                                    max="50"
                                    value={item.dailyRate}
                                    onChange={(e) => handleCourseDailyLecturesChange(item.course.id, e.target.value)}
                                    style={{
                                      width: '60px',
                                      background: 'var(--bg-tertiary, #1f2937)',
                                      color: 'white',
                                      border: '1px solid rgba(255,255,255,0.15)',
                                      borderRadius: '8px',
                                      padding: '4px 8px',
                                      fontSize: '0.85rem',
                                      textAlign: 'center',
                                      outline: 'none'
                                    }}
                                  />
                                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #9ca3af)' }}>lec/day</span>
                                </div>
                              )}
                            </td>

                            <td style={{ padding: '14px 12px', textAlign: 'center', fontWeight: 700, color: item.remLec === 0 ? '#34d399' : '#38bdf8' }}>
                              {item.remLec === 0 ? '✓ Completed' : item.finishDateStr}
                            </td>

                            <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                              <button
                                onClick={() => toggleCourseInActiveGroup(item.course.id)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--text-secondary)',
                                  cursor: 'pointer',
                                  fontSize: '0.9rem',
                                  padding: '6px',
                                  borderRadius: '6px'
                                }}
                                title="Remove subject from this group"
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Course Selector Sub-Modal */}
      {showCoursePicker && (
        <div 
          onClick={() => setShowCoursePicker(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            zIndex: 100001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '560px',
              maxHeight: '80vh',
              backgroundColor: 'var(--bg-secondary, #141722)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '20px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'white' }}>
                Select Subjects for {activeGroup?.name}
              </h3>
              <button 
                onClick={() => setShowCoursePicker(false)}
                style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '1.2rem', cursor: 'pointer' }}
              >&times;</button>
            </div>

            <div style={{ fontSize: '0.8rem', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
              <i className="fas fa-info-circle" style={{ marginRight: '6px' }}></i>
              Note: Subjects already assigned to other groups are hidden to maintain exclusivity.
            </div>

            <input 
              type="text" 
              placeholder="Search available subjects..."
              value={courseSearchQuery}
              onChange={(e) => setCourseSearchQuery(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg-tertiary, #1f2937)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '10px',
                padding: '10px 14px',
                fontSize: '0.9rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />

            <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {allCourses
                .filter(c => !otherGroupsAssignedCourseIds.has(c.id))
                .filter(c => (c.title || c.name || '').toLowerCase().includes(courseSearchQuery.toLowerCase()))
                .map(course => {
                  const isSelectedInActive = (activeGroup?.selectedCourseIds || []).includes(course.id);
                  return (
                    <div 
                      key={course.id}
                      onClick={() => toggleCourseInActiveGroup(course.id)}
                      style={{
                        padding: '12px 16px',
                        borderRadius: '12px',
                        background: isSelectedInActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.03)',
                        border: isSelectedInActive ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: isSelectedInActive ? '#34d399' : 'white' }}>
                          {course.title || course.name || 'Untitled Subject'}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #9ca3af)', marginTop: '2px' }}>
                          {course.facultyName || 'Course'} • {getActiveLectures(course).length || (course.isIgnored ? 0 : (course.videoCount || 0))} Lectures
                        </div>
                      </div>

                      <div style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '6px',
                        border: isSelectedInActive ? 'none' : '2px solid rgba(255,255,255,0.3)',
                        background: isSelectedInActive ? '#10b981' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '0.75rem'
                      }}>
                        {isSelectedInActive && <i className="fas fa-check"></i>}
                      </div>
                    </div>
                  );
                })}

              {allCourses.filter(c => !otherGroupsAssignedCourseIds.has(c.id)).length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary, #9ca3af)', fontSize: '0.88rem' }}>
                  No available subjects found.
                </div>
              )}
            </div>

            <button 
              onClick={() => setShowCoursePicker(false)}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                padding: '12px',
                borderRadius: '10px',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Done Selecting
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
