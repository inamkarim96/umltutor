import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import {
  fetchTutorialRequests,
  approveTutorialMode,
  rejectTutorialMode,
  selectTutorialRequests,
  selectTutorialRequestsPagination,
  selectTutorialRequestsLoading,
  selectTutorialActionLoading,
} from '../../submissions';
import { useSuccessToast, useErrorToast } from '../../../components/ui/Toast';
import ConfirmModal from '../../../components/shared/ConfirmModal';
import {
  BookOpen,
  CheckCircle,
  XCircle,
  Clock,
  User,
  FileText,
  ChevronLeft,
  ChevronRight,
  Eye,
  AlertCircle,
  Share2,
} from 'lucide-react';

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
];

const StatusBadge = ({ status }) => {
  const styles = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-50 text-status-red border-red-200',
    none: 'bg-surface-3 text-muted border-black/10',
  };
  const labels = {
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    none: 'None',
  };
  return (
    <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full border ${styles[status] || styles.none}`}>
      {labels[status] || status}
    </span>
  );
};

const TutorialRequestsPanel = ({ compact = false, showHeader = true }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const successToast = useSuccessToast();
  const errorToast = useErrorToast();

  const requests = useAppSelector(selectTutorialRequests);
  const pagination = useAppSelector(selectTutorialRequestsPagination);
  const isLoading = useAppSelector(selectTutorialRequestsLoading);
  const actionLoading = useAppSelector(selectTutorialActionLoading);

  const [statusFilter, setStatusFilter] = useState('pending');
  const [page, setPage] = useState(1);
  const [rejectModal, setRejectModal] = useState({ open: false, submissionId: null, studentName: '' });
  const [rejectReason, setRejectReason] = useState('');
  const [approveConfirm, setApproveConfirm] = useState({ open: false, item: null });

  const load = useCallback(() => {
    dispatch(fetchTutorialRequests({ status: statusFilter, page, limit: compact ? 5 : 10 }));
  }, [dispatch, statusFilter, page, compact]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async (item) => {
    if (!item.canApprove) {
      errorToast(item.approvalBlockReason || 'Cannot approve this request.');
      return;
    }
    try {
      await dispatch(approveTutorialMode(item.submissionId)).unwrap();
      successToast(`Tutorial Mode approved for ${item.studentName}.`);
      setApproveConfirm({ open: false, item: null });
      load();
    } catch (err) {
      errorToast(typeof err === 'string' ? err : err?.message || 'Approval failed');
    }
  };

  const handleReject = async () => {
    if (!rejectModal.submissionId) return;
    try {
      await dispatch(
        rejectTutorialMode({ submissionId: rejectModal.submissionId, reason: rejectReason })
      ).unwrap();
      successToast('Tutorial request rejected.');
      setRejectModal({ open: false, submissionId: null, studentName: '' });
      setRejectReason('');
      load();
    } catch (err) {
      errorToast(typeof err === 'string' ? err : err?.message || 'Rejection failed');
    }
  };

  const openReview = (item) => {
    const aSlug = (item.assignmentTitle || 'assignment').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const sSlug = (item.studentName || 'student').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    navigate(`/teacher/submissions/${aSlug}/${sSlug}/${item.submissionId}`);
  };

  const pendingCount = requests.filter((r) => r.tutorialRequestStatus === 'pending').length;

  return (
    <div className={compact ? '' : 'min-h-[400px]'}>
      {showHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-extrabold font-heading text-ink flex items-center gap-2">
              <BookOpen size={18} className="text-accent" />
              Tutorial Requests
            </h2>
            <p className="text-xs text-muted font-medium mt-0.5">
              Review and approve student tutorial mode access
            </p>
          </div>
          {!compact && (
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => { setStatusFilter(f.id); setPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-widest transition-all border ${
                    statusFilter === f.id
                      ? 'bg-accent text-white border-accent'
                      : 'bg-white text-muted border-black/10 hover:border-accent/30'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {compact && (
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted">
            {pendingCount} pending
          </span>
          <button
            type="button"
            onClick={() => navigate('/teacher/tutorial-requests')}
            className="text-[10px] font-extrabold text-accent hover:underline uppercase tracking-widest"
          >
            View all →
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-surface-3/60 rounded-lg animate-pulse border border-black/5" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-black/10 rounded-lg bg-surface-3/30">
          <BookOpen size={32} className="mx-auto text-muted mb-3 opacity-40" />
          <p className="text-sm font-bold text-ink">No tutorial requests</p>
          <p className="text-xs text-muted mt-1">
            {statusFilter === 'pending'
              ? 'Students can request tutorial mode after submitting assignments.'
              : `No ${statusFilter} requests found.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((item) => (
            <article
              key={item.submissionId}
              className="bg-white border border-black/5 rounded-lg p-4 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={item.tutorialRequestStatus} />
                    <span className="text-[10px] font-bold text-muted uppercase tracking-widest">
                      {item.completionPercent}% complete
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-accent shrink-0" />
                    <span className="font-extrabold font-heading text-ink text-sm truncate">
                      {item.studentName}
                    </span>
                    <span className="text-[10px] text-muted font-bold">ID: {item.studentId}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <FileText size={12} />
                    <span className="font-medium truncate">{item.assignmentTitle}</span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-[10px] font-bold text-muted uppercase tracking-wide">
                    <span className="flex items-center gap-1">
                      <CheckCircle size={10} className="text-status-green" />
                      {item.submissionStatus}
                    </span>
                    {item.submittedAt && (
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        Submitted {new Date(item.submittedAt).toLocaleString()}
                      </span>
                    )}
                    {item.tutorialRequestedAt && (
                      <span className="flex items-center gap-1">
                        <BookOpen size={10} />
                        Requested {new Date(item.tutorialRequestedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                  {!item.canApprove && item.tutorialRequestStatus === 'pending' && (
                    <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-800 font-medium">
                      <AlertCircle size={14} className="shrink-0 mt-0.5" />
                      {item.approvalBlockReason}
                    </div>
                  )}
                  {item.tutorialRejectionReason && item.tutorialRequestStatus === 'rejected' && (
                    <p className="text-xs text-muted italic border-l-2 border-red-200 pl-2">
                      {item.tutorialRejectionReason}
                    </p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
                  <div className="w-full sm:w-32 lg:w-36 p-3 bg-surface-3/50 rounded-lg border border-black/5 text-center">
                    <Share2 size={16} className="mx-auto text-accent mb-1" />
                    <p className="text-[10px] font-extrabold text-muted uppercase">Diagram</p>
                    <p className="text-sm font-extrabold font-heading text-ink">
                      {item.diagramPreview?.hasDiagram
                        ? `${item.diagramPreview.nodeCount} nodes`
                        : 'Empty'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openReview(item)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold bg-white border border-black/10 rounded-lg hover:bg-surface-3 transition-colors"
                    >
                      <Eye size={14} /> Preview
                    </button>
                    {item.tutorialRequestStatus === 'pending' && (
                      <>
                        <button
                          type="button"
                          disabled={!item.canApprove || actionLoading}
                          title={item.approvalBlockReason || 'Approve tutorial access'}
                          onClick={() => setApproveConfirm({ open: true, item })}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-extrabold bg-status-green text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <CheckCircle size={14} /> Approve
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() =>
                            setRejectModal({
                              open: true,
                              submissionId: item.submissionId,
                              studentName: item.studentName,
                            })
                          }
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-extrabold bg-white text-status-red border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <XCircle size={14} /> Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {!compact && pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="p-2 rounded-lg border border-black/10 disabled:opacity-40 hover:bg-surface-3"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-bold text-muted">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="p-2 rounded-lg border border-black/10 disabled:opacity-40 hover:bg-surface-3"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      <ConfirmModal
        isOpen={approveConfirm.open}
        onClose={() => setApproveConfirm({ open: false, item: null })}
        onConfirm={() => approveConfirm.item && handleApprove(approveConfirm.item)}
        title="Approve Tutorial Mode?"
        message={`Grant ${approveConfirm.item?.studentName || 'this student'} access to Tutorial Mode for guided practice. Their submitted work will remain locked.`}
        confirmText="Approve"
        variant="info"
        isLoading={actionLoading}
      />

      {rejectModal.open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: 'rgba(13,13,20,0.55)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => e.target === e.currentTarget && setRejectModal({ open: false, submissionId: null, studentName: '' })}
        >
          <div className="bg-white rounded-lg shadow-hover w-full max-w-md border border-black/5 overflow-hidden">
            <div className="px-6 py-5 border-b border-black/5">
              <h3 className="text-lg font-extrabold font-heading text-ink">Reject Tutorial Request</h3>
              <p className="text-sm text-muted mt-1">
                {rejectModal.studentName} — optional feedback for the student
              </p>
            </div>
            <div className="p-6">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                placeholder="Reason for declining (optional)..."
                className="w-full px-4 py-3 bg-surface-3 border border-black/8 rounded-lg text-sm font-medium resize-none focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>
            <div className="px-6 py-4 border-t border-black/5 flex gap-3 justify-end bg-surface-3/30">
              <button
                type="button"
                onClick={() => setRejectModal({ open: false, submissionId: null, studentName: '' })}
                className="px-4 py-2 text-xs font-extrabold text-muted uppercase tracking-widest"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleReject}
                className="px-6 py-2 bg-status-red text-white text-xs font-extrabold rounded-lg uppercase tracking-widest disabled:opacity-50"
              >
                {actionLoading ? 'Rejecting...' : 'Reject Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TutorialRequestsPanel;
