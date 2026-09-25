import React from 'react';

const HeroDiagramPreview = () => (
  <div className="hero-diagram-preview" aria-hidden="true">
    <div className="preview-window">
      <div className="preview-topbar">
        <span className="preview-dot r" />
        <span className="preview-dot y" />
        <span className="preview-dot g" />
        <span className="preview-title">Use Case Diagram  Library System</span>
      </div>
      <div className="preview-body">
        <svg className="preview-svg" viewBox="0 0 600 180" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Use Case Diagram preview showing Student and Librarian actors interacting with Library System use cases">
          {/* Actor 1 - Student */}
          <g transform="translate(40,60)">
            <circle cx="0" cy="0" r="14" fill="none" stroke="#5046E5" strokeWidth="2" />
            <line x1="0" y1="14" x2="0" y2="50" stroke="#5046E5" strokeWidth="2" />
            <line x1="-18" y1="28" x2="18" y2="28" stroke="#5046E5" strokeWidth="2" />
            <line x1="0" y1="50" x2="-14" y2="72" stroke="#5046E5" strokeWidth="2" />
            <line x1="0" y1="50" x2="14" y2="72" stroke="#5046E5" strokeWidth="2" />
            <text y="88" textAnchor="middle" fontSize="11" fill="#5A5A72" fontFamily="DM Sans,sans-serif">Student</text>
          </g>
          {/* System boundary */}
          <rect x="100" y="10" width="380" height="160" rx="10" fill="none" stroke="#9898AD" strokeWidth="1.5" strokeDasharray="6,4" />
          <text x="290" y="28" textAnchor="middle" fontSize="11" fill="#9898AD" fontFamily="DM Sans,sans-serif" fontWeight="500">Library System</text>
          {/* Use Cases */}
          <ellipse cx="210" cy="80" rx="62" ry="24" fill="#EFEFF9" stroke="#5046E5" strokeWidth="1.5" />
          <text x="210" y="85" textAnchor="middle" fontSize="11" fill="#5046E5" fontFamily="DM Sans,sans-serif" fontWeight="500">Borrow Book</text>
          <ellipse cx="210" cy="140" rx="62" ry="24" fill="#EFEFF9" stroke="#5046E5" strokeWidth="1.5" />
          <text x="210" y="145" textAnchor="middle" fontSize="11" fill="#5046E5" fontFamily="DM Sans,sans-serif" fontWeight="500">Search Catalog</text>
          <ellipse cx="370" cy="80" rx="62" ry="24" fill="#F7F7FC" stroke="#9898AD" strokeWidth="1.5" />
          <text x="370" y="85" textAnchor="middle" fontSize="11" fill="#5A5A72" fontFamily="DM Sans,sans-serif" fontWeight="500">Return Book</text>
          <ellipse cx="370" cy="140" rx="62" ry="24" fill="#F7F7FC" stroke="#9898AD" strokeWidth="1.5" />
          <text x="370" y="145" textAnchor="middle" fontSize="11" fill="#5A5A72" fontFamily="DM Sans,sans-serif" fontWeight="500">Reserve Book</text>
          {/* Connections */}
          <line x1="58" y1="80" x2="148" y2="80" stroke="#5046E5" strokeWidth="1.5" />
          <line x1="58" y1="100" x2="148" y2="130" stroke="#5046E5" strokeWidth="1.5" />
          {/* Actor 2 - Librarian */}
          <g transform="translate(560,60)">
            <circle cx="0" cy="0" r="14" fill="none" stroke="#9898AD" strokeWidth="2" />
            <line x1="0" y1="14" x2="0" y2="50" stroke="#9898AD" strokeWidth="2" />
            <line x1="-18" y1="28" x2="18" y2="28" stroke="#9898AD" strokeWidth="2" />
            <line x1="0" y1="50" x2="-14" y2="72" stroke="#9898AD" strokeWidth="2" />
            <line x1="0" y1="50" x2="14" y2="72" stroke="#9898AD" strokeWidth="2" />
            <text y="88" textAnchor="middle" fontSize="11" fill="#5A5A72" fontFamily="DM Sans,sans-serif">Librarian</text>
          </g>
          <line x1="542" y1="80" x2="432" y2="80" stroke="#9898AD" strokeWidth="1.5" />
          <line x1="542" y1="95" x2="432" y2="130" stroke="#9898AD" strokeWidth="1.5" />
        </svg>
      </div>
    </div>
  </div>
);

export default HeroDiagramPreview;