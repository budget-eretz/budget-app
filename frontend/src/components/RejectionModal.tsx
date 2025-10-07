import React, { useState } from 'react';
import Modal from './Modal';

interface RejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  count?: number; // מספר החזרים שנבחרו
}

const RejectionModal: React.FC<RejectionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  count = 1,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // ולידציה - שדה לא ריק
    if (!reason.trim()) {
      setError('יש להזין סיבת דחייה');
      return;
    }

    // קריאה ל-callback עם סיבת הדחייה
    onConfirm(reason.trim());
    
    // איפוס השדות
    setReason('');
    setError('');
  };

  const handleClose = () => {
    setReason('');
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="דחיית החזר">
      <form onSubmit={handleSubmit} className="rejection-modal-form">
        <div className="rejection-modal-content">
          <p className="rejection-modal-description">
            {count > 1 
              ? `את/ה עומד/ת לדחות ${count} החזרים. יש להזין סיבת דחייה שתוצג למגישים.`
              : 'את/ה עומד/ת לדחות החזר זה. יש להזין סיבת דחייה שתוצג למגיש.'}
          </p>

          <div className="form-group">
            <label htmlFor="rejection-reason" className="form-label required">
              סיבת הדחייה
            </label>
            <textarea
              id="rejection-reason"
              className={`form-textarea ${error ? 'error' : ''}`}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              placeholder="לדוגמה: הקבלה לא ברורה, נא להגיש מחדש עם קבלה מפורטת"
              rows={4}
              autoFocus
            />
            {error && <span className="error-message">{error}</span>}
          </div>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            onClick={handleClose}
            className="btn btn-secondary"
          >
            ביטול
          </button>
          <button
            type="submit"
            className="btn btn-danger"
          >
            אשר דחייה
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default RejectionModal;
