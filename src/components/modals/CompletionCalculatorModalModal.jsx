import React, { useState, useEffect } from 'react';
import CompletionEstimator from '../progress/CompletionEstimator.jsx';

/**
 * Completion Calculator Modal Shell
 * Renders the pure React CompletionEstimator inside the standard modal overlay.
 * Responds to both React custom events and legacy trigger bindings.
 */
export default function CompletionCalculatorModalModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      const modal = document.getElementById('completion-calculator-modal');
      if (modal) modal.classList.remove('hidden');
    };

    const handleClose = () => {
      setIsOpen(false);
      const modal = document.getElementById('completion-calculator-modal');
      if (modal) modal.classList.add('hidden');
    };

    window.addEventListener('open-completion-modal', handleOpen);
    window.addEventListener('close-completion-modal', handleClose);

    const triggerEl = document.getElementById('total-time-left-display');
    if (triggerEl) {
      triggerEl.addEventListener('click', handleOpen);
    }

    return () => {
      window.removeEventListener('open-completion-modal', handleOpen);
      window.removeEventListener('close-completion-modal', handleClose);
      if (triggerEl) {
        triggerEl.removeEventListener('click', handleOpen);
      }
    };
  }, []);

  const handleCloseModal = () => {
    setIsOpen(false);
    const modal = document.getElementById('completion-calculator-modal');
    if (modal) modal.classList.add('hidden');
  };

  return (
    <div 
      id="completion-calculator-modal" 
      className={`modal-overlay ${isOpen ? '' : 'hidden'}`}
      onClick={(e) => {
        if (e.target && e.target.id === 'completion-calculator-modal') {
          handleCloseModal();
        }
      }}
    >
      <CompletionEstimator onClose={handleCloseModal} />
    </div>
  );
}
